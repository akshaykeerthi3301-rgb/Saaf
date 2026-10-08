import { z } from 'zod'
import { CITIES, matchLocation, resolveCity } from '@/lib/taxonomy/locations'
import { normaliseCompany } from '@/lib/company-name'
import { isStaffingAgency } from '@/lib/taxonomy/agencies'

/**
 * The feed's view: which pills are on, a text query, a city, and the drawer
 * filters (TASK-155, 2026-10-07).
 *
 * One shape for three features (2026-09-25, Phase 15 — gaps observed inside
 * Jobright, PROJECT-STATE Stage AG): the URL of /today, a saved filter, and the
 * sentence search. Keeping one shape means a saved filter and a typed sentence
 * can only ever produce views the pills could produce — nothing hidden, no
 * second filter language.
 *
 * ⚠️ EVERY FILTER HERE IS ONE THE DATA CAN HONOUR. The drawer offers what
 * `roles` and `role_requirements` actually hold: the posting date, the years the
 * posting asks for, a job type read from the title, pay where the posting states
 * it, and employers the candidate names. It does not offer hybrid / on-site
 * (no per-role work-mode column; "Remote only" is the one honest work-mode
 * filter) or a staffing-agency switch (about a hundred agency roles in the index,
 * so a switch would do almost nothing). A filter we cannot back would be a
 * decoration, and a filter that hides roles for a reason the candidate cannot
 * see is the failure the pills' own comment warns about.
 *
 * Pure. No database, no model.
 */

export const POSTED_WINDOWS = ['1', '3', '7', '30'] as const
export const LEVELS = ['entry', 'mid', 'senior'] as const
export const JOB_TYPES = ['fulltime', 'intern', 'contract', 'parttime'] as const
export const MODES = ['remote', 'hybrid', 'onsite'] as const
export const SORTS = ['new', 'pay', 'company'] as const
export const ROLE_TYPES = ['ic', 'manager'] as const

export type PostedWindow = (typeof POSTED_WINDOWS)[number]
export type Level = (typeof LEVELS)[number]
export type JobType = (typeof JOB_TYPES)[number]
export type Mode = (typeof MODES)[number]
export type Sort = (typeof SORTS)[number]
export type RoleType = (typeof ROLE_TYPES)[number]

export type FeedView = {
  min80: boolean
  fresh: boolean
  remote: boolean
  easy: boolean
  /** Words that must appear in the role title or company name. */
  q: string
  /** One to three city names, comma-separated; any may match. Each is matched with the same alias rules the scorer uses. */
  city: string
  /** Posted within this many days, by the employer's own date. '' = any. */
  posted: PostedWindow | ''
  /** The years the posting asks for, banded. Roles that state none are kept. '' = any. */
  level: Level | ''
  /** The contract type(s) the provider STATES, comma-separated JobType values (the drawer allows several); where it states none, read from the title. '' = any. */
  type: string
  /** Where the work happens, comma-separated Mode values — ONLY where the employer's own system says (remote / hybrid / on-site). Roles that state none are left out and counted. '' = any. */
  mode: string
  /** Individual contributor or people manager, READ FROM THE TITLE ONLY (see roleTypeOf). '' = any. */
  roleType: RoleType | ''
  /** Show only these employers, comma-separated, in the candidate's own spelling. '' = all. */
  only: string
  /** Minimum STATED annual pay in lakh rupees; roles that state no pay are left out. 0 = off. */
  pay: number
  /** Employers to leave out, comma-separated, in the candidate's own spelling. */
  skip: string
  /** '' = best match first; new = newest posted; pay = roles that state pay first, highest first; company = A to Z. */
  sort: Sort | ''
}

export const EMPTY_VIEW: FeedView = {
  min80: false, fresh: false, remote: false, easy: false, q: '', city: '',
  posted: '', level: '', type: '', mode: '', roleType: '', only: '', pay: 0, skip: '', sort: '',
}

const MAX_Q = 80
export const MAX_PAY_LAKH = 500
export const MAX_SKIP = 10
export const MAX_SKIP_NAME = 40
/** One entry of the leave-out list that stands for the whole curated staffing-agency list (src/lib/taxonomy/agencies.ts). */
export const SKIP_AGENCIES = '@agencies'

const pick = <T extends string>(list: readonly T[], v: string | undefined): T | '' =>
  list.includes(v as T) ? (v as T) : ''

/** Several allowed values from one param: "contract,fulltime" → "fulltime,contract" (canonical order, whitelist, no repeats). */
function pickMany<T extends string>(list: readonly T[], v: string | undefined): string {
  if (!v) return ''
  const wanted = new Set(v.split(',').map((x) => x.trim()))
  return list.filter((x) => wanted.has(x)).join(',')
}

