/**
 * Dates → months → total experience, and which role is current. Pure and model-free: the model may READ a date string,
 * it never does the arithmetic (docs/RESUME-PARSING-BLUEPRINT.md §2.3).
 *
 * Conventions, each deliberate:
 *  - Months are counted INCLUSIVE of both ends: "Jan 2021 – Mar 2021" is 3.
 *  - Months are a SET, so two jobs that overlap count each calendar month once. (Sum-of-spans is how a résumé with a
 *    side job inflates to a decade.)
 *  - A year-only date is a range, not a guess: `low` assumes the shortest reading, `high` the longest, `mid` July.
 *  - Numeric `03/19` is read MONTH-FIRST (MM/YY). A résumé date has no day, so DD/MM cannot occur; `03/09` is still
 *    flagged ambiguous because it could be Mar 2009 or a mistyped Sep.
 */

export type Ym = { y: number; m: number | null }
export type Precision = 'month' | 'year' | 'ambiguous' | 'none'
export type Range = {
  start: Ym | null
  end: Ym | null
  open: boolean
  endToken: string | null
  /** "Jan 2021 –" with nothing after the dash. Not treated as current; reported. */
  endMissing: boolean
  precision: Precision
}

const MON =
  '\\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b'
const MONTH_NO = '(0?[1-9]|1[0-2])'
const POINT = new RegExp(
  // A DAY between month and year ("Jan 15, 2021") is skipped, never read as the year 2015.
  `${MON}\\.?[\\s,'’\\-/]*(?:\\d{1,2}[,\\s]+(?=(?:19|20)\\d{2}\\b))?((?:19|20)\\d{2}|\\d{2})(?!\\d)` + //  1,2  Jan 2021 · Jan'21 · Jan-21
    `|(?<![\\d/.])${MONTH_NO}[/.\\-](\\d{4}|\\d{2})(?![\\d/])` + //       3,4  03/2019 · 03/19
    `|((?:19|20)\\d{2})[/\\-]${MONTH_NO}(?!\\d)` + //                       5,6  2021-03
    `|((?:19|20)\\d{2})(?!\\d)` + //                                        7    2021
    `|\\b(present|current|currently|now|today|till date|till now|to date|ongoing)\\b`, //  8
  'gi',
)
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** 2-digit year pivot: up to next year → 20xx, otherwise 19xx. */
function fullYear(s: string, asOf: Date): number {
  if (s.length === 4) return Number(s)
  const yy = Number(s)
  return yy <= (asOf.getFullYear() % 100) + 1 ? 2000 + yy : 1900 + yy
}

export function parseRange(raw: string | null | undefined, asOf: Date): Range {
  const none: Range = { start: null, end: null, open: false, endToken: null, endMissing: false, precision: 'none' }
  if (!raw) return none
  const points: { ym: Ym | null; token: string | null; ambiguous: boolean }[] = []
  for (const m of raw.matchAll(POINT)) {
    if (m[8]) points.push({ ym: null, token: m[8], ambiguous: false })
    else if (m[1]) points.push({ ym: { y: fullYear(m[2], asOf), m: MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1 }, token: null, ambiguous: false })
    else if (m[3]) points.push({ ym: { y: fullYear(m[4], asOf), m: Number(m[3]) }, token: null, ambiguous: m[4].length === 2 && Number(m[4]) <= 12 })
    else if (m[5]) points.push({ ym: { y: Number(m[5]), m: Number(m[6]) }, token: null, ambiguous: false })
    else if (m[7]) points.push({ ym: { y: Number(m[7]), m: null }, token: null, ambiguous: false })
  }
  if (points.length === 0) return none
  const dated = points.filter((p) => p.ym)
  const now = points.find((p) => p.token)
  const start = dated[0]?.ym ?? null
  const trailingDash = /[–—-]\s*$/.test(raw.trim())
  // "2019 – 21": a four-digit year, a dash, and a bare two-digit year that the point reader cannot see on its own.
  const shortEnd = dated.length === 1 && !now ? raw.match(/(?:19|20)\d{2}\s*(?:[–—-]|\bto\b)\s*(\d{2})(?![\d/.\-])/i) : null
  let end: Ym | null = null
  let open = false
  let endToken: string | null = null
  let endMissing = false
  if (now) {
    open = true
    endToken = now.token
  } else if (dated.length >= 2) {
    end = dated[1].ym
  } else if (shortEnd && start) {
    const yy = Number(shortEnd[1])
    const century = Math.floor(start.y / 100) * 100
    end = { y: century + yy < start.y ? century + 100 + yy : century + yy, m: null }
  } else if (trailingDash) {
    endMissing = true
  } else {
    end = start // one date, no range: a point in time ("Summer 2019")
  }
  const ambiguous = dated.some((p) => p.ambiguous)
  const yearOnly = dated.some((p) => p.ym && p.ym.m === null)
  return { start, end, open, endToken, endMissing, precision: ambiguous ? 'ambiguous' : yearOnly ? 'year' : 'month' }
}

