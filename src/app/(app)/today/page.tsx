import Link from 'next/link'
import { displayCity, displayEmployer } from '@/lib/display-names'
import { coverageByFunction } from '@/lib/services/index-match'
import { redirect } from 'next/navigation'
import { ChevronRight, Clock, Eye, Globe, Laptop, Pencil, ShieldCheck, Target, Wallet, X, Zap } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { RoleCard, type EvidenceItem } from '@/components/features/role-card'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { BreakdownEngaged } from '@/components/features/breakdown-engaged'
import { functionGap } from '@/match/function-gap'
import { resolveCity } from '@/lib/taxonomy/locations'
import { countMatchingRoles, countWorkModeMatches, readApplyUrls, readCards, readExperienceFloors, readPostedDates, readShortlist, readStatedPays } from '@/lib/services/shortlist'
import { FeedProvider, SelectableCard } from '@/components/features/feed-selection'
import { JobPanel, JobSheet } from '@/components/features/job-panel'
import { isEasyApply } from '@/lib/job-facts'
import { readTrackedStatuses } from '@/lib/services/workspace'
import { applyQuickPills, arrangeShortlist, holdingLine, NEW_WITHIN_DAYS, SHOW_MORE_STEP } from '@/lib/shortlist'
import { candidateSearch, MAX_ROLES_PER_CANDIDATE } from '@/lib/score-candidate'
import { readFeedPrefs, readRoleText } from '@/lib/services/feed-prefs'
import { connectionsByCompany } from '@/lib/services/network'
import { normaliseCompany } from '@/lib/company-name'
import { applyDrawerFilters, applyTextFilter, drawerParams, viewFromParams, viewToQuery } from '@/lib/feed-query'
import { FeedSearch, HideRole, SavedFilters } from '@/components/features/feed-controls'
import { FeedFilterDrawer } from '@/components/features/feed-filter-drawer'

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
    posted?: string; level?: string; type?: string; pay?: string; skip?: string
  }>
}) {
  const params = await searchParams
  const { show, n, tab, sort, fit } = params
  const byNewest = sort === 'new'
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
  const [{ data: profile }, shortlist, feedPrefs] = await Promise.all([
    supabase
      .from('profiles')
      .select('preferred_role, preferred_roles, open_to_adjacent, confirmed_at, city, work_mode_preference, years_experience')
      .eq('id', user.id)
      .single(),
    readShortlist(user.id),
    readFeedPrefs(user.id),
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
  const [postedAll, applyAll] = await Promise.all([
    byNewest || pills.fresh || view.posted ? readPostedDates(allRows.map((r) => r.role_id)) : Promise.resolve(undefined),
    pills.easy ? readApplyUrls(allRows.map((r) => r.role_id)) : Promise.resolve(undefined),
  ])
  // Title/company/city are read only when a text filter is on (Phase 15). Job
  // type and "leave out" need the same title and employer.
  const roleText = view.q || view.city || view.type || view.skip ? await readRoleText(allRows.map((r) => r.role_id)) : new Map()
  const textFiltered = applyTextFilter(
    applyQuickPills(allRows, pills, {
      postedAt: postedAll,
      isEasy: (roleId) => isEasyApply(applyAll?.get(roleId)),
    }),
    view,
    roleText,
  )
  // The drawer (TASK-155). Floors and pay are read only for the rows that have
  // survived everything above, and only when their filter is on — pay reads
  // descriptions, which the list read deliberately does not.
  const [floorsAll, paysAll] = await Promise.all([
    view.level ? readExperienceFloors(textFiltered.map((r) => r.role_id)) : Promise.resolve(undefined),
    view.pay ? readStatedPays(textFiltered.map((r) => r.role_id)) : Promise.resolve(undefined),
  ])
  const { rows, notes: drawerNotes } = applyDrawerFilters(textFiltered, view, {
    text: roleText, postedAt: postedAll, floors: floorsAll, pays: paysAll,
  })
  const drawerPairs = drawerParams(view)
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
    view.pay && drawerNotes.unstatedPay > 0 ? `${drawerNotes.unstatedPay} role${drawerNotes.unstatedPay === 1 ? ' states' : 's state'} no pay in rupees and ${drawerNotes.unstatedPay === 1 ? 'is' : 'are'} left out.` : '',
  ].filter(Boolean)
  /** The words on a filter chip. Every drawer filter says what it is, so the chip can be removed knowingly. */
  const chipLabel = (k: string, v: string): string => {
    if (k === 'city') return `In ${v}`
    if (k === 'posted') return `Posted in the past ${v === '30' ? 'month' : v === '7' ? 'week' : `${v} days`}`
    if (k === 'level') return `${({ entry: 'Entry', mid: 'Mid', senior: 'Senior' } as Record<string, string>)[v] ?? v} level`
    if (k === 'type') return ({ fulltime: 'Full-time', intern: 'Internship', contract: 'Contract', parttime: 'Part-time' } as Record<string, string>)[v] ?? v
    if (k === 'pay') return `Pay ≥ ₹${v} L`
    if (k === 'skip') return `Not ${v.split(',').join(', ')}`
    return `“${v}”`
  }

  // Newest sorts by the board's posting date, which only this view needs.
  const postedAt = byNewest ? postedAll : undefined

  /**
   * New, sections, order, the Within-reach filter and how many cards render —
   * all in src/lib/shortlist.ts, where they are tested. The reasoning for each
   * stays below, beside the copy it produces.
   */
  const { isNew, newCount, visibleCount, strong, farCount, sections: arranged } = arrangeShortlist(
    rows,
    shortlist.firstShownAt,
    { onlyNew, byNewest, clearsOnly, show, shown: n ? Number(n) : undefined, postedAt },
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
  const [{ cards, requirements }, coverage, modeMatches, matched, tracked] = await Promise.all([
    readCards(user.id, arranged.flatMap((s) => s.visible)),
    strong < 10 ? coverageByFunction() : Promise.resolve([]),
    wantsMode ? countWorkModeMatches(user.id) : Promise.resolve(0),
    capSearch ? countMatchingRoles(capSearch.searches, capSearch.adjacent) : Promise.resolve(null),
    readTrackedStatuses(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
  ])
  // Who the candidate knows at each visible company (their own LinkedIn export, 0031).
  const knownAt = await connectionsByCompany(user.id, [...cards.values()].map((c) => normaliseCompany(displayEmployer(c.roles?.company_name))))
  const holding = holdingLine(allRows.length, MAX_ROLES_PER_CANDIDATE, matched)
  // At the cap the list is the top of a larger set, and the tab must not call
  // it "All" two lines above a sentence saying it is not (QA-05's lesson).
  const allLabel = holding.kind === 'complete' ? 'All matches' : 'Top matches'

  // Every requirement extracted for the role — a wrong score is debugged by
  // seeing what was read, not just the number it produced. Read only for the
  // cards that render; see src/lib/services/shortlist.ts for why.
  const evidence = (roleId: string): EvidenceItem[] =>
    (requirements.get(roleId) ?? []).map((q) => ({
      kind: q.kind,
      minYears: q.min_years ?? undefined,
      credential: q.credential ?? undefined,
      valueText: q.value_text ?? undefined,
      sourceQuote: q.source_quote,
      confidence: Number(q.confidence),
    }))

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
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  // From the signed-in address, matching /applications — a job title makes for
  // confusing initials ("PM" is not who you are).
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  // The pills ride along on every other link, so sorting or expanding a
  // filtered list does not silently drop the filter.
  const pillParams = (Object.keys(pills) as (keyof typeof pills)[]).filter((k) => pills[k])
  const pillQuery = pillParams.map((k) => `&${k}=1`).join('') + textParams.map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join('')
  const pillHref = (toggle: keyof typeof pills) => {
    const q = new URLSearchParams()
    if (onlyNew) q.set('tab', 'new')
    if (byNewest) q.set('sort', 'new')
    if (clearsOnly) q.set('fit', 'clears')
    for (const k of Object.keys(pills) as (keyof typeof pills)[]) {
      const on = k === toggle ? !pills[k] : pills[k]
      if (on) q.set(k, '1')
    }
    for (const [k, v] of textParams) q.set(k, v)
    return `/today${q.size ? `?${q}` : ''}`
  }
  const PILLS: { key: keyof typeof pills; label: string; icon: typeof Zap; title: string }[] = [
    { key: 'min80', label: 'Match > 80%', icon: Target, title: 'Only roles scoring above 80 for you' },
    { key: 'fresh', label: 'Posted < 24 hours', icon: Clock, title: 'Posted in the last day, by the employer’s own date. Roles whose board gives no date are left out.' },
    { key: 'remote', label: 'Remote only', icon: Globe, title: 'Roles the posting says are remote' },
    { key: 'easy', label: 'Easy Apply', icon: Zap, title: 'One-page application form, no account needed. The extension can fill it; you submit.' },
  ]

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
              <span className="font-semibold text-primary">We never apply for you.</span>
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

  return (
    <FeedProvider initial={roleParam ?? firstVisible}>
    <AppShell
      title="Job Search Feed"
      eyebrow="AI job matches"
      initials={initials}
      context={<JobPanel idle={rail} />}
      contextOnMobile="hide"
    >
      <ShortlistViewed cleared={strong} withheld={0} />
      <JobSheet />

      <div className="mx-auto max-w-[1100px] p-5 sm:p-8">
        <section className="min-w-0">
          {/* The headline used to read "Sorted by what fits, and what doesn't."
              The bucket headings below say that by existing, so it went. */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {[
                { key: 'all', label: allLabel, count: rows.length, href: '/today' },
                { key: 'new', label: `New in ${NEW_WITHIN_DAYS} days`, count: newCount, href: '/today?tab=new' },
              ].map((t) => {
                const active = (t.key === 'new') === onlyNew
                return (
                  <Link
                    key={t.key}
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {t.label}
                    {/* Full strength: at opacity-70 these measured 3.11:1 (QA-19). */}
                    <span className="font-mono tabular-nums">{t.count}</span>
                  </Link>
                )
              })}
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{today}</p>
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

          {/* THE BASELINE, AS CHIPS. The design showed a row of active filters —
              India, the function, the experience band, the work mode — with an
              Edit affordance. Every one of those is a real field on the profile
              and every one is genuinely narrowing the list, so they are read
              from the profile rather than hardcoded, and Edit goes to the place
              that changes them. A chip that did not correspond to a stored
              value would be decoration claiming to be a filter. */}
          {visibleCount > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">
                Your baseline
              </span>
              {[
                'India',
                profile.preferred_role,
                profile.years_experience !== null && profile.years_experience !== undefined
                  ? `${profile.years_experience} yrs experience`
                  : null,
                cityLabel,
                wantsMode ? WORK_MODE_LABEL[profile.work_mode_preference as string] : null,
              ]
                .filter(Boolean)
                .map((chip) => (
                  <span
                    key={String(chip)}
                    className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-primary"
                  >
                    {chip}
                  </span>
                ))}
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                <Pencil className="size-3" />
                Edit
              </Link>
            </div>
          ) : null}

          {/* Quick filters. Plain links, like every other control here: no client
              JavaScript, and each filtered view is its own shareable URL. */}
          <FeedSearch initial="" />
          <SavedFilters
            saved={feedPrefs.saved.map((f) => ({ name: f.name, query: viewToQuery(f.view) }))}
            current={view}
            stored={feedPrefs.stored}
          />
          <FeedFilterDrawer
            key={JSON.stringify(drawerPairs)}
            view={view}
            keep={[...(onlyNew ? [['tab', 'new'] as [string, string]] : []), ...(clearsOnly ? [['fit', 'clears'] as [string, string]] : []), ...(showHidden ? [['hidden', '1'] as [string, string]] : [])]}
            notes={drawerNoteLines}
          />
          <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Quick filters">
            {textParams.filter(([k]) => k !== 'hidden').map(([k, v]) => {
              const rest = new URLSearchParams()
              for (const p of pillParams) rest.set(p, '1')
              for (const [tk, tv] of textParams) if (tk !== k) rest.set(tk, tv)
              return (
                <Link
                  key={k}
                  href={`/today${rest.size ? `?${rest}` : ''}`}
                  title="Remove this filter"
                  className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold"
                >
                  {k === 'city' ? <Globe className="size-3.5" aria-hidden="true" /> : <Target className="size-3.5" aria-hidden="true" />}
                  {chipLabel(k, v)}
                  <X className="size-3" aria-hidden="true" />
                </Link>
              )
            })}
            {PILLS.map(({ key, label, icon: Icon, title }) => (
              <Link
                key={key}
                href={pillHref(key)}
                title={title}
                aria-pressed={pills[key]}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  pills[key]
                    ? 'bg-brand-gradient border-transparent'
                    : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
                }`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Link>
            ))}
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

          {pillCount > 0 && rows.length === 0 ? (
            <p className="mb-4 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
              No role in your {allRows.length} matches passes {pillCount === 1 ? 'that filter' : 'all of those filters'}.
              That is the filter, not the market —{' '}
              <Link href="/today" className="font-semibold text-primary underline underline-offset-4">clear it</Link>{' '}
              to see everything.
            </p>
          ) : null}

          {/* ⚠️ AT THE CAP THIS SENTENCE SAYS SO. The scorer takes the roles whose
              titles rank closest to the candidate's search, 500 at most, and
              "Showing 500 roles matched" read as the whole market — 6 of 9
              profiles sat at exactly 500 on 2026-09-23 (QA-06). The remedy
              named is the one that actually moves the number. */}
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            {pillCount > 0 && !onlyNew ? (
              // With a filter on, the count is what the filters left of the scored list — not the
              // list's own size, which read as "500" above a screen showing 14.
              <>
                Showing <span className="font-semibold text-primary">{rows.length}</span> of your{' '}
                <span className="font-semibold text-primary">{allRows.length}</span> scored{' '}
                {allRows.length === 1 ? 'role' : 'roles'} after your filters.
              </>
            ) : holding.kind === 'complete' || onlyNew ? (
              <>
                Showing <span className="font-semibold text-primary">{visibleCount}</span>{' '}
                {visibleCount === 1 ? 'role' : 'roles'} matched to your baseline.
              </>
            ) : (
              <>
                Showing the <span className="font-semibold text-primary">{holding.scored}</span> closest title
                matches
                {holding.kind === 'capped' ? (
                  <>
                    {' '}of <span className="font-semibold text-primary">{holding.matched.toLocaleString('en-IN')}</span>{' '}
                    roles that fit your baseline.
                  </>
                ) : (
                  ' to your baseline.'
                )}
              </>
            )}
            {holding.kind !== 'complete' ? (
              <>
                {' '}
                {holding.kind === 'capped' ? (
                  <>
                    The other <span className="font-semibold text-primary">{holding.unscored.toLocaleString('en-IN')}</span> rank
                    lower on title and were not scored.
                  </>
                ) : (
                  'More roles fit than we scored.'
                )}{' '}
                <Link href="/profile" className="font-semibold text-primary underline underline-offset-4">
                  {profile.open_to_adjacent ? 'Turning off adjacent roles' : 'A more specific role'}
                </Link>{' '}
                narrows the list.
              </>
            ) : null}
          </p>

          {/* Sort and filter. Plain links, so the whole control set costs no
              client JavaScript and every view is its own shareable URL — the
              same reason "show all" is a link. Both controls apply to both
              sections: they are one list split by location, and a candidate
              sorting one half by newest while the other stays on best-match
              would be comparing two different things. */}
          {visibleCount > 0 ? (
            <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Sort</span>
                {[
                  { k: 'best', label: 'Best match' },
                  { k: 'new', label: 'Newest' },
                ].map(({ k, label }) => {
                  const active = (k === 'new') === byNewest
                  const params = new URLSearchParams()
                  if (onlyNew) params.set('tab', 'new')
                  if (k === 'new') params.set('sort', 'new')
                  if (clearsOnly) params.set('fit', 'clears')
                  for (const p of pillParams) params.set(p, '1')
                  for (const [tk, tv] of textParams) params.set(tk, tv)
                  return (
                    <Link
                      key={k}
                      href={`/today${params.size ? `?${params}` : ''}`}
                      aria-current={active ? 'true' : undefined}
                      className={`inline-flex min-h-6 items-center font-medium transition-colors ${
                        active ? 'text-primary underline underline-offset-4' : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      {label}
                    </Link>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Show</span>
                {[
                  { k: 'all', label: 'Everything' },
                  { k: 'clears', label: 'Within reach' },
                ].map(({ k, label }) => {
                  const active = (k === 'clears') === clearsOnly
                  const params = new URLSearchParams()
                  if (onlyNew) params.set('tab', 'new')
                  if (byNewest) params.set('sort', 'new')
                  if (k === 'clears') params.set('fit', 'clears')
                  for (const p of pillParams) params.set(p, '1')
                  for (const [tk, tv] of textParams) params.set(tk, tv)
                  return (
                    <Link
                      key={k}
                      href={`/today${params.size ? `?${params}` : ''}`}
                      aria-current={active ? 'true' : undefined}
                      className={`inline-flex min-h-6 items-center font-medium transition-colors ${
                        active ? 'text-primary underline underline-offset-4' : 'text-muted-foreground hover:text-primary'
                      }`}
                    >
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
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
                <section key={key} className="mb-10" aria-labelledby={`bucket-${key}`}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                    <h3
                      id={`bucket-${key}`}
                      className="text-xs font-bold uppercase tracking-[0.16em] text-primary"
                    >
                      {title}
                    </h3>
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {inSection.length}
                    </span>
                  </div>
                  <p className="mb-4 text-xs leading-5 text-muted-foreground">
                    {blurb}
                    {/* A filter that removes rows says how many, always. A count
                        that silently shrinks is indistinguishable from a thin
                        day, and this product does not let the candidate mistake
                        our filter for the market's answer. */}
                    {hiddenByFilter > 0 ? (
                      <>
                        {' '}
                        <Link
                          href={`/today${onlyNew ? '?tab=new' : ''}`}
                          className="font-semibold text-primary underline underline-offset-4"
                        >
                          {hiddenByFilter} more hidden by your filter
                        </Link>
                        .
                      </>
                    ) : null}
                  </p>

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
                          gateResultId={card.id}
                          roleId={card.role_id}
                          title={card.roles?.title ?? ''}
                          company={displayEmployer(card.roles?.company_name)}
                          city={displayCity(card.roles?.city) || undefined}
                          score={card.score ?? 0}
                          breakdown={card.score_breakdown}
                          reason={card.reason}
                          applyUrl={card.roles?.apply_url}
                          isNew={isNew(r)}
                          requirements={evidence(card.role_id)}
                          profileCity={profile.city ?? undefined}
                          postedAt={card.roles?.posted_at ?? undefined}
                          trackedStatus={tracked.get(card.role_id)}
                          hideControl={<HideRole roleId={card.role_id} hidden={showHidden} />}
                          statedPay={card.stated_pay}
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
                        href={`/today?show=${key}&n=${visible.length + SHOW_MORE_STEP}${onlyNew ? '&tab=new' : ''}${byNewest ? '&sort=new' : ''}${clearsOnly ? '&fit=clears' : ''}${pillQuery}#bucket-${key}`}
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