/** The job types / work modes a view allows, as lists. */
export const typesOf = (v: Pick<FeedView, 'type'>): JobType[] => (v.type ? (v.type.split(',') as JobType[]) : [])
export const modesOf = (v: Pick<FeedView, 'mode'>): Mode[] => (v.mode ? (v.mode.split(',') as Mode[]) : [])

/** "Pune, Mumbai" → "Pune,Mumbai": at most three names, each trimmed and capped, no repeats. */
export function cleanCities(raw: string): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const name = part.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase()); out.push(name)
    if (out.length === 3) break
  }
  return out.join(',').slice(0, 60)
}

const cleanPay = (v: string | undefined): number => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 1 && n <= MAX_PAY_LAKH ? n : 0
}

/**
 * "Accenture, TCS" → "Accenture,TCS": trimmed, de-duplicated without regard to
 * case, capped. Idempotent, so a value that has been through the URL, a saved
 * filter and the form comes back the same. A name containing a comma cannot be
 * kept whole; that is the cost of a plain list.
 */
export function cleanSkip(raw: string): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[,\n]/)) {
    const name = part.replace(/\s+/g, ' ').trim().slice(0, MAX_SKIP_NAME)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= MAX_SKIP) break
  }
  return out.join(',')
}

/** Read a view from /today's search params (or a saved filter). Unknown keys are ignored. */
export function viewFromParams(p: Record<string, string | undefined>): FeedView {
  return {
    min80: p.min80 === '1',
    fresh: p.fresh === '1',
    remote: p.remote === '1',
    easy: p.easy === '1',
    q: (p.q ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q),
    city: cleanCities(p.city ?? ''),
    posted: pick(POSTED_WINDOWS, p.posted),
    level: pick(LEVELS, p.level),
    type: pickMany(JOB_TYPES, p.type),
    pay: cleanPay(p.pay),
    skip: cleanSkip(p.skip ?? ''),
    mode: pickMany(MODES, p.mode),
    roleType: pick(ROLE_TYPES, p.rt),
    only: cleanSkip(p.only ?? ''),
    sort: pick(SORTS, p.sort),
  }
}

/** A view as the params that would rebuild it — the inverse of viewFromParams. */
export function viewToParams(v: FeedView): Record<string, string | undefined> {
  return {
    min80: v.min80 ? '1' : undefined, fresh: v.fresh ? '1' : undefined,
    remote: v.remote ? '1' : undefined, easy: v.easy ? '1' : undefined,
    q: v.q || undefined, city: v.city || undefined,
    posted: v.posted || undefined, level: v.level || undefined, type: v.type || undefined, mode: v.mode || undefined,
    rt: v.roleType || undefined, only: v.only || undefined,
    pay: v.pay ? String(v.pay) : undefined, skip: v.skip || undefined, sort: v.sort || undefined,
  }
}

/**
 * A stored filter (jsonb) back into a view. Rebuilt through the whitelist, so a
 * stored value can only ever be a view the controls could make — and a filter
 * saved before the drawer existed, with six keys, restores with the new ones off.
 */
export function viewFromStored(raw: unknown): FeedView | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined)
  return viewFromParams({
    min80: o.min80 ? '1' : undefined, fresh: o.fresh ? '1' : undefined,
    remote: o.remote ? '1' : undefined, easy: o.easy ? '1' : undefined,
    q: str('q'), city: str('city'), posted: str('posted'), level: str('level'), type: str('type'), mode: str('mode'),
    // Pay is the one field stored as a number; every other field must be text.
    pay: typeof o.pay === 'number' ? String(o.pay) : str('pay'),
    skip: str('skip'), sort: str('sort'), rt: str('roleType'), only: str('only'),
  })
}

/** The boundary for a view sent from the browser (saveFilter). Strict: unknown keys are refused. */
export const feedViewSchema = z.object({
  min80: z.boolean(), fresh: z.boolean(), remote: z.boolean(), easy: z.boolean(),
  q: z.string().max(MAX_Q), city: z.string().max(60),
  posted: z.enum(['', ...POSTED_WINDOWS]),
  level: z.enum(['', ...LEVELS]),
  type: z.string().max(40).refine((v) => pickMany(JOB_TYPES, v) === v, 'unknown job type'),
  mode: z.string().max(30).refine((v) => pickMany(MODES, v) === v, 'unknown work mode'),
  roleType: z.enum(['', ...ROLE_TYPES]),
  only: z.string().max(MAX_SKIP * (MAX_SKIP_NAME + 1)),
  pay: z.number().int().min(0).max(MAX_PAY_LAKH),
  skip: z.string().max(MAX_SKIP * (MAX_SKIP_NAME + 1)),
  sort: z.enum(['', ...SORTS]),
}).strict()

