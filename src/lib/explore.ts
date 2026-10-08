import { resolveCity } from '@/lib/taxonomy/locations'
import { cityPatterns } from '@/lib/seo-pages'
import { searchTokens } from '@/lib/public-search'
import { isStaffingAgency } from '@/lib/taxonomy/agencies'
import { isEasyApply } from '@/lib/job-facts'
import { SKIP_AGENCIES, type FeedView, type Mode } from '@/lib/feed-query'

/**
 * "Search all roles" (TASK-217): the sentence box on /today only filters the candidate's own ~395
 * already-scored matches, so a role outside their saved preferences — "data analyst" for a customer-success
 * candidate — finds nothing while 21,737 roles sit in the index. This is the plan for searching the whole
 * index with the SAME parsed view (src/lib/feed-query.ts parseFeedQuery), then scoring what it finds on the
 * spot against the candidate's profile.
 *
 * ⚠️ EVERY FILTER THIS CAN'T HONOUR IS NAMED, NOT DROPPED (same rule as the feed's drawer): the years a
 * posting asks for and stated pay are worked out per posting in memory over the scored list, not in the
 * database query, so here they are listed in `notApplied` and shown on the page. Pure: no database, no model.
 */

/** How many roles one search reads and scores. Scoring is pure and fast; the cost is reading descriptions. */
export const EXPLORE_SCAN = 200
/** How many of the scored roles are shown (best first). */
export const EXPLORE_SHOW = 60

export type ExplorePlan = {
  tokens: string[]
  /** Lower-case city spellings to match (the scorer's own aliases), or []. */
  cityPatterns: string[]
  remote: boolean
  /** Posted within this many days by the employer's own date, or null. */
  postedDays: number | null
  /** roles.employment_type values to accept (the employer's OWN stated contract type), or []. */
  types: string[]
  mode: Mode | ''
  /** Employer names to leave out — wildcard characters already removed. */
  skipNames: string[]
  skipAgencies: boolean
  min80: boolean
  easy: boolean
  sort: FeedView['sort']
  /** Filters in the sentence this search cannot apply, in words. */
  notApplied: string[]
}

/** A user-typed fragment made safe to put inside an ilike pattern: no wildcards, no escapes, no list separators. */
const plain = (s: string): string => s.replace(/[%_\\,()*]/g, ' ').replace(/\s+/g, ' ').trim()

const TYPE_VALUES: Record<string, string[]> = { fulltime: ['fulltime'], intern: ['intern'], contract: ['contract', 'temporary'], parttime: ['parttime'] }

export function planExplore(view: FeedView): ExplorePlan {
  const city = view.city ? resolveCity(view.city) : null
  const rawCity = view.city ? plain(view.city).toLowerCase() : ''
  const days = [view.posted ? Number(view.posted) : null, view.fresh ? 1 : null].filter((d): d is number => d !== null)
  const names = view.skip ? view.skip.split(',').map((n) => n.trim()).filter(Boolean) : []
  const notApplied: string[] = []
  if (view.level) notApplied.push('the experience-level filter (the years each posting asks for are only read for your own matches)')
  if (view.pay > 0) notApplied.push('the minimum-pay filter (stated pay is only read for your own matches)')
  if (view.sort === 'pay') notApplied.push('sort by pay')
  return {
    tokens: searchTokens(view.q),
    cityPatterns: city ? cityPatterns(city) : rawCity.length >= 2 ? [rawCity] : [],
    remote: view.remote,
    postedDays: days.length ? Math.min(...days) : null,
    types: view.type ? TYPE_VALUES[view.type] ?? [] : [],
    mode: view.mode,
    skipNames: names.filter((n) => n.toLowerCase() !== SKIP_AGENCIES).map(plain).filter((n) => n.length >= 2),
    skipAgencies: names.some((n) => n.toLowerCase() === SKIP_AGENCIES),
    min80: view.min80,
    easy: view.easy,
    sort: view.sort,
    notApplied,
  }
}

/** Nothing narrows the search — reading "the newest 200 of everything" would answer no question. */
export function isOpenEnded(p: ExplorePlan): boolean {
  return p.tokens.length === 0 && p.cityPatterns.length === 0 && !p.remote && p.postedDays === null && p.types.length === 0 && !p.mode
}

export type Explored = { score: number; company: string | null; applyUrl: string | null; postedAt: string | null }

/** Filters that need the score (or the apply link), then the order: best score first unless the sentence asked otherwise. */
export function afterScoring<T extends Explored>(rows: T[], p: ExplorePlan): T[] {
  let out = rows
  if (p.min80) out = out.filter((r) => r.score >= 80)
  if (p.easy) out = out.filter((r) => isEasyApply(r.applyUrl))
  if (p.skipAgencies) out = out.filter((r) => !(r.company && isStaffingAgency(r.company)))
  const t = (r: Explored) => (r.postedAt ? Date.parse(r.postedAt) : 0)
  const by = p.sort === 'new'
    ? (a: T, b: T) => t(b) - t(a) || b.score - a.score
    : p.sort === 'company'
      ? (a: T, b: T) => (a.company ?? '').localeCompare(b.company ?? '') || b.score - a.score
      : (a: T, b: T) => b.score - a.score || t(b) - t(a)
  return [...out].sort(by)
}

/** Where /today links to when its own matches do not hold the answer: the filters it already has, carried over. */
export function exploreHref(query: string): string {
  return `/today/explore${query ? `?${query}` : ''}`
}