type Mode = 'low' | 'mid' | 'high'
const idx = (y: number, m: number) => y * 12 + (m - 1)
const asOfIdx = (asOf: Date) => idx(asOf.getFullYear(), asOf.getMonth() + 1)

/** The calendar months an entry covers, as indexes, or null when it has no usable start. */
export function monthSet(r: Range, asOf: Date, mode: Mode): Set<number> | null {
  if (!r.start) return null
  const cap = asOfIdx(asOf)
  const sm = r.start.m ?? (mode === 'high' ? 1 : mode === 'low' ? 12 : 7)
  const s = idx(r.start.y, sm)
  let e: number
  if (r.open) e = cap
  else if (r.end) e = idx(r.end.y, r.end.m ?? (mode === 'high' ? 12 : mode === 'low' ? 1 : 7))
  else return null
  e = Math.min(e, cap)
  if (s > cap) return new Set()
  // A pessimistic year-only reading of "2019 – 2019" would run backwards; a role is at least a month.
  e = Math.max(e, s)
  const out = new Set<number>()
  for (let i = s; i <= e; i++) out.add(i)
  return out
}

export function monthsOf(r: Range, asOf: Date): { low: number; mid: number; high: number } | null {
  const lo = monthSet(r, asOf, 'low')
  const mid = monthSet(r, asOf, 'mid')
  const hi = monthSet(r, asOf, 'high')
  if (!lo || !mid || !hi) return null
  return { low: lo.size, mid: mid.size, high: hi.size }
}

/** Distinct calendar months across all ranges — overlaps counted once. */
export function unionMonths(ranges: Range[], asOf: Date): { low: number; mid: number; high: number; gaps: { after: string; months: number; startIdx: number }[] } {
  const sets = (['low', 'mid', 'high'] as const).map((mode) => {
    const all = new Set<number>()
    for (const r of ranges) for (const i of monthSet(r, asOf, mode) ?? []) all.add(i)
    return all
  })
  // Gaps over 3 months, read from the middle reading. Reported, never subtracted or hidden.
  const gaps: { after: string; months: number; startIdx: number }[] = []
  const sorted = [...sets[1]].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    const missing = sorted[i] - sorted[i - 1] - 1
    if (missing > 3) gaps.push({ after: `${Math.floor(sorted[i - 1] / 12)}-${String((sorted[i - 1] % 12) + 1).padStart(2, '0')}`, months: missing, startIdx: sorted[i - 1] + 1 })
  }
  return { low: sets[0].size, mid: sets[1].size, high: sets[2].size, gaps }
}

/** `weak` counts what is missing — no employer, a bare year for a date. Real roles, but the more is missing the less they may win a tie. */
export type RoleCandidate = { open: boolean; range: Range; employmentType: string; order: number; weak?: number }

/**
 * Which role is current. Rules, in order (blueprint §2.3):
 *  1. open-ended roles are candidates; 2. if several, drop freelance/part-time/advisory/volunteer WHEN a full-time-looking
 *  one remains; 3. latest start wins; tie → first listed. Nothing open → no current role; `latest` is the latest end.
 */
export function pickRoles(c: RoleCandidate[], asOf: Date): { current: number | null; latest: number | null; concurrent: boolean; recentlyEnded: boolean } {
  const startKey = (r: Range) => (r.start ? idx(r.start.y, r.start.m ?? 7) : -1)
  const open = c.map((x, i) => ({ x, i })).filter(({ x }) => x.open)
  if (open.length > 0) {
    const primary = open.filter(({ x }) => x.employmentType === 'unknown')
    const pool = primary.length > 0 ? primary : open
    pool.sort((a, b) => startKey(b.x.range) - startKey(a.x.range) || (a.x.weak ?? 0) - (b.x.weak ?? 0) || a.x.order - b.x.order)
    return { current: pool[0].i, latest: pool[0].i, concurrent: open.length > 1, recentlyEnded: false }
  }
  const ended = c
    .map((x, i) => ({ x, i, e: x.range.end ? idx(x.range.end.y, x.range.end.m ?? 7) : -1 }))
    .filter((r) => r.e >= 0)
    .sort((a, b) => b.e - a.e || (a.x.weak ?? 0) - (b.x.weak ?? 0) || a.x.order - b.x.order)
  if (ended.length === 0) return { current: null, latest: null, concurrent: false, recentlyEnded: false }
  return { current: null, latest: ended[0].i, concurrent: false, recentlyEnded: asOfIdx(asOf) - ended[0].e <= 3 }
}