/** The query string for a view — whitelisted keys only, so a stored filter can never inject a link. */
export function viewToQuery(v: FeedView): string {
  const q = new URLSearchParams()
  for (const [k, val] of Object.entries(viewToParams(v))) if (val !== undefined) q.set(k, val)
  return q.toString()
}

/** The drawer's own params, as pairs, for links that must carry them along. */
export function drawerParams(v: FeedView): [string, string][] {
  const out: [string, string][] = []
  if (v.posted) out.push(['posted', v.posted])
  if (v.level) out.push(['level', v.level])
  if (v.type) out.push(['type', v.type])
  if (v.mode) out.push(['mode', v.mode])
  if (v.roleType) out.push(['rt', v.roleType])
  if (v.only) out.push(['only', v.only])
  if (v.pay) out.push(['pay', String(v.pay)])
  if (v.skip) out.push(['skip', v.skip])
  return out
}

export function isEmptyView(v: FeedView): boolean {
  return !v.min80 && !v.fresh && !v.remote && !v.easy && !v.q && !v.city &&
    !v.posted && !v.level && !v.type && !v.mode && !v.roleType && !v.only && !v.pay && !v.skip && !v.sort
}

// ------------------------------------------------------------ sentence search

/** Short forms candidates type, expanded to the words a title actually uses. */
const EXPAND: Record<string, string> = {
  pm: 'product manager', apm: 'associate product manager', swe: 'software engineer', sde: 'engineer',
  ba: 'business analyst', ds: 'data scientist', de: 'data engineer', em: 'engineering manager',
  csm: 'customer success manager', ae: 'account executive', sdr: 'sales development', hrbp: 'hr business partner',
  ux: 'designer', ui: 'designer', qa: 'quality',
}

const STOP = new Set([
  'i', 'im', "i'm", 'want', 'need', 'looking', 'look', 'for', 'a', 'an', 'the', 'in', 'at', 'on', 'of', 'to', 'and',
  'or', 'with', 'me', 'show', 'find', 'get', 'some', 'any', 'job', 'jobs', 'role', 'roles', 'position', 'positions',
  'opening', 'openings', 'based', 'near', 'around', 'please', 'only', 'that', 'which', 'are', 'is', 'be', 'my', 'city',
  'india', 'work', 'working', 'from', 'within', 'than', 'more', 'less', 'posted', 'match', 'matches', 'fit',
  'recent', 'recently', 'postings',
])

/** Words that start a pay figure's unit: "12 lpa", "12 lakh", "₹12L", "1.5 cr". */
const PAY_RE = /(?:₹|rs\.?\s*|inr\s*)?\b(\d{1,3}(?:\.\d+)?)\s*(lpa|lakhs?|lacs?|l|cr|crores?)\b\+?(?:\s*(?:per annum|per year|a year|p\.?a\b|annually))?/

/** "excluding Accenture, TCS" → ['Accenture','TCS'], read from the original casing before punctuation is stripped. */
const SKIP_RE = /\b(?:excluding|exclude|except|avoid|not at|not from|other than)\s+([^.;!?]*?)(?=\s+(?:in|at|for|posted|remote|jobs|roles|with|paying|pay|and only|that|which)\b|[.;!?]|$)/i

/**
 * A typed sentence → the view the pills and the drawer would set, plus words to
 * match.
 *
 * Deterministic on purpose: "remote", "easy apply", "posted today / this week /
 * this month", "entry level", "internship", "contract", "paying 12 lakh",
 * "excluding Accenture", "newest first", "strong match" and a city name are
 * recognised; every other meaningful word becomes the title/company query.
 * Whatever was understood is shown back as chips the candidate can remove, so a
 * misreading is visible and one click undoes it.
 *
 * "remote ok" / "or remote" means remote is ALLOWED, not required, so it does
 * not switch on "Remote only" — the pill that hides every office role.
 *
 * ⚠️ TITLE WORDS STAY TITLE WORDS. "senior", "junior", "lead" are part of a job
 * title far more often than a statement about years, and the experience filter
 * reads the years a posting asks for, not its title. "Senior product manager"
 * therefore searches the title; only an explicit "entry level", "fresher",
 * "mid level" or a years range sets the experience band.
 */
