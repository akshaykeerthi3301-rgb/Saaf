import { z } from 'zod'
import { CITIES, matchLocation, resolveCity } from '@/lib/taxonomy/locations'
import { normaliseCompany } from '@/lib/company-name'

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

export const POSTED_WINDOWS = ['3', '7', '30'] as const
export const LEVELS = ['entry', 'mid', 'senior'] as const
export const JOB_TYPES = ['fulltime', 'intern', 'contract', 'parttime'] as const

export type PostedWindow = (typeof POSTED_WINDOWS)[number]
export type Level = (typeof LEVELS)[number]
export type JobType = (typeof JOB_TYPES)[number]

export type FeedView = {
  min80: boolean
  fresh: boolean
  remote: boolean
  easy: boolean
  /** Words that must appear in the role title or company name. */
  q: string
  /** A city name; matched with the same alias rules the scorer uses. */
  city: string
  /** Posted within this many days, by the employer's own date. '' = any. */
  posted: PostedWindow | ''
  /** The years the posting asks for, banded. Roles that state none are kept. '' = any. */
  level: Level | ''
  /** Read from the title. '' = any. */
  type: JobType | ''
  /** Minimum STATED annual pay in lakh rupees; roles that state no pay are left out. 0 = off. */
  pay: number
  /** Employers to leave out, comma-separated, in the candidate's own spelling. */
  skip: string
  /** '' = best match first. */
  sort: 'new' | ''
}

export const EMPTY_VIEW: FeedView = {
  min80: false, fresh: false, remote: false, easy: false, q: '', city: '',
  posted: '', level: '', type: '', pay: 0, skip: '', sort: '',
}

const MAX_Q = 80
export const MAX_PAY_LAKH = 500
export const MAX_SKIP = 10
export const MAX_SKIP_NAME = 40

const pick = <T extends string>(list: readonly T[], v: string | undefined): T | '' =>
  list.includes(v as T) ? (v as T) : ''

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
    city: (p.city ?? '').trim().slice(0, 60),
    posted: pick(POSTED_WINDOWS, p.posted),
    level: pick(LEVELS, p.level),
    type: pick(JOB_TYPES, p.type),
    pay: cleanPay(p.pay),
    skip: cleanSkip(p.skip ?? ''),
    sort: p.sort === 'new' ? 'new' : '',
  }
}

/** A view as the params that would rebuild it — the inverse of viewFromParams. */
export function viewToParams(v: FeedView): Record<string, string | undefined> {
  return {
    min80: v.min80 ? '1' : undefined, fresh: v.fresh ? '1' : undefined,
    remote: v.remote ? '1' : undefined, easy: v.easy ? '1' : undefined,
    q: v.q || undefined, city: v.city || undefined,
    posted: v.posted || undefined, level: v.level || undefined, type: v.type || undefined,
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
    q: str('q'), city: str('city'), posted: str('posted'), level: str('level'), type: str('type'),
    // Pay is the one field stored as a number; every other field must be text.
    pay: typeof o.pay === 'number' ? String(o.pay) : str('pay'),
    skip: str('skip'), sort: str('sort'),
  })
}

/** The boundary for a view sent from the browser (saveFilter). Strict: unknown keys are refused. */
export const feedViewSchema = z.object({
  min80: z.boolean(), fresh: z.boolean(), remote: z.boolean(), easy: z.boolean(),
  q: z.string().max(MAX_Q), city: z.string().max(60),
  posted: z.enum(['', ...POSTED_WINDOWS]),
  level: z.enum(['', ...LEVELS]),
  type: z.enum(['', ...JOB_TYPES]),
  pay: z.number().int().min(0).max(MAX_PAY_LAKH),
  skip: z.string().max(MAX_SKIP * (MAX_SKIP_NAME + 1)),
  sort: z.enum(['', 'new']),
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
  if (v.pay) out.push(['pay', String(v.pay)])
  if (v.skip) out.push(['skip', v.skip])
  return out
}

export function isEmptyView(v: FeedView): boolean {
  return !v.min80 && !v.fresh && !v.remote && !v.easy && !v.q && !v.city &&
    !v.posted && !v.level && !v.type && !v.pay && !v.skip && !v.sort
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
])

/**
 * A typed sentence → the view the pills would set, plus words to match.
 *
 * Deterministic on purpose: "remote", "easy apply", "posted today", "strong
 * match" and a city name are recognised; every other meaningful word becomes
 * the title/company query. Whatever was understood is shown back as pills the
 * candidate can remove, so a misreading is visible and one click undoes it.
 *
 * "remote ok" / "or remote" means remote is ALLOWED, not required, so it does
 * not switch on "Remote only" — the pill that hides every office role.
 */
export function parseFeedQuery(text: string): FeedView {
  let s = ` ${text.toLowerCase().replace(/[,.;!?()]/g, ' ').replace(/\s+/g, ' ')} `
  const v: FeedView = { ...EMPTY_VIEW }
  const take = (re: RegExp) => { const hit = re.test(s); if (hit) s = s.replace(re, ' '); return hit }

  if (take(/\b(remote (ok|okay|fine|also)|or remote|remote or \w+|hybrid or remote)\b/g)) { /* allowed, not required */ }
  if (take(/\b(fully remote|remote only|work from home|wfh|remote)\b/g)) v.remote = true
  if (take(/\b(easy apply|quick apply|one page apply|easy to apply)\b/g)) v.easy = true
  if (take(/\b(posted today|last 24 hours|past 24 hours|past day|last day|today|fresh|just posted|new today)\b/g)) v.fresh = true
  if (take(/\b((strong|high|good|best|top|great) (match|fit)|above 80|over 80|80\+|80 plus|> ?80)\b/g)) v.min80 = true

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
  const wantsCity = view.city ? resolveCity(view.city)?.name ?? view.city : ''
  return rows.filter((r) => {
    const t = text.get(r.role_id)
    if (!t) return false
    if (view.q && !matchesQuery(view.q, t)) return false
    if (wantsCity && !matchLocation(wantsCity, t.location)) return false
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
}

/** What a filter could not decide, so the page can say so instead of letting a count look like the market's answer. */
export type DrawerNotes = { undated: number; unstatedLevel: number; unstatedPay: number }

/** True when a role's employer is one the candidate named. Compared the way every other company match here is. */
function isSkipped(company: string, skip: string): boolean {
  const key = normaliseCompany(company)
  if (!key) return false
  return skip.split(',').some((name) => {
    const s = normaliseCompany(name)
    return s.length > 0 && (key === s || (s.length >= 4 && key.startsWith(s)))
  })
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
 *   type, skip — decided from the title and employer, which every role has.
 */
export function applyDrawerFilters<R extends { role_id: string }>(
  rows: R[],
  view: FeedView,
  facts: DrawerFacts,
  now: number = Date.now(),
): { rows: R[]; notes: DrawerNotes } {
  const notes: DrawerNotes = { undated: 0, unstatedLevel: 0, unstatedPay: 0 }
  if (!view.posted && !view.level && !view.type && !view.pay && !view.skip) return { rows, notes }
  const since = view.posted ? now - Number(view.posted) * 86_400_000 : 0

  const kept = rows.filter((r) => {
    const id = r.role_id
    const text = facts.text.get(id)

    if (view.skip && text && isSkipped(text.company, view.skip)) return false
    if (view.type && (!text || jobTypeOf(text.title) !== view.type)) return false

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
