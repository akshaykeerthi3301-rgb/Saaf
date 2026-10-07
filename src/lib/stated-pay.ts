/**
 * Pay, only as the posting states it (Phase 16, 2026-09-25; Jobright shows pay
 * on most cards — OBSERVED — because US postings must state it).
 *
 * ⚠️ READ, NEVER ESTIMATED. This returns a figure only when the employer wrote
 * one next to a pay word. It does not guess a band for the other ~98% of
 * postings (2.2% stated pay when measured, PROJECT-STATE Stage T) — a guessed
 * salary on a card is an invented number, and the one a candidate anchors on.
 *
 * ⚠️ FALSE POSITIVES ARE THE REAL RISK. Postings are full of money that is not
 * pay: "₹500 crore revenue", "raised $50M", "$2B in payments processed". So a
 * figure counts only if (a) a pay word sits within 50 characters before it, or
 * (b) it carries a pay unit of its own (LPA, lakhs per annum, /yr, per month).
 * Crore, million and billion amounts are never pay here.
 */

export type StatedPay = { text: string; currency: string; low: number; high: number; period: 'year' | 'month' | 'hour' }

const PAY_WORD = /(salary|ctc|compensation|pay|package|stipend|remuneration|base|ote|earn|offer(?:ing)?|range|band)\b[^.\n]{0,50}$/i

const NUM = String.raw`(\d{1,3}(?:[,\s]\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?)`

const PATTERNS: { re: RegExp; currency: StatedPay['currency'] }[] = [
  { re: new RegExp(String.raw`(?:₹|rs\.?|inr)\s*${NUM}\s*(k|l|lakhs?|lacs?|lpa)?\s*(?:-|–|—|to)\s*(?:₹|rs\.?|inr)?\s*${NUM}\s*(k|l|lakhs?|lacs?|lpa)?(\s*(?:lpa|per annum|p\.?a\.?|a year|per year|\/yr|annually|per month|\/month|pm|a month))?`, 'gi'), currency: 'INR' },
  { re: new RegExp(String.raw`${NUM}\s*(?:-|–|—|to)\s*${NUM}\s*(lpa|lakhs?(?:\s*per annum)?|lacs?)`, 'gi'), currency: 'INR' },
  { re: new RegExp(String.raw`(?:₹|rs\.?|inr)\s*${NUM}\s*(k|l|lakhs?|lacs?|lpa)?(\s*(?:lpa|per annum|p\.?a\.?|a year|per year|\/yr|annually|per month|\/month|a month))?`, 'gi'), currency: 'INR' },
  { re: new RegExp(String.raw`${NUM}\s*(lpa)\b`, 'gi'), currency: 'INR' },
  { re: new RegExp(String.raw`(\$|usd\s*)${NUM}\s*(k)?\s*(?:-|–|—|to)\s*\$?${NUM}\s*(k)?(\s*(?:per year|a year|\/yr|annually|per annum|usd))?`, 'gi'), currency: 'USD' },
]

const num = (s: string) => Number(String(s).replace(/[,\s]/g, ''))

/** Normalise a figure to rupees (INR) or whole units, using its unit word. */
function scale(n: number, unit: string | undefined, currency: StatedPay['currency']): number {
  const u = (unit ?? '').toLowerCase()
  if (currency === 'INR' && /^(l|lakh|lakhs|lac|lacs|lpa)$/.test(u)) return n * 100_000
  if (u === 'k') return n * 1000
  return n
}

export function findStatedPay(description: string): StatedPay | null {
  const text = description.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  for (const { re, currency } of PATTERNS) {
    re.lastIndex = 0
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0
      const around = text.slice(at, at + m[0].length + 20).toLowerCase()
      if (/crore|cr\b|million|mn\b|billion|bn\b/.test(around)) continue
      const before = text.slice(Math.max(0, at - 60), at)
      const hasUnit = /lpa|lakh|lac|per annum|p\.?a\.?|a year|per year|\/yr|annually|per month|\/month|a month/i.test(m[0])
      if (!hasUnit && !PAY_WORD.test(before)) continue

      const parsed = parseMatch(m, currency)
      if (!parsed) continue
      const monthly = /per month|\/month|a month|\bpm\b/i.test(m[0])
      const { low, high } = parsed
      // Sanity bounds: below these it is a stipend-free number or a year count; above, not pay.
      const yearlyLow = monthly ? low * 12 : low
      if (currency === 'INR' && (yearlyLow < 50_000 || high > 50_000_000)) continue
      if (currency !== 'INR' && (yearlyLow < 10_000 || high > 2_000_000)) continue
      return { text: formatStatedPay(currency, low, high, monthly ? 'month' : 'year'), currency, low, high, period: monthly ? 'month' : 'year' }
    }
  }
  return null
}

function parseMatch(m: RegExpMatchArray, currency: StatedPay['currency']): { low: number; high: number } | null {
  const g = m.slice(1).filter((x) => x !== undefined)
  const nums = g.filter((x) => /^\d/.test(x.trim()))
  const units = g.filter((x) => /^(k|l|lakhs?|lacs?|lpa|lakhs? per annum)$/i.test(x.trim()))
  if (!nums.length) return null
  const unitOf = (i: number) => (units[i] ?? units[units.length - 1] ?? '').replace(/\s*per annum/i, '').trim()
  const lowRaw = num(nums[0])
  const highRaw = nums[1] !== undefined ? num(nums[1]) : lowRaw
  const low = scale(lowRaw, nums[1] !== undefined ? unitOf(0) : unitOf(0), currency)
  const high = scale(highRaw, unitOf(1), currency)
  if (!Number.isFinite(low) || !Number.isFinite(high) || low <= 0) return null
  return low <= high ? { low, high } : { low: high, high: low }
}

/** How a figure reads on a card: ₹12–18 LPA, ₹40,000/month, $64K–85K/yr, $10/hr. Any currency code the provider names. */
export function formatStatedPay(currency: string, low: number, high: number, period: 'year' | 'month' | 'hour'): string {
  const same = low === high
  if (currency === 'INR') {
    if (period === 'month' || period === 'hour') {
      const f = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
      const unit = period === 'month' ? 'month' : 'hr'
      return same ? `${f(low)}/${unit}` : `${f(low)}–${f(high)}/${unit}`
    }
    const l = (n: number) => (n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1).replace(/\.0$/, '')
    return same ? `₹${l(low)} LPA` : `₹${l(low)}–${l(high)} LPA`
  }
  const sym = ({ USD: '$', EUR: '€', GBP: '£' } as Record<string, string>)[currency] ?? `${currency} `
  const unit = period === 'year' ? 'yr' : period === 'month' ? 'mo' : 'hr'
  const f = (n: number) => (period === 'hour' ? String(Math.round(n * 100) / 100) : `${Math.round(n / 1000)}K`)
  return same ? `${sym}${f(low)}/${unit}` : `${sym}${f(low)}–${f(high)}/${unit}`
}