export function parseFeedQuery(text: string): FeedView {
  const v: FeedView = { ...EMPTY_VIEW }

  // Employers to leave out come first, from the original text: a list needs its commas.
  let original = ` ${text} `
  // "no agencies", "direct employers only", "exclude staffing agencies": the curated agency list, not an employer called "agencies".
  const AGENCY_RE = /\b(?:(?:no|without|exclude|excluding|except|avoid|skip|not)\s+(?:the\s+)?(?:staffing\s+|recruiting\s+|recruitment\s+)?(?:agencies|agency|recruiters|consultancies)|direct\s+employers?\s+only|directly\s+from\s+(?:the\s+)?employers?)\b/i
  const wantsNoAgencies = AGENCY_RE.test(original)
  if (wantsNoAgencies) original = original.replace(AGENCY_RE, ' ')
  const skipHit = SKIP_RE.exec(original)
  if (skipHit) {
    // ⚠️ A COMMA ENDS AN EXCLUSION LIST ONLY IF WHAT FOLLOWS IS ANOTHER FILTER.
    // "excluding TCS, newest first" read "newest first" as a second employer
    // (found by the history screen's 'Read as' strip). Items that open with a
    // filter phrase are handed back to the rest of the parser instead. Phrases
    // are narrow on purpose: "Top Glove" is an employer, "top" is not a filter.
    const items = skipHit[1].split(/,|\s+and\s+|\s+or\s+|\s+&\s+/i)
    const isFilter = (x: string) => /^\s*(newest|latest|most recent|sort(ed)? by|easy apply|quick apply|remote|posted|paying|entry[- ]level|fresher)\b/i.test(x)
    const names = items.filter((x) => !isFilter(x))
    const handedBack = items.filter(isFilter)
    v.skip = cleanSkip(names.join(','))
    original = original.replace(SKIP_RE, ` ${handedBack.join(' ')} `)
  }

  if (wantsNoAgencies) v.skip = cleanSkip(`${SKIP_AGENCIES},${v.skip}`)

  let s = ` ${original.toLowerCase().replace(/[,.;!?()]/g, ' ').replace(/\s+/g, ' ')} `
  const take = (re: RegExp) => { const hit = re.test(s); if (hit) s = s.replace(re, ' '); return hit }

  // Pay before the match-score pattern: "above 80 lakh" is pay, "above 80" is a score.
  const pay = PAY_RE.exec(s)
  if (pay) {
    const n = Number(pay[1])
    const lakh = /^cr|^crore/.test(pay[2]) ? n * 100 : n
    const floor = Math.floor(lakh)
    if (floor >= 1 && floor <= MAX_PAY_LAKH) v.pay = floor
    s = s.replace(PAY_RE, ' ').replace(/\b(paying|pay|salary|ctc|package|at least|minimum|min|more than|or more|above|over)\b/g, ' ')
  }

  if (take(/\b(remote (ok|okay|fine|also)|or remote|remote or \w+|hybrid or remote)\b/g)) { /* allowed, not required */ }
  if (take(/\b(fully remote|remote only|work from home|wfh|remote)\b/g)) v.remote = true
  if (take(/\b(easy apply|quick apply|one page apply|easy to apply)\b/g)) v.easy = true
  // Work mode the employer states. "hybrid or remote" was taken above as "remote is fine"; a bare "hybrid" or "on-site" is a request.
  if (take(/\b(hybrid)\b/g)) v.mode = 'hybrid'
  else if (take(/\b(on[- ]?site|onsite|in[- ]office|work from office|wfo)\b/g)) v.mode = 'onsite'

  // Posted windows, widest last so "this week" is not read as "today".
  if (take(/\b(past 3 days|last 3 days|past few days|last few days|couple of days|last three days|past three days)\b/g)) v.posted = '3'
  if (take(/\b(this week|past week|last week|last 7 days|past 7 days|within a week|in a week|last seven days)\b/g)) v.posted = '7'
  if (take(/\b(this month|past month|last month|last 30 days|past 30 days|within a month|in a month)\b/g)) v.posted = '30'
  if (take(/\b(posted today|last 24 hours|past 24 hours|past day|last day|today|fresh|just posted|new today)\b/g)) v.fresh = true

  if (take(/\b(entry level|entry-level|fresher|freshers|fresh graduate|new grad|new graduate|graduate role|no experience|0 ?(to|-) ?2 (years|yrs)|0-2 (years|yrs))\b/g)) v.level = 'entry'
  if (take(/\b(mid level|mid-level|midlevel|3 ?(to|-) ?5 (years|yrs)|3-5 (years|yrs))\b/g)) v.level = 'mid'
  if (take(/\b(senior level|senior-level|6\+ (years|yrs)|6 ?(to|-) ?10 (years|yrs)|10\+ (years|yrs))\b/g)) v.level = 'senior'

  if (take(/\b(intern(ship)?s?)\b/g)) v.type = 'intern'
  else if (take(/\b(part[- ]time)\b/g)) v.type = 'parttime'
  else if (take(/\b(contract basis|contractual|contract roles?|contract jobs?|contract work|freelance|temporary|c2h)\b/g)) v.type = 'contract'
  else if (take(/\b(full[- ]time|permanent)\b/g)) v.type = 'fulltime'

  if (take(/\b(newest first|latest first|most recent first|sort by newest|sorted by newest|newest|latest|most recent)\b/g)) v.sort = 'new'
  else if (take(/\b(highest paying|best paying|best paid|pay first|paid first|pay stated first|sort by pay|sorted by pay)\b/g)) v.sort = 'pay'
  else if (take(/\b(company a to z|a to z by company|alphabetical|alphabetically|sort by company|sorted by company|by company name)\b/g)) v.sort = 'company'
  if (take(/\b(?:(?:strong|high|good|best|top|great) (?:match|fit)|above 80|over 80|80 plus)\b|\b80\+|(?:^|\s)> ?80\b/g)) v.min80 = true

  // Longest city name first, so "navi mumbai" is not read as "mumbai".
  const names = CITIES.flatMap((c) => [c.name, ...(c.aliases ?? [])].map((n) => ({ n: n.toLowerCase(), c })))
    .sort((a, b) => b.n.length - a.n.length)
  for (const { n, c } of names) {
    const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (re.test(s)) { v.city = c.name; s = s.replace(re, ' '); break }
  }

  const words = s.split(' ').map((w) => w.trim()).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w))
  v.q = words.join(' ').slice(0, MAX_Q)
  return v
}

