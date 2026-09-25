import { CITIES, matchLocation, resolveCity } from '@/lib/taxonomy/locations'

/**
 * The feed's view: which pills are on, plus a text query and a city.
 *
 * One shape for three features (2026-09-25, Phase 15 — gaps observed inside
 * Jobright, PROJECT-STATE Stage AG): the URL of /today, a saved filter, and the
 * sentence search. Keeping one shape means a saved filter and a typed sentence
 * can only ever produce views the pills could produce — nothing hidden, no
 * second filter language.
 *
 * Pure. No database, no model.
 */

export type FeedView = {
  min80: boolean
  fresh: boolean
  remote: boolean
  easy: boolean
  /** Words that must appear in the role title or company name. */
  q: string
  /** A city name; matched with the same alias rules the scorer uses. */
  city: string
}

export const EMPTY_VIEW: FeedView = { min80: false, fresh: false, remote: false, easy: false, q: '', city: '' }

const MAX_Q = 80

/** Read a view from /today's search params (or a saved filter). Unknown keys are ignored. */
export function viewFromParams(p: Record<string, string | undefined>): FeedView {
  return {
    min80: p.min80 === '1',
    fresh: p.fresh === '1',
    remote: p.remote === '1',
    easy: p.easy === '1',
    q: (p.q ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_Q),
    city: (p.city ?? '').trim().slice(0, 60),
  }
}

/** The query string for a view — whitelisted keys only, so a stored filter can never inject a link. */
export function viewToQuery(v: FeedView): string {
  const q = new URLSearchParams()
  for (const k of ['min80', 'fresh', 'remote', 'easy'] as const) if (v[k]) q.set(k, '1')
  if (v.q) q.set('q', v.q)
  if (v.city) q.set('city', v.city)
  return q.toString()
}

export function isEmptyView(v: FeedView): boolean {
  return !v.min80 && !v.fresh && !v.remote && !v.easy && !v.q && !v.city
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
