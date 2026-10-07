/**
 * What the ATS providers' OWN APIs say about pay, where the work happens and the
 * kind of contract — read, never estimated (TASK-176, TASK-210).
 *
 * Measured 2026-10-08 (scripts/probe-provider-fields.ts) on the four largest
 * boards per provider, all postings: Lever and Ashby state a work mode on ~100%
 * of postings and an employment type on 94–100%; Workable states an employment
 * type on 87% and a remote flag on 15% (true only); Greenhouse's list carries
 * neither but returns `pay_input_ranges` when asked (`pay_transparency=true`);
 * pay is structured on roughly 1% of Indian postings. No provider publishes a
 * company size, so none is offered.
 *
 * Every function returns null for "not stated" — never a default. A boolean
 * `false` ("not remote") is NOT a statement that the job is on-site, and a pay
 * range outside plausible bounds is dropped rather than shown.
 */
export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type EmploymentType = 'fulltime' | 'parttime' | 'contract' | 'intern' | 'temporary'
export type RolePay = { min: number | null; max: number | null; currency: string; period: 'year' | 'month' | 'hour' }

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const text = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')
const numOf = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/** "Remote", "OnSite", "on-site", "hybrid"… ; "unspecified" and anything else is null. */
export function workModeFrom(v: unknown): WorkMode | null {
  const t = text(v).replace(/[\s_-]+/g, '')
  if (t === 'remote' || t === 'fullyremote') return 'remote'
  if (t === 'hybrid') return 'hybrid'
  if (t === 'onsite' || t === 'inoffice' || t === 'office') return 'onsite'
  return null
}

/** "Full-time Employment", "FullTime", "fulltime_fixed_term", "Contractor", "Part-time"… */
export function employmentTypeFrom(v: unknown): EmploymentType | null {
  const t = text(v).replace(/[\s_-]+/g, '')
  if (!t) return null
  if (/intern|trainee|apprentice/.test(t)) return 'intern'
  if (/parttime/.test(t)) return 'parttime'
  if (/temp|seasonal/.test(t)) return 'temporary'
  if (/contract|freelance|consult/.test(t)) return 'contract'
  if (/fulltime|permanent|regular/.test(t)) return 'fulltime'
  return null
}

/** A range is kept only if it could be pay: ordered, positive, and inside bounds for its currency and period. */
export function sanePay(p: RolePay | null): RolePay | null {
  if (!p) return null
  let { min, max } = p
  if (min === null && max === null) return null
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  const top = max ?? min!
  const low = min ?? max!
  const inr = p.currency === 'INR'
  const bounds = { year: inr ? [50_000, 100_000_000] : [10_000, 5_000_000], month: inr ? [5_000, 5_000_000] : [800, 400_000], hour: inr ? [50, 20_000] : [5, 2_000] }[p.period]
  if (low < bounds[0] || top > bounds[1] || low <= 0) return null
  return { min, max, currency: p.currency, period: p.period }
}

/** Greenhouse `pay_input_ranges`: cents, one range per pay zone. Several zones in other currencies are ambiguous for an Indian role, so only an INR range, or a lone range, is used. */
export function payFromGreenhouse(ranges: unknown): RolePay | null {
  const list = arr(ranges).map(rec)
  const pick = list.find((r) => text(r.currency_type) === 'inr') ?? (list.length === 1 ? list[0] : undefined)
  if (!pick) return null
  const min = numOf(pick.min_cents), max = numOf(pick.max_cents)
  const cur = String(pick.currency_type ?? '').toUpperCase()
  if (!cur) return null
  // The field has no period. Cents of a yearly figure are in the millions; an hourly figure's are in the thousands.
  const lo = min === null ? null : min / 100, hi = max === null ? null : max / 100
  const top = hi ?? lo ?? 0
  return sanePay({ min: lo, max: hi, currency: cur, period: top >= (cur === 'INR' ? 50_000 : 10_000) ? 'year' : 'hour' })
}

/** Lever `salaryRange`: {min, max, currency, interval}. */
export function payFromLever(r: unknown): RolePay | null {
  const s = rec(r)
  const interval = text(s.interval)
  const period = /year/.test(interval) ? 'year' : /month/.test(interval) ? 'month' : /hour/.test(interval) ? 'hour' : null
  const cur = String(s.currency ?? '').toUpperCase()
  if (!period || !cur) return null
  return sanePay({ min: numOf(s.min), max: numOf(s.max), currency: cur, period })
}

/** Ashby `compensation.compensationTiers[].components[]`: a salary component with an interval like "1 YEAR". One tier, or the tier titled for India. */
export function payFromAshby(comp: unknown, locationHint = ''): RolePay | null {
  const tiers = arr(rec(comp).compensationTiers).map(rec)
  const here = tiers.find((t) => locationHint && text(t.title) && locationHint.toLowerCase().includes(text(t.title)))
  const tier = here ?? (tiers.length === 1 ? tiers[0] : undefined)
  const c = arr(tier?.components).map(rec).find((x) => text(x.compensationType) === 'salary')
  if (!c) return null
  const interval = text(c.interval)
  const period = /year/.test(interval) ? 'year' : /month/.test(interval) ? 'month' : /hour/.test(interval) ? 'hour' : null
  const cur = String(c.currencyCode ?? '').toUpperCase()
  if (!period || !cur) return null
  return sanePay({ min: numOf(c.minValue), max: numOf(c.maxValue), currency: cur, period })
}

/** Recruitee `salary`: {min, max, period, currency}, every key present and usually null. */
export function payFromRecruitee(s: unknown): RolePay | null {
  const o = rec(s)
  const period = text(o.period) === 'year' ? 'year' : text(o.period) === 'month' ? 'month' : text(o.period) === 'hour' ? 'hour' : null
  const cur = String(o.currency ?? '').toUpperCase()
  if (!period || !cur) return null
  return sanePay({ min: numOf(o.min), max: numOf(o.max), currency: cur, period })
}

/** For a provider that states "remote" and "hybrid" as separate flags: only a positive flag is a statement. */
export function workModeFromFlags(f: { remote?: unknown; hybrid?: unknown; onSite?: unknown }): WorkMode | null {
  if (f.hybrid === true) return 'hybrid'
  if (f.remote === true) return 'remote'
  if (f.onSite === true) return 'onsite'
  return null
}