// ------------------------------------------------------------ conversation

/**
 * Words that mean "change what is on screen" rather than "start over". A typed
 * sentence REPLACES the whole view unless it opens with one of these — so a
 * stale preset can never silently survive a new request, which is the failure
 * this rule exists for: a preset chip left on as a hard filter turning a
 * 25-result search into 1.
 */
const REFINE_OPENERS = /^\s*(also|and also|and|plus|add|only|make it|now|but|just)\b[\s,:]*/i
const REMOVE_OPENERS = /^\s*(remove|drop|clear|ignore|forget|no more|without the|take off)\b[\s,:]*/i

/** What each word in "remove …" switches off. */
const REMOVABLE: [RegExp, (v: FeedView) => void][] = [
  [/\b(everything|all|filters|all filters|reset)\b/, (v) => Object.assign(v, EMPTY_VIEW)],
  [/\b(remote|wfh)\b/, (v) => { v.remote = false }],
  [/\b(easy|quick)\b/, (v) => { v.easy = false }],
  [/\b(fresh|today|24)\b/, (v) => { v.fresh = false }],
  [/\b(strong|match|80)\b/, (v) => { v.min80 = false }],
  [/\b(city|location|place)\b/, (v) => { v.city = '' }],
  [/\b(week|month|posted|date|days?)\b/, (v) => { v.posted = ''; v.fresh = false }],
  [/\b(entry|mid|senior|level|experience)\b/, (v) => { v.level = '' }],
  [/\b(intern|internship|contract|part|full|type)\b/, (v) => { v.type = '' }],
  [/\b(hybrid|onsite|on-site|office|mode)\b/, (v) => { v.mode = '' }],
  [/\b(pay|salary|lakh|lpa|ctc)\b/, (v) => { v.pay = 0 }],
  [/\b(employers?|compan(y|ies)|excluded|exclusion)\b/, (v) => { v.skip = '' }],
  [/\b(sort|newest|latest|order|alphabetical)\b/, (v) => { v.sort = '' }],
]

/**
 * Read a typed sentence against what is on screen now. "also remote" or "only
 * senior level" refines the current view; "remove remote" takes one filter off;
 * anything else is a fresh search that replaces the view. Pure.
 */
