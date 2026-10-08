import { formatStatedPay, type StatedPay } from '@/lib/stated-pay'
import type { JobType } from '@/lib/feed-query'

/**
 * What a role's own provider stated about pay, work mode and contract type
 * (migration 0041; written by the ingest from ingest/providers/fields.ts).
 * Pure: turning a stored row into what the screens show.
 */
export type RoleFactsRow = {
  pay_min: number | string | null
  pay_max: number | string | null
  pay_currency: string | null
  pay_period: 'year' | 'month' | 'hour' | null
  work_mode: 'remote' | 'hybrid' | 'onsite' | null
  employment_type: 'fulltime' | 'parttime' | 'contract' | 'intern' | 'temporary' | null
}

export const ROLE_FACT_COLUMNS = 'pay_min, pay_max, pay_currency, pay_period, work_mode, employment_type'

const num = (v: number | string | null) => (v === null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

/** The stated pay as a StatedPay (the shape cards, the panel, the filter and the JSON-LD already use), or null. */
export function payFromRow(r: Pick<RoleFactsRow, 'pay_min' | 'pay_max' | 'pay_currency' | 'pay_period'>): StatedPay | null {
  const min = num(r.pay_min), max = num(r.pay_max)
  if (!r.pay_currency || !r.pay_period || (min === null && max === null)) return null
  const low = min ?? max!, high = max ?? min!
  return { text: formatStatedPay(r.pay_currency, low, high, r.pay_period), currency: r.pay_currency, low, high, period: r.pay_period }
}

/** The feed's job-type words from a stated contract type. A temporary job is filed with contract: the feed has no fifth option. */
export function jobTypeFromStated(t: RoleFactsRow['employment_type']): JobType | null {
  return t === 'fulltime' ? 'fulltime' : t === 'parttime' ? 'parttime' : t === 'intern' ? 'intern' : t === 'contract' || t === 'temporary' ? 'contract' : null
}

/**
 * schema.org / Google JobPosting vocabulary for the stated contract type
 * (developers.google.com/search/docs/appearance/structured-data/job-posting, fetched 2026-10-08:
 * FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN, …). Undefined when the provider stated nothing —
 * the field is then left out, never guessed.
 */
export function googleEmploymentType(t: RoleFactsRow['employment_type']): 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY' | 'INTERN' | undefined {
  return t === 'fulltime' ? 'FULL_TIME' : t === 'parttime' ? 'PART_TIME' : t === 'contract' ? 'CONTRACTOR' : t === 'temporary' ? 'TEMPORARY' : t === 'intern' ? 'INTERN' : undefined
}
