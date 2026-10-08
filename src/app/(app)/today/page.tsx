import Link from 'next/link'
import { displayCity, displayEmployer } from '@/lib/display-names'
import { coverageByFunction } from '@/lib/services/index-match'
import { redirect } from 'next/navigation'
import { ChevronRight, Eye, Laptop, ShieldCheck, Wallet, X } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { RoleCard } from '@/components/features/role-card'
import { repostChip } from '@/lib/repost'
import { jobTypeFromStated, payFromRow } from '@/lib/role-facts'
import { interestChip } from '@/lib/interest'
import { stageChip } from '@/lib/company-stage'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { BreakdownEngaged } from '@/components/features/breakdown-engaged'
import { functionGap } from '@/match/function-gap'
import { resolveCity } from '@/lib/taxonomy/locations'
import { countMatchingRoles, countWorkModeMatches, readApplyUrls, readCards, readExperienceFloors, readInterest, readReposts, readRoleFacts, readShortlist, readStatedPays } from '@/lib/services/shortlist'
import { FeedProvider, SelectableCard } from '@/components/features/feed-selection'
import { JobPanel, JobSheet } from '@/components/features/job-panel'
import { isEasyApply } from '@/lib/job-facts'
import { readTrackedStatuses } from '@/lib/services/workspace'
import { applyQuickPills, arrangeShortlist, holdingLine, NEW_WITHIN_DAYS, SHOW_MORE_STEP } from '@/lib/shortlist'
import { candidateSearch, MAX_ROLES_PER_CANDIDATE } from '@/lib/score-candidate'
import { exploreHref } from '@/lib/explore'
import { readFeedPrefs, readRoleText } from '@/lib/services/feed-prefs'
import { connectionsByCompany } from '@/lib/services/network'
import { normaliseCompany } from '@/lib/company-name'
import { activeFilters, applyDrawerFilters, applyTextFilter, drawerParams, onlyFilter, promptChips, relaxations, soloCounts, viewFromParams, viewToQuery, withoutFilter, SKIP_AGENCIES, type FeedView, type FilterKey, type JobType, type Mode } from '@/lib/feed-query'
import { FeedSearch, HideRole, SearchAnswer } from '@/components/features/feed-controls'
import { currentAnswer } from '@/lib/search-history'
import { readSearchHistory } from '@/lib/services/search-history'
import { AllFiltersDrawer } from '@/components/features/feed-filter-drawer'
import { PillMenu } from '@/components/features/pill-menu'
import { SavedSearchesMenu } from '@/components/features/saved-searches-menu'
import { readSavedSearches } from '@/lib/services/saved-searches'

/** The work-mode preference, in the words the chip row uses. */
const WORK_MODE_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

/**
 * The True-Fit line: where high-probability applications stop and long shots
 * begin.
 *
 * ⚠️ IT IS A MARK ON THE LIST, NOT A FILTER, AND THAT DISTINCTION IS THE WHOLE
 * DECISION. Stage A (2026-09-04) reversed gating and `docs/PROJECT-STATE.md`
 * locks "never gate users out" — so nothing below this line is hidden, removed,
 * or collapsed. Every role stays exactly where its score puts it and keeps its
 * full working. The line only tells the candidate where to spend their next
 * forty minutes.
 *
 * ⚠️ DO NOT TURN THIS INTO `WHERE score >= 50`. That was proposed, considered,
 * and rejected: it would empty the feed for exactly the candidates the index
 * serves worst. An HR candidate matches 15 roles in total and 5 at or above 50
 * — a filter leaves them a screen that looks broken, while a line leaves them
 * a screen that is honest about a thin market.
 */
const TRUE_FIT = 50