export function interpretFeedQuery(text: string, current: FeedView): FeedView {
  const rm = REMOVE_OPENERS.exec(text)
  if (rm) {
    const next = { ...current }
    const rest = text.slice(rm[0].length).toLowerCase()
    for (const [re, off] of REMOVABLE) if (re.test(rest)) off(next)
    return next
  }
  const rf = REFINE_OPENERS.exec(text)
  if (rf) {
    const add = parseFeedQuery(text.slice(rf[0].length))
    const next = { ...current }
    for (const k of ['min80', 'fresh', 'remote', 'easy'] as const) if (add[k]) next[k] = true
    if (add.city) next.city = add.city
    if (add.posted) next.posted = add.posted
    if (add.level) next.level = add.level
    if (add.type) next.type = add.type
    if (add.mode) next.mode = add.mode
    if (add.pay) next.pay = add.pay
    if (add.sort) next.sort = add.sort
    if (add.skip) next.skip = cleanSkip(`${next.skip},${add.skip}`)
    if (add.q) next.q = [...new Set(`${next.q} ${add.q}`.split(' ').filter(Boolean))].join(' ').slice(0, MAX_Q)
    return next
  }
  return parseFeedQuery(text)
}

// ------------------------------------------------------------ "why so few results"

export type FilterKey = 'min80' | 'fresh' | 'remote' | 'easy' | 'q' | 'city' | 'posted' | 'level' | 'type' | 'mode' | 'roleType' | 'only' | 'pay' | 'skip'
export const FILTER_KEYS: FilterKey[] = ['min80', 'fresh', 'remote', 'easy', 'q', 'city', 'posted', 'level', 'type', 'mode', 'roleType', 'only', 'pay', 'skip']

export function activeFilters(v: FeedView): FilterKey[] {
  return FILTER_KEYS.filter((k) => Boolean(v[k]))
}

/** The same view with one filter off. The sort is not a filter and is kept. */
export function withoutFilter(v: FeedView, k: FilterKey): FeedView {
  const next: FeedView = { ...v }
  if (k === 'min80' || k === 'fresh' || k === 'remote' || k === 'easy') next[k] = false
  else if (k === 'pay') next.pay = 0
  else next[k] = '' as never
  return next
}

/**
 * For each active filter: how many roles would show with ONLY that filter taken
 * off. `count` is the page's own pipeline run on a view, so the figure shown is
 * the figure the candidate will get, not an estimate. Only filters whose removal
 * adds roles are returned, the biggest gain first.
 */
export function relaxations(v: FeedView, count: (view: FeedView) => number): { key: FilterKey; count: number }[] {
  const now = count(v)
  return activeFilters(v)
    .map((key) => ({ key, count: count(withoutFilter(v, key)) }))
    .filter((r) => r.count > now)
    .sort((a, b) => b.count - a.count)
}

/** The view with every filter off except one (and the sort). */
export function onlyFilter(v: FeedView, k: FilterKey): FeedView {
  const next: FeedView = { ...EMPTY_VIEW, sort: v.sort }
  if (k === 'min80' || k === 'fresh' || k === 'remote' || k === 'easy') next[k] = v[k]
  else if (k === 'pay') next.pay = v.pay
  else next[k] = v[k] as never
  return next
}

/**
 * When taking any ONE filter off still leaves the list short, no single filter is
 * to blame — the combination is. Then the useful fact is how many roles each
 * filter leaves on its own, narrowest first: it shows which one is doing the
 * damage. Same `count` as relaxations(), so the figures are the real ones.
 */
export function soloCounts(v: FeedView, count: (view: FeedView) => number): { key: FilterKey; count: number }[] {
  return activeFilters(v)
    .map((key) => ({ key, count: count(onlyFilter(v, key)) }))
    .sort((a, b) => a.count - b.count)
}

// ------------------------------------------------------------ prompt chips

/**
 * Sentences to offer under the search box, built from the candidate's own
 * profile so each one is a search they would actually run. Clicking one fills
 * the box; it does not search, so it can be edited first.
 */
export function promptChips(p: { role?: string | null; city?: string | null; years?: number | null }): string[] {
  const role = (p.role ?? '').trim()
  const city = (p.city ?? '').trim()
  if (!role) return ['remote jobs posted this week', 'easy apply, posted today']
  const out = [
    city ? `${role} in ${city}` : role,
    `${role}, remote`,
    `${role} posted this week`,
    `${role}, easy apply`,
  ]
  if (p.years !== null && p.years !== undefined) {
    out.push(p.years <= 2 ? `entry level ${role}` : p.years >= 6 ? `${role}, senior level` : `${role}, mid level`)
  }
  out.push(`${role}, newest first`)
  return out.slice(0, 6)
}

// ------------------------------------------------------------ text filtering

export type RoleText = { title: string; company: string; location: string }

