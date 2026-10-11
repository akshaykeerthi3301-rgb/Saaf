import Link from 'next/link'
import { displayCity, displayEmployer } from '@/lib/display-names'
import { redirect } from 'next/navigation'
import { ChevronRight, Eye, FileSearch, X } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { RoleCard } from '@/components/features/role-card'
import { repostChip } from '@/lib/repost'
import { jobTypeFromStated, payFromRow } from '@/lib/role-facts'
import { stageChip } from '@/lib/company-stage'
import { ShortlistViewed } from '@/components/features/shortlist-viewed'
import { resolveCity } from '@/lib/taxonomy/locations'
import { countMatchingRoles, readApplyUrls, readCards, readExperienceFloors, readReposts, readRoleFacts, readShortlist, readStatedPays, readTrackerCounts } from '@/lib/services/shortlist'
import { FeedProvider, SelectableCard } from '@/components/features/feed-selection'
import { JobSheet } from '@/components/features/job-panel'
import { WelcomeModal } from '@/components/features/welcome-modal'
import { JobRail, JobsStage } from '@/components/features/jobs-stage'
import { ProfileChip } from '@/components/features/profile-chip'
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
    /** '1' straight after the first scan: the welcome card (src/components/features/welcome-modal.tsx). */
    welcome?: string
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
  const [{ data: profile }, shortlist, feedPrefs, savedSearches, searchHistory, trackerCounts] = await Promise.all([
    supabase
      .from('profiles')
      .select('preferred_role, preferred_roles, open_to_adjacent, confirmed_at, city, work_mode_preference, years_experience')
      .eq('id', user.id)
      .single(),
    readShortlist(user.id),
    readFeedPrefs(user.id),
    readSavedSearches(user.id),
    readSearchHistory(user.id),
    readTrackerCounts(),
  ])

  // Scores never run against an unconfirmed profile, so there would be nothing
  // to show — send them back rather than rendering an empty list they would
  // reasonably read as a verdict.
  if (!profile?.confirmed_at) redirect('/start')

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
  const { isNew, newCount, visibleCount, strong, sections: arranged } = arrangeShortlist(
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
  const [{ cards }, matched, tracked, reposts, providerFacts, floors] = await Promise.all([
    readCards(user.id, arranged.flatMap((s) => s.visible), { requirements: false }),
    capSearch ? countMatchingRoles(capSearch.searches, capSearch.adjacent) : Promise.resolve(null),
    readTrackedStatuses(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readReposts(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readRoleFacts(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
    readExperienceFloors(arranged.flatMap((s) => s.visible).map((r) => r.role_id)),
  ])
  // Who the candidate knows at each visible company (their own LinkedIn export, 0031).
  const knownAt = await connectionsByCompany(user.id, [...cards.values()].map((c) => normaliseCompany(displayEmployer(c.roles?.company_name))))
  const holding = holdingLine(allRows.length, MAX_ROLES_PER_CANDIDATE, matched)
  // At the cap the list is the top of a larger set, and the tab must not call
  // it "All" two lines above a sentence saying it is not (QA-05's lesson).


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

  /* The right column while browsing — quiet, as in the reference product: who is signed in, the saved searches, and
     the one extra this product has, the résumé check. (It used to carry market statistics, three promises and a
     coverage table: the founder's verdict was "cluttered".) */
  const sidebar = (
    <div className="space-y-7">
      <ProfileChip />
      <section aria-label="Saved searches">
        <h2 className="text-base font-semibold tracking-[-0.02em] text-primary">Your saved searches</h2>
        <div className="mt-3">
          <SavedSearchesMenu searches={savedSearches.searches} current={savedSearches.current} stored={savedSearches.stored} />
        </div>
      </section>
      <Link href="/tools/ats-checker" className="group block rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/30">
        <span className="flex items-center gap-2 text-sm font-semibold text-primary"><FileSearch className="size-4" />Check your résumé<ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">See what an applicant tracking system reads out of it.</span>
      </Link>
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
  /** Filters with no pill of their own stay visible as removable chips: the words, the city, pay, employers. */
  const chipKeys = ['q', 'city', 'pay', 'skip']

  // The first section that has more to show, for the one "Show more" at the foot of the list.
  const more = sections.find((sec) => sec.visible.length < sec.rows.length)
  const flat = sections.flatMap((sec) => sec.visible)
  const tabLink = (active: boolean) =>
    `relative inline-flex items-center gap-1.5 whitespace-nowrap py-1 text-sm font-semibold transition-colors ${active ? 'text-primary after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-accent' : 'text-muted-foreground hover:text-primary'}`
  const tabs = (
    <nav aria-label="Feed tabs" className="flex items-center gap-4 sm:gap-6">
      {[
        { label: 'Recommended', count: rows.length, href: '/today', active: !onlyNew && !showHidden },
        { label: 'New', count: newCount, href: '/today?tab=new', active: onlyNew },
        { label: 'Saved', count: trackerCounts.saved, href: '/applications', active: false, wide: true },
        { label: 'Applied', count: trackerCounts.applied, href: '/applications', active: false, wide: true },
      ].map((t) => (
        // Phone: two tabs and no counts — the bar shares its row with the menu button, the bell and the avatar.
        <Link key={t.label} href={t.href} aria-current={t.active ? 'page' : undefined} className={`${tabLink(t.active)}${t.wide ? ' max-md:hidden' : ''}`}>
          {t.label}
          <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground max-sm:hidden">{t.count}</span>
        </Link>
      ))}
    </nav>
  )
  const search = (
    <FeedSearch
      initial=""
      current={view}
      history={searchHistory.entries}
      chips={promptChips({ role: profile.preferred_role, city: resolveCity(profile.city)?.name ?? profile.city, years: profile.years_experience })}
    />
  )
  const pill = (on: boolean, hideOnPhone = false) =>
    `${hideOnPhone && !on ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${on ? 'border-accent/50 bg-accent/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-primary'}`

  return (
    <FeedProvider initial={roleParam ?? null} openInitially={Boolean(roleParam)}>
    <AppShell
      title="Jobs"
      eyebrow="AI job matches"
      initials={initials}
      bar={
        <div className="flex min-w-0 items-center gap-4 sm:gap-7">
          <span className="hidden items-center gap-1.5 text-lg font-extrabold uppercase tracking-[0.01em] text-primary sm:flex">Jobs<ChevronRight className="size-4 text-muted-foreground" /></span>
          {tabs}
          <div className="ml-auto hidden w-full max-w-xs lg:block">{search}</div>
        </div>
      }
      context={<JobRail idle={sidebar} />}
      contextOnMobile="hide"
    >
      <ShortlistViewed cleared={strong} withheld={0} />
      {params.welcome === '1' ? <WelcomeModal found={allRows.length} years={profile.years_experience ?? null} roles={[...new Set([profile.preferred_role, ...(profile.preferred_roles ?? [])].filter((r): r is string => !!r))]} /> : null}
      <JobSheet />

      <JobsStage>
        <div className="mx-auto max-w-[920px] px-5 pb-12 pt-5 sm:px-8">
          <div className="mb-4 lg:hidden">{search}</div>

          {/* ONE ROW OF PILLS, then the cards. Every pill is a link to the address it produces. */}
          <div data-tour="filters" className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filters">
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
                ...(['fulltime', 'intern', 'contract', 'parttime'] as const).map((t) => ({ label: TYPE_NAME[t], href: hrefFor({ ...view, type: t }), selected: view.type === t })),
              ]}
            />
            {([
              { key: 'remote', label: 'Remote' },
              { key: 'min80', label: 'Match 80+' },
              { key: 'easy', label: 'Easy apply' },
            ] as const).map(({ key, label }) => (
              <Link key={key} href={hrefFor({ ...view, [key]: !view[key] })} aria-pressed={view[key]} className={pill(view[key], key !== 'min80')}>{label}</Link>
            ))}
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
                <Link key={k} href={hrefFor({ ...next, sort: view.sort })} title="Remove this filter" className={pill(true)}>
                  {chipLabel(k, v)}<X className="size-3.5" aria-hidden="true" />
                </Link>
              )
            })}
            {hiddenCount > 0 || showHidden ? (
              <Link href={showHidden ? '/today' : '/today?hidden=1'} className={pill(showHidden)}>
                <Eye className="size-4" />{showHidden ? 'Back to your feed' : `Hidden jobs · ${hiddenCount}`}
              </Link>
            ) : null}
            {pillCount > 0 ? (
              <Link href={`/today${onlyNew ? '?tab=new' : ''}`} className="inline-flex items-center gap-1 px-2 py-2 text-sm font-medium text-muted-foreground hover:text-primary">
                Clear all
              </Link>
            ) : null}
            <span className="ml-auto">
              <PillMenu
                align="right"
                label={byNewest ? 'Newest' : byPay ? 'Pay stated first' : byCompany ? 'Company A–Z' : 'Recommended'}
                options={[
                  { label: 'Recommended', href: hrefFor({ ...view, sort: '' }), selected: !view.sort },
                  { label: 'Newest', href: hrefFor({ ...view, sort: 'new' }), selected: byNewest },
                  { label: 'Pay stated first', href: hrefFor({ ...view, sort: 'pay' }), selected: byPay },
                  { label: 'Company A–Z', href: hrefFor({ ...view, sort: 'company' }), selected: byCompany },
                ]}
              />
            </span>
          </div>

          {(() => { const a = currentAnswer(searchHistory.entries, view); return a ? <div className="mb-4"><SearchAnswer key={a.id} entry={a} /></div> : null })()}

          {error ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">We couldn&apos;t load your jobs just now. Try again in a moment.</p>
          ) : null}

          {onlyNew && visibleCount === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Nothing new in the last {NEW_WITHIN_DAYS} days. <Link href="/today" className="font-semibold text-primary underline underline-offset-4">See all {rows.length} matches</Link>.
            </p>
          ) : null}

          {/* No match for the filters: say so once, and offer the quickest ways back. */}
          {!error && rows.length === 0 && !onlyNew && allRows.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-primary">No jobs match these filters.</p>
              {relaxed.length > 0 || solo.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(relaxed.length > 0 ? relaxed : solo).map(({ key, count }) => {
                    const q = new URLSearchParams(viewToQuery(relaxed.length > 0 ? withoutFilter(view, key) : onlyFilter(view, key)))
                    if (showHidden) q.set('hidden', '1')
                    return (
                      <Link key={key} href={`/today${q.size ? `?${q}` : ''}`} className={pill(false)}>
                        {relaxed.length > 0 ? 'Remove ' : ''}{filterLabel(key)} <span className="font-mono tabular-nums text-muted-foreground">→ {count}</span>
                      </Link>
                    )
                  })}
                </div>
              ) : null}
              <p className="mt-3">
                <Link href="/today" className="font-semibold text-primary underline underline-offset-4">Clear filters</Link>
                {' · '}
                <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">Search all {indexed.toLocaleString('en-IN')} roles</Link>
              </p>
            </div>
          ) : null}

          <div className="space-y-4">
            {flat.map((r) => {
              const card = cards.get(r.id)
              // Recomputed between the two reads — the nightly sweep replaces gate_results rows. Skipped rather than drawn half-empty.
              if (!card) return null
              const facts = providerFacts.facts.get(card.role_id)
              return (
                <SelectableCard key={r.id} roleId={card.role_id}>
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
                    stage={stageChip(displayEmployer(card.roles?.company_name))}
                    trackedStatus={tracked.get(card.role_id)}
                    hideControl={<HideRole roleId={card.role_id} hidden={showHidden} />}
                    statedPay={(facts ? payFromRow(facts)?.text : null) ?? card.stated_pay}
                    gist={card.gist}
                    connections={knownAt.get(normaliseCompany(displayEmployer(card.roles?.company_name)))}
                    workMode={facts?.work_mode ?? null}
                    employmentType={facts?.employment_type ?? null}
                    minYears={floors.get(card.role_id) ?? null}
                  />
                </SelectableCard>
              )
            })}
          </div>

          {more ? (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/today?show=${more.key}&n=${more.visible.length + SHOW_MORE_STEP}${onlyNew ? '&tab=new' : ''}${view.sort ? `&sort=${view.sort}` : ''}${clearsOnly ? '&fit=clears' : ''}${pillQuery}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-foreground/30"
              >
                Show {Math.min(SHOW_MORE_STEP, more.rows.length - more.visible.length)} more jobs
              </Link>
            </div>
          ) : null}

          {holding.kind === 'capped' && !onlyNew ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Showing the {holding.scored.toLocaleString('en-IN')} closest title matches of {holding.matched.toLocaleString('en-IN')} that fit.{' '}
              <Link href={exploreTo} className="font-semibold text-primary underline underline-offset-4">Search all roles</Link>
            </p>
          ) : null}
        </div>
      </JobsStage>
    </AppShell>
    </FeedProvider>
  )
}