/**
 * The ranked shortlist.
 *
 * Previously three sections — cleared, stretch, withheld — because the product
 * gated. It ranks now: every role scoped to the candidate's preferred role is
 * scored, ordered, and shown with the working behind its number. Nothing is
 * withheld, so there is no refusal to publish and no withheld section.
 */
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{
    show?: string; n?: string; tab?: string; sort?: string; fit?: string
    min80?: string; fresh?: string; remote?: string; easy?: string
    /** A role to open on arrival — the public job page's "See my match score". */
    role?: string
    /** Phase 15: words to find in title/company, a city, and the hidden-jobs view. */
    q?: string; city?: string; hidden?: string
    /** TASK-155: the drawer's filters. */
    posted?: string; level?: string; type?: string; mode?: string; pay?: string; skip?: string
    /** TASK-219: role type (IC / manager) and the employers to show only. */
    rt?: string; only?: string
  }>
}) {
  const params = await searchParams
  const { show, n, tab, sort, fit } = params
  const byNewest = sort === 'new'
  const byPay = sort === 'pay'
  const byCompany = sort === 'company'
  const clearsOnly = fit === 'clears'
  // Everything we hold for this candidate is the default view. "New" is the
  // narrower question — what has appeared since they last looked — and it is a
  // tab rather than the whole page, which is what it used to be by framing: the
  // list was never date-filtered, but a page called Today with a date across
  // the top reads as though it were.
  const onlyNew = tab === 'new'
  const roleParam = params.role && /^[0-9a-f-]{36}$/i.test(params.role) ? params.role : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // The profile and the shortlist are independent reads, so they run together:
  // four round trips in sequence used to precede every render (QA-02).
  const [{ data: profile }, shortlist, feedPrefs, savedSearches, searchHistory] = await Promise.all([
    supabase
      .from('profiles')
      .select('preferred_role, preferred_roles, open_to_adjacent, confirmed_at, city, work_mode_preference, years_experience')
      .eq('id', user.id)
      .single(),
    readShortlist(user.id),
    readFeedPrefs(user.id),
    readSavedSearches(user.id),
    readSearchHistory(user.id),
  ])

  // Scores never run against an unconfirmed profile, so there would be nothing
  // to show — send them back rather than rendering an empty list they would
  // reasonably read as a verdict.
  if (!profile?.confirmed_at) redirect('/start/confirm')

  const { failed: error, indexed } = shortlist
  /**
   * HIDDEN JOBS (Phase 15). A hidden role leaves this candidate's feed and
   * never its score; `?hidden=1` shows only the hidden ones, to bring back.
   * Everything below counts from this list, so "N matches" means N you can see.
   */
  const showHidden = params.hidden === '1'
  const hiddenCount = shortlist.rows.filter((r) => feedPrefs.hidden.has(r.role_id)).length
  const allRows = shortlist.rows.filter((r) => feedPrefs.hidden.has(r.role_id) === showHidden)
  const view = viewFromParams(params)

  /**
   * THE QUICK FILTER PILLS (2026-09-23 parity pass). Each narrows the list the
   * candidate is reading; none changes a score, and the count they hide is
   * stated beside them — a filter is never allowed to look like the market's
   * answer. Posted-date and apply-URL reads happen only when a pill needs them.
   *
   * No "Salary > X" pill: 2.2% of postings state pay and nothing extracts it
   * (PROJECT-STATE Stage T), so it would hide ~98% of roles for a reason the
   * candidate could not see.
   */
  const pills = {
    min80: params.min80 === '1',
    fresh: params.fresh === '1',
    remote: params.remote === '1',
    easy: params.easy === '1',
  }
  // The posting dates arrive with the list (readShortlist embeds them): the best-match order breaks ties by freshness
  // and "New" needs them (src/lib/shortlist.ts), so they are needed on every render.
  const postedAll = shortlist.postedAt
  const applyAll = pills.easy ? await readApplyUrls(allRows.map((r) => r.role_id)) : undefined
  // Title/company/city are read only when a text filter is on (Phase 15). Job
  // type and "leave out" need the same title and employer.
  const roleText = view.q || view.city || view.type || view.skip || view.roleType || view.only || byCompany ? await readRoleText(allRows.map((r) => r.role_id)) : new Map()
  // The drawer (TASK-155). Floors and pay are read for every scored role, and only
  // when their filter is on — pay reads descriptions, which the list read
  // deliberately does not. Every role, not just the survivors of the other
  // filters, so the "why so few results" counts below are exact when one of the
  // other filters is taken off.
  const [floorsAll, paysAll, factsAll] = await Promise.all([
    view.level ? readExperienceFloors(allRows.map((r) => r.role_id)) : Promise.resolve(undefined),
    view.pay || byPay ? readStatedPays(allRows.map((r) => r.role_id)) : Promise.resolve(undefined),
    // What the employer's own system states (0041): work mode and contract type. Only when a filter needs it.
    view.mode || view.type ? readRoleFacts(allRows.map((r) => r.role_id)) : Promise.resolve(undefined),
  ])
  const modesAll = new Map<string, Mode>()
  const typesAll = new Map<string, JobType>()
  for (const [id, f] of factsAll?.facts ?? []) {
    if (f.work_mode) modesAll.set(id, f.work_mode)
    const t = jobTypeFromStated(f.employment_type)
    if (t) typesAll.set(id, t)
  }
  /**
   * The whole filter pipeline as a function of a view, over data already read.
   * The page runs it once for what is on screen and once more per active filter
   * to say what taking that filter off would show — the same code, so the figure
   * quoted is the figure the candidate gets.
   */
  const runFilters = (v: FeedView) =>
    applyDrawerFilters(
      applyTextFilter(
        applyQuickPills(allRows, { min80: v.min80, fresh: v.fresh, remote: v.remote, easy: v.easy }, {
          postedAt: postedAll,
          isEasy: (roleId) => isEasyApply(applyAll?.get(roleId)),
        }),
        v,
        roleText,
      ),
      v,
      { text: roleText, postedAt: postedAll, floors: floorsAll, pays: paysAll, modes: modesAll, types: typesAll },
    )
  const { rows, notes: drawerNotes } = runFilters(view)
  // F-204 "why so few results": with filters on and few roles left, offer each filter's removal with its exact count.
  const fewRows = activeFilters(view).length > 0 && rows.length <= 5
  const relaxed = fewRows ? relaxations(view, (x) => runFilters(x).rows.length) : []
  // No single filter to blame (taking any one off still leaves the list short): say what each leaves alone.
  const solo = fewRows && relaxed.length === 0 && activeFilters(view).length > 1
    ? soloCounts(view, (x) => runFilters(x).rows.length)
    : []
  const drawerPairs = drawerParams(view)
  // The sentence box only searches the roles already scored for this candidate; this carries the same filters to the whole index (TASK-217).
  const exploreTo = exploreHref(viewToQuery(view))
  const pillCount = Object.values(pills).filter(Boolean).length + (view.q ? 1 : 0) + (view.city ? 1 : 0) + drawerPairs.length
  // The text filter, the drawer and the hidden view ride along on every link, like the pills.
  const textParams: [string, string][] = [
    ...(view.q ? [['q', view.q] as [string, string]] : []),
    ...(view.city ? [['city', view.city] as [string, string]] : []),
    ...drawerPairs,
    ...(showHidden ? [['hidden', '1'] as [string, string]] : []),
  ]
  // What an active drawer filter could not decide, said in words beside the controls.
  const drawerNoteLines = [
    view.posted && drawerNotes.undated > 0 ? `${drawerNotes.undated} role${drawerNotes.undated === 1 ? ' has' : 's have'} no posting date and ${drawerNotes.undated === 1 ? 'is' : 'are'} left out.` : '',
    view.level && drawerNotes.unstatedLevel > 0 ? `${drawerNotes.unstatedLevel} role${drawerNotes.unstatedLevel === 1 ? ' states' : 's state'} no experience requirement and ${drawerNotes.unstatedLevel === 1 ? 'is' : 'are'} kept.` : '',
    view.mode && factsAll && !factsAll.stored ? 'Work mode needs a database update (0041) that has not been applied yet, so no role can pass this filter.' : '',
    view.mode && factsAll?.stored && drawerNotes.unstatedMode > 0 ? `${drawerNotes.unstatedMode} role${drawerNotes.unstatedMode === 1 ? ' does' : 's do'} not say where the work happens (remote, hybrid or on-site) and ${drawerNotes.unstatedMode === 1 ? 'is' : 'are'} left out.` : '',
    view.pay && drawerNotes.unstatedPay > 0 ? `${drawerNotes.unstatedPay} role${drawerNotes.unstatedPay === 1 ? ' states' : 's state'} no pay in rupees and ${drawerNotes.unstatedPay === 1 ? 'is' : 'are'} left out.` : '',
  ].filter(Boolean)
  /** The words for any one filter, pill or drawer, for the "take one off" links. */
  const filterLabel = (k: FilterKey): string =>
    k === 'min80' ? 'Match > 80%'
      : k === 'fresh' ? 'Posted < 24 hours'
        : k === 'remote' ? 'Remote only'
          : k === 'easy' ? 'Easy Apply'
            : k === 'q' ? `“${view.q}”`
              : chipLabel(k, String(view[k]))
  /** The words on a filter chip. Every drawer filter says what it is, so the chip can be removed knowingly. */
  const chipLabel = (k: string, v: string): string => {
    if (k === 'city') return `In ${v.split(',').join(' or ')}`
    if (k === 'posted') return v === '1' ? 'Posted in the past 24 hours' : `Posted in the past ${v === '30' ? 'month' : v === '7' ? 'week' : `${v} days`}`
    if (k === 'level') return `${({ entry: 'Entry', mid: 'Mid', senior: 'Senior' } as Record<string, string>)[v] ?? v} level`
    if (k === 'type') return v.split(',').map((x) => ({ fulltime: 'Full-time', intern: 'Internship', contract: 'Contract', parttime: 'Part-time' } as Record<string, string>)[x] ?? x).join(' or ')
    if (k === 'mode') return v.split(',').map((x) => ({ remote: 'Remote (stated)', hybrid: 'Hybrid', onsite: 'On-site' } as Record<string, string>)[x] ?? x).join(' or ')
    if (k === 'roleType') return v === 'manager' ? 'People manager (by title)' : 'Individual contributor (by title)'
    if (k === 'only') return `Only ${v.split(',').join(', ')}`
    if (k === 'pay') return `Pay ≥ ₹${v} L`
    if (k === 'skip') return `Not ${v.split(',').map((x) => (x.trim().toLowerCase() === SKIP_AGENCIES ? 'staffing agencies' : x)).join(', ')}`
    return `“${v}”`
  }

  // Newest sorts by the board's posting date, which only this view needs.
  const postedAt = postedAll

  /**
   * New, sections, order, the Within-reach filter and how many cards render —
   * all in src/lib/shortlist.ts, where they are tested. The reasoning for each
   * stays below, beside the copy it produces.
   */
  const { isNew, newCount, visibleCount, strong, farCount, sections: arranged } = arrangeShortlist(
    rows,
    shortlist.firstShownAt,
    {
      onlyNew, byNewest, clearsOnly, show, shown: n ? Number(n) : undefined, postedAt,
      byPay, payOf: byPay ? paysAll : undefined,
      byCompany, companyOf: byCompany ? new Map([...roleText].map(([id, t]) => [id, t.company])) : undefined,
    },
  )

  // A work-mode preference is a filter wearing a score component's clothes. Set
  // to "remote" against this index it fails almost everywhere, which put the
  // identical line — "You asked for remote." — on all 246 cards as the reason
  // for every score. The line is true and stays; what was missing is the fact
  // that makes it actionable, which belongs here once rather than there 246
  // times. Counted from the stored breakdowns, so it is the real number.
  const wantsMode = profile.work_mode_preference && profile.work_mode_preference !== 'no_preference'

  // At the cap, ask how many roles the same search matches — built exactly as
  // src/lib/evaluate-user.ts builds it for the scorer, so both describe one set.
  const capSearch = allRows.length >= MAX_ROLES_PER_CANDIDATE
    ? candidateSearch(
        { preferredRole: profile.preferred_role ?? undefined, preferredRoles: profile.preferred_roles ?? undefined },
        profile.open_to_adjacent === true,
      )
    : null

  /**
   * The cards on screen are read whole here, and only they are — see
   * src/lib/services/shortlist.ts. Coverage only on the thin path: a
   * well-served shortlist never pays for those counts, and the message they
   * feed only renders below 10 strong matches. The match count only at the
   * cap. All independent, so they run together.
   */
  const [{ cards }, coverage, modeMatches, matched, tracked, reposts, interest, providerFacts] = await Promise.all([
    readCards(user.id, arranged.flatMap((s) => s.visible), { requirements: false }),
    strong < 10 ? coverageByFunction() : Promise.resolve([]),
    wantsMode ? countWorkModeMatches(user.id) : Promise.resolve(0),
    capSearch ? countMatchingRoles(capSearch.searches, capSearch.adjacent) : Promise.resolve(null),
    readTrackedStatuses(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readReposts(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readInterest(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readRoleFacts(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
  ])
  // Who the candidate knows at each visible company (their own LinkedIn export, 0031).
  const knownAt = await connectionsByCompany(user.id, [...cards.values()].map((c) => normaliseCompany(displayEmployer(c.roles?.company_name))))
  const holding = holdingLine(allRows.length, MAX_ROLES_PER_CANDIDATE, matched)
  // At the cap the list is the top of a larger set, and the tab must not call
  // it "All" two lines above a sentence saying it is not (QA-05's lesson).
  const allLabel = holding.kind === 'complete' ? 'All matches' : 'Top matches'

  const gap = functionGap(profile.preferred_role)

  // Buckets are derived from the stored breakdown, not from a column, so they
  // can never fall out of step with the scorer. See src/match/score.ts.

  /**
   * Two sections, split on location and nothing else.
   *
   * WHY THIS REPLACED SIX BUCKETS. The buckets were named after what was wrong
   * with a role — "Experience is out of range", "Location is out of range",
   * "Good match, short on experience". Every heading on the page was a
   * negative, so a candidate scrolling their own shortlist read a running
   * commentary on their shortcomings. That is the opposite of the intent: the
   * buckets existed to state uncertainty honestly, and honesty about a role
   * turned into a verdict on the person.
   *
   * ⚠️ NOTHING IS HIDDEN AND NOTHING IS SOFTENED. Every reservation the buckets
   * carried is still on the card — in the reason line, in the capped score, and
   * in the breakdown that shows the arithmetic. What changed is that it is
   * stated per role instead of used as a section heading. The locked decision
   * in docs/PROJECT-STATE.md is "rank everything, withhold nothing"; ranking is
   * exactly what this does, and the caps in src/match/score.ts are what stop a
   * ranked list from overclaiming.
   *
   * Location is the split because it is the one hard constraint a candidate
   * cannot negotiate — you can stretch two years of experience, you cannot
   * commute to another state. Remote and the commute cluster count as near:
   * both are reachable from where the candidate said they are.
   */
  const cityLabel = resolveCity(profile.city)?.name ?? profile.city?.trim()

  /* Best match first, or newest first — the candidate's choice, both sections.
     Within equal scores the exact city still beats the commute cluster. */

  /**
   * "Within reach" — the experience standing the scorer already computed.
   *
   * This was "Clears the stated bar", meaning `meets` or `unstated` only, and
   * it was too sharp to be useful: measured on a live two-year profile it left
   * 2 roles of 209. A filter that removes 99% of the list is not a filter, it
   * is a second empty state.
   *
   * `short` is the scorer's own word for "under the bar by no more than
   * STRETCH_YEARS", so including it is not a loosening of the standard — it is
   * the standard the buckets already used to separate "worth applying for" from
   * "out of range". `over` is included for the same reason in the other
   * direction: more experience than asked is a reason to apply, not a bar.
   *
   * A filter, never a gate. The count it hides is stated next to the control.
   */
  const COPY = {
    near: {
      // The canonical name, not the raw profile string — a heading reading
      // "In Bangalore, India" is the stored value leaking onto the page.
      title: cityLabel ? `In ${cityLabel}` : 'Where you work',
      blurb: 'In the city you gave us, its commute belt, or fully remote.',
    },
    far: {
      title: 'Worth a move',
      blurb:
        'Strong matches on the work itself, in other Indian cities. Ranked the same way — the only thing separating these from the list above is where they are.',
    },
  } as const
  const sections = arranged.map((s) => ({ ...s, ...COPY[s.key] }))
  // From the signed-in address, matching /applications — a job title makes for
  // confusing initials ("PM" is not who you are).
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  // The pills ride along on every other link, so sorting or expanding a
  // filtered list does not silently drop the filter.
  const pillParams = (Object.keys(pills) as (keyof typeof pills)[]).filter((k) => pills[k])
  const pillQuery = pillParams.map((k) => `&${k}=1`).join('') + textParams.map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('')

  const firstVisible = arranged.flatMap((sec) => sec.visible)[0]?.role_id ?? null
  /* The panel's idle state carries only figures that are real. The saaf-ai
     export also has a profile-strength meter, a weekly application limit and a
     B2B discoverability toggle: the first two are invented numbers, and
     employer access is parked, so none of the three ship. */
  const rail = (
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Your market today</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Select any job to see its match analysis, skill gaps and the AI tools for it.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <dl className="space-y-3">
              {[
                [(indexed ?? 0).toLocaleString('en-IN'), 'indexed'],
                // At the cap "matched" is the index's count and "scored" is the
                // list — two numbers, each named for what it is.
                [
                  holding.kind === 'capped'
                    ? holding.matched.toLocaleString('en-IN')
                    : holding.kind === 'capped-unknown'
                      ? `${allRows.length.toLocaleString('en-IN')}+`
                      : allRows.length.toLocaleString('en-IN'),
                  'matched',
                ],
                ...(holding.kind === 'complete' ? [] : [[allRows.length.toLocaleString('en-IN'), 'scored']]),
                // The card band's name for the same line — "strong" is 60–74 on a card (QA-10).
                [strong.toLocaleString('en-IN'), 'high-precision'],
              ].map(([value, label]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums tracking-[-0.03em] text-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {/* The honest empty state, and only when it applies. It used to sit
                here on every visit, including days with 165 matches, where it
                answered a worry nobody had. */}
            {/*
              ⚠️ "OUR COVERAGE, NOT A VERDICT ON YOU" WAS RIGHT AND UNUSABLE.
              The sentiment is the locked decision — thinness is attributed to
              us, never to the candidate — but a person reading it can do
              nothing with it. Measured on 2026-09-14 this index is 39%
              engineering and 1.6% HR, so an HR candidate seeing three roles is
              not having a thin DAY; they are in a function we do not cover yet.
              Naming which functions we DO cover, with the counts, turns an
              apology into information — and the checker below is genuinely
              useful to them today, with no account and no shortlist.
            */}
            {strong < 10 ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] leading-5 text-muted-foreground">
                  A thin list is our coverage, not a verdict on you. We index company hiring boards,
                  which means we are strongest here:
                </p>
                <ul className="mt-2.5 space-y-1">
                  {coverage.map((c) => (
                    <li key={c.fn} className="flex items-baseline justify-between gap-3 text-[11px]">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="font-mono tabular-nums text-primary">
                        {c.roles.toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/tools/ats-checker"
                  className="mt-3 inline-block text-[11px] font-semibold text-primary underline underline-offset-4"
                >
                  Meanwhile, check what a parser reads out of your résumé →
                </Link>
              </div>
            ) : null}
          </div>

          {/* Three standing promises, one line each. They were three paragraphs.
              Nothing is withdrawn — the clauses that went were restatements:
              "every score opens to show its working" is what the working button
              on every card already does, and what a salary-less index means for
              ranking follows from the sentence that remains. */}
          <div className="space-y-3 rounded-2xl border border-border bg-secondary/60 p-4 text-[11px] leading-5 text-muted-foreground">
            <p className="flex items-center gap-2.5">
              <ShieldCheck className="size-4 shrink-0" />
              <span className="font-semibold text-primary">We apply only when you switch it on.</span>
            </p>
            {/* WAS: "No employer here publishes a salary." Measured against the
                live index on 2026-09-07 and it was false — 12 of 799 postings
                state a figure ("15 LPA" at Apna, "₹50,000" at CRED), and the
                registry was about to grow forty-fold. It also asserted
                something we never check: nothing extracts salary, so we have no
                standing to say what employers publish.

                The replacement is about our own behaviour, which is the part we
                can actually keep. See docs/CONFLICTS.md B3. */}
            <p className="flex items-center gap-2.5">
              <Wallet className="size-4 shrink-0" />
              We don&apos;t read salaries, so pay never moves a score.
            </p>
            {/* The score presents as complete, so a requirement we don't read has
                to be named or it reads as one we checked and found nothing on.
                Attributed to our coverage, never to the candidate. */}
            {/* Only when it is actually biting. A preference that most roles
                meet needs no announcement. */}
            {wantsMode && allRows.length > 0 && modeMatches <= allRows.length / 4 ? (
              <p className="flex items-start gap-2.5">
                <Laptop className="mt-0.5 size-4 shrink-0" />
                <span>
                  You asked for <strong className="font-semibold text-primary">{profile.work_mode_preference}</strong>.{' '}
                  <strong className="font-mono tabular-nums text-primary">{modeMatches}</strong> of{' '}
                  <strong className="font-mono tabular-nums text-primary">{allRows.length}</strong>{' '}
                  match that — the rest lose those points on every card.
                </span>
              </p>
            ) : null}
            {gap ? (
              <p className="flex items-center gap-2.5">
                <Eye className="size-4 shrink-0" />
                <span>
                  We don&apos;t read {gap.decidedBy} yet.
                </span>
              </p>
            ) : null}
          </div>
        </div>
  )

  /**
   * The feed's controls, as URLs (redesign 2026-10-08). Every pill and every menu
   * option is a link to the /today address it produces, built from the view — so a
   * chosen filter is still shareable and the page stays the one place that filters.
   */
  const keepParams: [string, string][] = [
    ...(onlyNew ? [['tab', 'new'] as [string, string]] : []),
    ...(showHidden ? [['hidden', '1'] as [string, string]] : []),
  ]
  const hrefFor = (next: FeedView, reach: boolean = clearsOnly) => {
    const q = new URLSearchParams(viewToQuery(next))
    for (const [k, v] of keepParams) q.set(k, v)
    if (reach) q.set('fit', 'clears')
    return `/today${q.size ? `?${q}` : ''}`
  }
  const POSTED_NAME: Record<string, string> = { '3': 'past 3 days', '7': 'past week', '30': 'past month' }
  const LEVEL_NAME: Record<string, string> = { entry: 'Entry', mid: 'Mid', senior: 'Senior' }
  const TYPE_NAME: Record<string, string> = { fulltime: 'Full-time', intern: 'Internship', contract: 'Contract', parttime: 'Part-time' }
  const baselineText = [
    profile.preferred_role,
    cityLabel,
    profile.years_experience !== null && profile.years_experience !== undefined ? `${profile.years_experience} yrs` : null,
    wantsMode ? WORK_MODE_LABEL[profile.work_mode_preference as string] : null,
  ].filter(Boolean).join(' · ')
  const shownCount = pillCount > 0 && !onlyNew ? rows.length : holding.kind === 'complete' || onlyNew ? visibleCount : holding.scored
  const ofLine =
    pillCount > 0 && !onlyNew ? `of your ${allRows.length.toLocaleString('en-IN')} scored`
      : holding.kind === 'capped' ? `closest title matches, of ${holding.matched.toLocaleString('en-IN')} that fit`
        : holding.kind === 'capped-unknown' ? 'closest title matches'
          : ''
  /** Filters with no pill of their own stay visible as removable chips: the words, the city, pay, employers. */
  const chipKeys = ['q', 'city', 'pay', 'skip']

  return (
    <FeedProvider initial={roleParam ?? firstVisible} openInitially={Boolean(roleParam)}>
    <AppShell
      title="Job Search Feed"
      eyebrow="AI job matches"
      initials={initials}
      context={<JobPanel idle={rail} />}
      contextOnMobile="hide"
    >
      <ShortlistViewed cleared={strong} withheld={0} />
      <JobSheet />

      <div className="mx-auto max-w-[1100px] px-5 pb-8 pt-4 sm:px-8">
        <section className="min-w-0">
          {/* ONE TOP ROW: the tabs and the search box (teardown spec §0 — title, tabs and
              search in a single bar). The headline, the date, the baseline chips, the
              example chips, the saved filters and the open filter card that used to
              stack above the list are gone from here; each lives where it is used. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border pb-3">
            <nav aria-label="Feed tabs" className="flex items-center gap-5 text-sm">
              {[
                { key: 'all', label: 'Recommended', count: rows.length, href: '/today' },
                { key: 'new', label: 'New', count: newCount, href: '/today?tab=new', title: `First shown to you in the last ${NEW_WITHIN_DAYS} days` },
              ].map((t) => {
                const active = (t.key === 'new') === onlyNew
                return (
                  <Link
                    key={t.key}
                    href={t.href}
                    title={t.title}
                    aria-current={active ? 'page' : undefined}
                    className={`relative inline-flex items-center gap-1.5 py-1 font-semibold transition-colors ${
                      active ? 'text-primary after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:bg-accent' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {t.label}
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{t.count}</span>
                  </Link>
                )
              })}
            </nav>
            <FeedSearch
              initial=""
              current={view}
              history={searchHistory.entries}
              chips={promptChips({
                role: profile.preferred_role,
                city: resolveCity(profile.city)?.name ?? profile.city,
                years: profile.years_experience,
              })}
            />
          </div>

          {/* A backend failure must never render as a verdict. If the read failed we
              say so plainly rather than showing an empty list. */}
          {error ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              We couldn&apos;t load today&apos;s list. That&apos;s our problem, not a result — try again shortly.
            </p>
          ) : null}

          {onlyNew && visibleCount === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              Nothing new in the last {NEW_WITHIN_DAYS} days. Your {rows.length} matches are all
              still there under <Link href="/today" className="font-semibold text-primary underline underline-offset-4">{allLabel}</Link> —
              a quiet few days is our coverage, not a verdict on you.
            </p>
          ) : null}

          {/* ONE ROW OF PILLS. Dropdown pills for the filters with a handful of values, toggles
              for the yes/no ones, and one "All filters" button for the rest. */}
          <div data-tour="filters" className="mb-3 flex flex-wrap items-center gap-2" aria-label="Filters">
            <PillMenu
              label={view.fresh ? 'Posted: 24 hours' : view.posted ? `Posted: ${POSTED_NAME[view.posted]}` : 'Date posted'}
              active={view.fresh || Boolean(view.posted)}
              options={[
                { label: 'Any time', href: hrefFor({ ...view, posted: '', fresh: false }), selected: !view.fresh && !view.posted },
                { label: 'Past 24 hours', href: hrefFor({ ...view, posted: '', fresh: true }), selected: view.fresh },
                { label: 'Past 3 days', href: hrefFor({ ...view, posted: '3', fresh: false }), selected: view.posted === '3' },
                { label: 'Past week', href: hrefFor({ ...view, posted: '7', fresh: false }), selected: view.posted === '7' },
                { label: 'Past month', href: hrefFor({ ...view, posted: '30', fresh: false }), selected: view.posted === '30' },
              ]}
            />
            <PillMenu
              label={view.level ? `Experience: ${LEVEL_NAME[view.level]}` : 'Experience'}
              active={Boolean(view.level)}
              quietOnPhone
              options={[
                { label: 'Any', href: hrefFor({ ...view, level: '' }), selected: !view.level },
                { label: 'Entry — asks up to 2 years', href: hrefFor({ ...view, level: 'entry' }), selected: view.level === 'entry' },
                { label: 'Mid — asks 3 to 5 years', href: hrefFor({ ...view, level: 'mid' }), selected: view.level === 'mid' },
                { label: 'Senior — asks 6 or more', href: hrefFor({ ...view, level: 'senior' }), selected: view.level === 'senior' },
              ]}
            />
            <PillMenu
              label={view.type ? view.type.split(',').map((t) => TYPE_NAME[t] ?? t).join(' or ') : 'Job type'}
              active={Boolean(view.type)}
              quietOnPhone
              options={[
                { label: 'Any', href: hrefFor({ ...view, type: '' }), selected: !view.type },
                // Single choices here; the drawer's tick-boxes allow several.
                ...(['fulltime', 'intern', 'contract', 'parttime'] as const).map((t) => ({ label: TYPE_NAME[t], href: hrefFor({ ...view, type: t }), selected: view.type === t })),
              ]}
            />
            {([
              { key: 'min80', label: 'Match 80+', title: 'Only roles scoring above 80 for you' },
              { key: 'remote', label: 'Remote', title: 'Roles the posting says are remote' },
              { key: 'easy', label: 'Easy apply', title: 'One-page application form, no account needed. The extension can fill it; you submit.' },
            ] as const).map(({ key, label, title }) => (
              <Link
                key={key}
                href={hrefFor({ ...view, [key]: !view[key] })}
                title={title}
                aria-pressed={view[key]}
                className={`items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${key === 'remote' && !view[key] ? 'hidden sm:inline-flex' : 'inline-flex'} ${
                  view[key] ? 'border-accent/60 bg-accent/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href={hrefFor(view, !clearsOnly)}
              title="Roles whose stated experience bar is no more than a stretch above your years"
              aria-pressed={clearsOnly}
              className={`items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${clearsOnly ? 'inline-flex' : 'hidden sm:inline-flex'} ${
                clearsOnly ? 'border-accent/60 bg-accent/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
              }`}
            >
              Within reach
            </Link>
            <AllFiltersDrawer
              key={JSON.stringify([drawerPairs, clearsOnly])}
              view={view}
              keep={keepParams}
              notes={drawerNoteLines}
              saved={feedPrefs.saved.map((f) => ({ name: f.name, query: viewToQuery(f.view) }))}
              stored={feedPrefs.stored}
              activeCount={drawerPairs.length}
              withinReach={clearsOnly}
            />
            {textParams.filter(([k]) => chipKeys.includes(k)).map(([k, v]) => {
              const next = viewFromParams(Object.fromEntries(textParams.filter(([tk]) => tk !== k).concat(pillParams.map((pk) => [pk, '1'] as [string, string]))))
              return (
                <Link
                  key={k}
                  href={hrefFor({ ...next, sort: view.sort })}
                  title="Remove this filter"
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  {chipLabel(k, v)}
                  <X className="size-3" aria-hidden="true" />
                </Link>
              )
            })}
            {pillCount > 0 ? (
              <Link
                href={`/today${onlyNew ? '?tab=new' : ''}`}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                <X className="size-3.5" />
                Clear · {allRows.length - rows.length} filtered out
              </Link>
            ) : null}
            {hiddenCount > 0 || showHidden ? (
              <Link
                href={showHidden ? '/today' : '/today?hidden=1'}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                <Eye className="size-3.5" />
                {showHidden ? 'Back to your feed' : `${hiddenCount} hidden job${hiddenCount === 1 ? '' : 's'}`}
              </Link>
            ) : null}
          </div>

          {showHidden ? (
            <p className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Jobs you hid. They are still scored — only hidden from your feed and daily email. Unhide any to bring it back.
            </p>
          ) : null}

          {relaxed.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              <p>
                {rows.length === 0 ? 'No role' : `Only ${rows.length} ${rows.length === 1 ? 'role' : 'roles'}`} in your{' '}
                {allRows.length} {rows.length === 0 ? 'matches passes' : 'matches pass'} {activeFilters(view).length === 1 ? 'that filter' : 'all of those filters'}.
                That is the filter, not the market. Take one off to see more:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relaxed.map(({ key, count }) => {
                  const q = new URLSearchParams(viewToQuery(withoutFilter(view, key)))
                  if (onlyNew) q.set('tab', 'new')
                  if (showHidden) q.set('hidden', '1')
                  return (
                    <Link
                      key={key}
                      href={`/today${q.size ? `?${q}` : ''}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-accent/60"
                    >
                      Remove {filterLabel(key)} <span className="font-mono tabular-nums text-muted-foreground">→ {count}</span>
                    </Link>
                  )
                })}
              </div>
              <p className="mt-3 text-xs">
                Or <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">search all {indexed.toLocaleString('en-IN')} roles</Link>, not only the ones you saved.
              </p>
            </div>
          ) : solo.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              <p>
                {rows.length === 0 ? 'No role' : `Only ${rows.length} ${rows.length === 1 ? 'role' : 'roles'}`} in your{' '}
                {allRows.length} {rows.length === 0 ? 'matches passes' : 'matches pass'} all of those filters, and taking any
                one of them off does not change that — it is the combination. On its own, each one leaves:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {solo.map(({ key, count }) => {
                  const q = new URLSearchParams(viewToQuery(onlyFilter(view, key)))
                  if (onlyNew) q.set('tab', 'new')
                  if (showHidden) q.set('hidden', '1')
                  return (
                    <Link
                      key={key}
                      href={`/today${q.size ? `?${q}` : ''}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-accent/60"
                    >
                      {filterLabel(key)} <span className="font-mono tabular-nums text-muted-foreground">→ {count}</span>
                    </Link>
                  )
                })}
              </div>
              <p className="mt-3 text-xs">
                Or <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">search all {indexed.toLocaleString('en-IN')} roles</Link>, not only the ones you saved.
              </p>
            </div>
          ) : pillCount > 0 && rows.length === 0 ? (
            <p className="mb-4 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              No role in your {allRows.length} matches passes {pillCount === 1 ? 'that filter' : 'all of those filters'}.
              That is the filter, not the market —{' '}
              <Link href="/today" className="font-semibold text-primary underline underline-offset-4">clear it</Link>{' '}
              to see everything — or{' '}
              <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">search all {indexed.toLocaleString('en-IN')} roles for it</Link>.
            </p>
          ) : null}

          {/* ONE COUNT LINE, with the sort beside it. The cap disclosure below stays: at 500 the
              list is the top of a larger set, and "Showing 500" once read as the whole market
              (QA-06). It is one muted line now, not a paragraph above the controls. */}
          {(() => { const a = currentAnswer(searchHistory.entries, view); return a ? <SearchAnswer key={a.id} entry={a} /> : null })()}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{shownCount.toLocaleString('en-IN')}</span> {shownCount === 1 ? 'job' : 'jobs'}
              {ofLine ? ` ${ofLine}` : ''}
              {view.q || view.city ? (
                <>
                  {' · '}
                  <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">Search all roles</Link>
                </>
              ) : null}
              {baselineText ? (
                <span className="hidden sm:inline">
                  {' · '}for {baselineText}{' · '}
                  <Link href="/profile" className="font-semibold text-primary underline underline-offset-4">Edit</Link>
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
            <SavedSearchesMenu searches={savedSearches.searches} current={savedSearches.current} stored={savedSearches.stored} />
            <PillMenu
              align="right"
              label={`Sort: ${byNewest ? 'Newest' : byPay ? 'Pay stated first' : byCompany ? 'Company A–Z' : 'Best match'}`}
              options={[
                { label: 'Best match', href: hrefFor({ ...view, sort: '' }), selected: !view.sort },
                { label: 'Newest', href: hrefFor({ ...view, sort: 'new' }), selected: byNewest },
                { label: 'Pay stated first', href: hrefFor({ ...view, sort: 'pay' }), selected: byPay },
                { label: 'Company A–Z', href: hrefFor({ ...view, sort: 'company' }), selected: byCompany },
              ]}
            />
            </div>
          </div>
          {holding.kind !== 'complete' && !onlyNew ? (
            <p className="mb-4 text-xs leading-5 text-muted-foreground">
              {holding.kind === 'capped' ? (
                <>
                  The other <span className="font-semibold text-primary">{holding.unscored.toLocaleString('en-IN')}</span> rank lower on title and were not scored.
                </>
              ) : (
                'More roles fit than we scored.'
              )}{' '}
              <Link href="/profile" className="font-semibold text-primary underline underline-offset-4">
                {profile.open_to_adjacent ? 'Turning off adjacent roles' : 'A more specific role'}
              </Link>{' '}
              narrows the list.
            </p>
          ) : null}
          {drawerNoteLines.length > 0 ? (
            <ul className="mb-4 space-y-0.5 text-xs leading-5 text-muted-foreground" aria-label="What your filters could not decide">
              {drawerNoteLines.map((n) => <li key={n}>{n}</li>)}
            </ul>
          ) : null}

          <BreakdownEngaged>
            {sections.map(({ key, title, blurb, rows: inSection, all, visible }) => {
              /**
               * A section with nothing in it still gets its heading — for the
               * near one, at least.
               *
               * Returning null for an empty "In Bengaluru" made the section
               * vanish, so a candidate with matches only in other cities saw a
               * page that never mentioned the city they gave us. That reads as
               * though we lost it, or worse, as a silent verdict. The heading
               * stays and says plainly that the gap is our coverage.
               *
               * "Worth a move" empty is not the same thing and needs no
               * apology: it means everything we found is already local, which
               * is the outcome the candidate wanted.
               */
              if (all === 0) {
                if (key !== 'near' || farCount === 0) return null
                return (
                  <section key={key} className="mb-10" aria-labelledby={`bucket-${key}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                      <h3 id={`bucket-${key}`} className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                        {title}
                      </h3>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">0</span>
                    </div>
                    <p className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
                      No matches{cityLabel ? ` in ${cityLabel}` : ' where you work'} today — that is our
                      coverage of employers there, not a verdict on you. The {farCount}{' '}
                      {farCount === 1 ? 'role' : 'roles'} below {farCount === 1 ? 'is' : 'are'} the
                      same work, elsewhere in India.
                    </p>
                  </section>
                )
              }
              // How many render is decided in src/lib/shortlist.ts — the default,
              // or more after "Show more". Plain links, so this costs no client
              // JavaScript and every expanded view is its own shareable URL.
              const hiddenByFilter = all - inSection.length
              return (
                <section key={key} className="mb-8" aria-labelledby={`bucket-${key}`}>
                  {/* The heading is a label and a count. The sentence that explained each section
                      is its tooltip now — it was a second line of grey text above every list. */}
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3
                      id={`bucket-${key}`}
                      title={blurb}
                      className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {title}
                    </h3>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {inSection.length}
                    </span>
                  </div>
                  {/* A filter that removes rows says how many, always. A count that silently
                      shrinks is indistinguishable from a thin day, and this product does not let
                      the candidate mistake our filter for the market's answer. */}
                  {hiddenByFilter > 0 ? (
                    <p className="mb-3 text-xs leading-5 text-muted-foreground">
                      <Link
                        href={`/today${onlyNew ? '?tab=new' : ''}`}
                        className="font-semibold text-primary underline underline-offset-4"
                      >
                        {hiddenByFilter} more hidden by your filter
                      </Link>
                      .
                    </p>
                  ) : null}

                  {inSection.length === 0 ? (
                    <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                      Nothing here is within reach today. The {all} we found are still
                      listed under{' '}
                      <Link href={`/today${onlyNew ? '?tab=new' : ''}`} className="font-semibold text-primary underline underline-offset-4">
                        Everything
                      </Link>
                      .
                    </p>
                  ) : null}

                  <div className="space-y-4">
                    {visible.map((r, i) => {
                      const card = cards.get(r.id)
                      // Recomputed between the two reads — the nightly sweep
                      // replaces gate_results rows. Skipped rather than drawn
                      // half-empty; the next load has it.
                      if (!card) return null
                      return (
                      <div key={r.id}>
                        {/* The line is drawn between two cards, at the first
                            role that falls below the benchmark — so it marks a
                            boundary in a list the candidate is already reading,
                            rather than adding a section they have to navigate.
                            Rendered only when there is something on BOTH sides:
                            a line under nothing, or above everything, tells a
                            candidate nothing and just looks like a verdict. */}
                        {(r.score ?? 0) < TRUE_FIT &&
                        i > 0 &&
                        (visible[i - 1].score ?? 0) >= TRUE_FIT ? (
                          <div className="mb-4 mt-8 flex items-center gap-3">
                            <span className="h-px flex-1 bg-border" aria-hidden="true" />
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Below {TRUE_FIT}% — still worth reading, longer odds
                            </span>
                            <span className="h-px flex-1 bg-border" aria-hidden="true" />
                          </div>
                        ) : null}
                        <SelectableCard roleId={card.role_id}>
                        <RoleCard
                          roleId={card.role_id}
                          title={card.roles?.title ?? ''}
                          company={displayEmployer(card.roles?.company_name)}
                          city={displayCity(card.roles?.city) || undefined}
                          score={card.score ?? 0}
                          breakdown={card.score_breakdown}
                          reason={card.reason}
                          applyUrl={card.roles?.apply_url}
                          isNew={isNew(r)}
                          postedAt={card.roles?.posted_at ?? undefined}
                          repost={repostChip(card.roles?.posted_at, reposts.get(card.role_id))}
                          interest={interestChip(interest.get(card.role_id))}
                          stage={stageChip(displayEmployer(card.roles?.company_name))}
                          trackedStatus={tracked.get(card.role_id)}
                          hideControl={<HideRole roleId={card.role_id} hidden={showHidden} />}
                          statedPay={(providerFacts.facts.get(card.role_id) ? payFromRow(providerFacts.facts.get(card.role_id)!)?.text : null) ?? card.stated_pay}
                          gist={card.gist}
                          connections={knownAt.get(normaliseCompany(displayEmployer(card.roles?.company_name)))}
                        />
                        </SelectableCard>
                      </div>
                      )
                    })}
                  </div>

                  {/* The count above is the whole section, so this reads as
                      "there is more", never as "there was a cut". It adds a
                      step rather than rendering everything: all 338 of one
                      section was 6.3 MB for a phone to parse (QA-02). */}
                  {visible.length < inSection.length ? (
                    <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs">
                      <Link
                        href={`/today?show=${key}&n=${visible.length + SHOW_MORE_STEP}${onlyNew ? '&tab=new' : ''}${view.sort ? `&sort=${view.sort}` : ''}${clearsOnly ? '&fit=clears' : ''}${pillQuery}#bucket-${key}`}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:text-accent"
                      >
                        Show {Math.min(SHOW_MORE_STEP, inSection.length - visible.length)} more
                        <ChevronRight className="size-3.5" />
                      </Link>
                      <span className="text-muted-foreground">
                        <span className="font-mono tabular-nums">{visible.length}</span> of{' '}
                        <span className="font-mono tabular-nums">{inSection.length}</span> shown
                      </span>
                    </p>
                  ) : null}
                </section>
              )
            })}
          </BreakdownEngaged>
        </section>
      </div>
    </AppShell>
    </FeedProvider>
  )
}