/** True when every query word (or its expansion) is in the title or company. */
export function matchesQuery(q: string, role: RoleText): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = ` ${role.title} ${role.company} `.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ')
  return words.every((w) => {
    const plain = w.replace(/[^a-z0-9+#]+/g, '')
    if (!plain) return true
    if (hay.includes(` ${plain}`)) return true
    const long = EXPAND[plain]
    return long ? long.split(' ').every((p) => hay.includes(` ${p}`)) : false
  })
}

/** The rows whose role passes the text query and the city. Rows with no text read are dropped only when a filter is on. */
export function applyTextFilter<R extends { role_id: string }>(
  rows: R[],
  view: Pick<FeedView, 'q' | 'city'>,
  text: Map<string, RoleText>,
): R[] {
  if (!view.q && !view.city) return rows
  const wantsCities = view.city ? view.city.split(',').map((c) => c.trim()).filter(Boolean).map((c) => resolveCity(c)?.name ?? c) : []
  return rows.filter((r) => {
    const t = text.get(r.role_id)
    if (!t) return false
    if (view.q && !matchesQuery(view.q, t)) return false
    if (wantsCities.length && !wantsCities.some((c) => matchLocation(c, t.location))) return false
    return true
  })
}

// ------------------------------------------------------------ drawer filters

/** Words that make a leading "Contract …" a job function ("Contract Manager"), not a job type. */
const CONTRACT_FUNCTION =
  /^(manag|admin|special|analy|coordinat|negotiat|lawyer|counsel|compliance|review|draft|lead|exec|officer|associate|support|operations|ops|accounting|billing|pricing|procure|sourcing|governance|lifecycle)/

/**
 * "contract" or "temp" used as a job-type MARKER rather than as part of a
 * function. Found by looking at a live feed (2026-10-07): "Manager Contract
 * Management" is contract management, not a contract. A marker is delimited —
 * "(Contract)", "- Contract", ", Contract" — or last in the title, or first
 * ("Contract Product Designer") unless the next word makes it a function.
 */
function hasContractMarker(t: string): boolean {
  for (const m of t.matchAll(/\b(contract|temp)\b/g)) {
    const at = m.index ?? 0
    const before = t.slice(0, at).trimEnd()
    const after = t.slice(at + m[0].length).trimStart()
    if (/[(\[\-–—,|:/]$/.test(before)) return true
    if (after === '' || /^[)\]]/.test(after)) return true
    if ((before === '' || /^(senior|sr\.?|junior|jr\.?)$/.test(before)) && !CONTRACT_FUNCTION.test(after)) return true
  }
  return false
}

/**
 * Job type, read from the title — the only place most postings say it.
 * Anything with no marker is "full-time", which is an inference, and the drawer
 * says so. Whole words only: "International" and "Internal" are not "intern",
 * "Temple" is not "temp", and "Contract Management" is not a contract.
 */
export function jobTypeOf(title: string): JobType {
  const t = title.toLowerCase()
  if (/\b(intern|interns|internship|internships)\b/.test(t)) return 'intern'
  if (/\bpart[- ]time\b/.test(t)) return 'parttime'
  if (/\b(contractor|c2h|contract[- ]to[- ]hire|fixed[- ]term|temporary)\b/.test(t)) return 'contract'
  return hasContractMarker(t) ? 'contract' : 'fulltime'
}

/** The years a posting asks for, banded: up to 2 is entry, 3–5 mid, 6 and over senior. */
export function levelOfYears(years: number): Level {
  return years <= 2 ? 'entry' : years <= 5 ? 'mid' : 'senior'
}

/** What the drawer filters need to know about each role. Each map is read only when its filter is on. */
export type DrawerFacts = {
  /** Title and employer — for job type and "leave out". */
  text: Map<string, RoleText>
  postedAt?: Map<string, string>
  /** Years asked, only where a confident requirement states them. */
  floors?: Map<string, number>
  /** Stated annual pay in rupees, only where the posting states it in rupees. */
  pays?: Map<string, number>
  /** Where the work happens, only where the employer's own system says. */
  modes?: Map<string, Mode>
  /** The contract type the employer's system states; roles absent fall back to the title. */
  types?: Map<string, JobType>
}

/** What a filter could not decide, so the page can say so instead of letting a count look like the market's answer. */
export type DrawerNotes = { undated: number; unstatedLevel: number; unstatedPay: number; unstatedMode: number }

/** True when a role's employer is one in the candidate's comma-separated list. Compared the way every other company match here is. */
function inCompanyList(company: string, list: string): boolean {
  const key = normaliseCompany(company)
  if (!key) return false
  return list.split(',').some((name) => {
    if (name.trim().toLowerCase() === SKIP_AGENCIES) return isStaffingAgency(company)
    const s = normaliseCompany(name)
    return s.length > 0 && (key === s || (s.length >= 4 && key.startsWith(s)))
  })
}

/**
 * Individual contributor or people manager, READ FROM THE TITLE ONLY — Jobinko has no field for "manages people", so
 * the words are the whole evidence and the drawer says so. A title is a manager's when it says head / director /
 * VP / chief / general manager / team lead / supervisor, or names a function's manager that is a people-leader in
 * practice (engineering, sales, operations, branch, regional, area, store, office, delivery). Everything else —
 * including "Product Manager", "Project Manager", "Account Manager" — is counted as an individual contributor.
 * Whole words only; "Headhunter" is not "head".
 */
export function roleTypeOf(title: string): RoleType {
  const t = title.toLowerCase()
  if (/\b(head of|head,|director|vp\b|vice president|chief|general manager|team lead|supervisor|managing)\b/.test(t) || /\bhead\b(?!\s*(count|hunter))/.test(t)) return 'manager'
  if (/\b(engineering|sales|operations|ops|branch|regional|area|store|office|delivery|business|plant|site|warehouse|hr)\s+manager\b/.test(t)) return 'manager'
  return 'ic'
}

/**
 * Narrow the rows by the drawer's filters. Pure; `now` is a parameter so
 * "posted in the last week" is testable.
 *
 * What each does with a role it cannot place — chosen so a filter never hides a
 * role for a reason the candidate cannot see:
 *   posted  — no posting date → left out (we cannot claim it is recent), counted.
 *   level   — states no requirement → KEPT (unknown is not "wrong level"), counted.
 *   pay     — states no pay → left out (that is what "stated pay" means), counted.
 *   mode    — the employer's system states no work mode → left out (we cannot claim it is hybrid), counted.
 *   type    — the stated contract type, else the title. skip — decided from the employer, which every role has.
 */
export function applyDrawerFilters<R extends { role_id: string }>(
  rows: R[],
  view: FeedView,
  facts: DrawerFacts,
  now: number = Date.now(),
): { rows: R[]; notes: DrawerNotes } {
  const notes: DrawerNotes = { undated: 0, unstatedLevel: 0, unstatedPay: 0, unstatedMode: 0 }
  if (!view.posted && !view.level && !view.type && !view.mode && !view.roleType && !view.only && !view.pay && !view.skip) return { rows, notes }
  const since = view.posted ? now - Number(view.posted) * 86_400_000 : 0
  const wantTypes = typesOf(view)
  const wantModes = modesOf(view)

  const kept = rows.filter((r) => {
    const id = r.role_id
    const text = facts.text.get(id)

    if (view.skip && text && inCompanyList(text.company, view.skip)) return false
    // "Only these employers": a role whose employer we cannot read cannot be shown to be one of them.
    if (view.only && !(text && inCompanyList(text.company, view.only))) return false
    if (view.roleType && text && roleTypeOf(text.title) !== view.roleType) return false
    // The contract type the employer's system states wins; the title is the fallback for the rest. Several may be allowed.
    if (wantTypes.length) {
      const have = facts.types?.get(id) ?? (text ? jobTypeOf(text.title) : null)
      if (!have || !wantTypes.includes(have)) return false
    }
    if (wantModes.length) {
      const m = facts.modes?.get(id)
      if (!m) { notes.unstatedMode++; return false }
      if (!wantModes.includes(m)) return false
    }

    if (view.posted) {
      const at = facts.postedAt?.get(id)
      const t = at ? Date.parse(at) : NaN
      if (Number.isNaN(t)) { notes.undated++; return false }
      if (t < since) return false
    }
    if (view.level) {
      const years = facts.floors?.get(id)
      if (years === undefined) notes.unstatedLevel++
      else if (levelOfYears(years) !== view.level) return false
    }
    if (view.pay) {
      const pay = facts.pays?.get(id)
      if (pay === undefined) { notes.unstatedPay++; return false }
      if (pay < view.pay * 100_000) return false
    }
    return true
  })
  return { rows: kept, notes }
}

// ------------------------------------------------------------ skills

export const MAX_SKILLS = 40

/**
 * Add or remove one skill, case-insensitively, keeping the candidate's own
 * spelling of the ones already there. Capped at the profile's own limit
 * (confirm-profile.ts accepts 40).
 */
export function toggleSkill(list: string[], skill: string, have: boolean): string[] {
  const s = skill.trim()
  if (!s) return list
  const without = list.filter((x) => x.trim().toLowerCase() !== s.toLowerCase())
  if (!have) return without
  if (without.length !== list.length) return list // already there
  return [...list, s].slice(0, MAX_SKILLS)
}
