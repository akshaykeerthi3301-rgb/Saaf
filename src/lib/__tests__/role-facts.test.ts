import { describe, it, expect } from 'vitest'
import { jobTypeFromStated, payFromRow } from '../role-facts'

const row = (o: Partial<Parameters<typeof payFromRow>[0]> = {}) => ({ pay_min: 1_800_000, pay_max: 2_400_000, pay_currency: 'INR', pay_period: 'year' as const, ...o })

describe('payFromRow', () => {
  it('reads a rupee range the way the card reads every other', () => {
    expect(payFromRow(row())?.text).toBe('₹18–24 LPA')
  })
  it('accepts Postgres numerics that arrive as strings', () => {
    expect(payFromRow(row({ pay_min: '1800000', pay_max: '2400000' }))?.low).toBe(1_800_000)
  })
  it('a one-sided range reads as a single figure', () => {
    expect(payFromRow(row({ pay_max: null }))).toMatchObject({ low: 1_800_000, high: 1_800_000 })
  })
  it('reads dollars, and an hourly rate as per hour', () => {
    expect(payFromRow({ pay_min: 64_000, pay_max: 85_000, pay_currency: 'USD', pay_period: 'year' })?.text).toBe('$64K–85K/yr')
    expect(payFromRow({ pay_min: 10, pay_max: 15, pay_currency: 'USD', pay_period: 'hour' })?.text).toBe('$10–15/hr')
  })
  it('names any other currency by its code rather than dropping it', () => {
    expect(payFromRow({ pay_min: 90_000, pay_max: 110_000, pay_currency: 'SGD', pay_period: 'year' })?.text).toBe('SGD 90K–110K/yr')
  })
  it('says nothing when nothing, or half of it, is stored', () => {
    expect(payFromRow({ pay_min: null, pay_max: null, pay_currency: null, pay_period: null })).toBeNull()
    expect(payFromRow(row({ pay_currency: null }))).toBeNull()
    expect(payFromRow(row({ pay_period: null }))).toBeNull()
    expect(payFromRow(row({ pay_min: 'x', pay_max: null }))).toBeNull()
  })
})

describe('jobTypeFromStated', () => {
  it('maps the five stated types onto the feed’s four, and unknown to null', () => {
    expect(['fulltime', 'parttime', 'intern', 'contract', 'temporary', null].map((t) => jobTypeFromStated(t as never))).toEqual(['fulltime', 'parttime', 'intern', 'contract', 'contract', null])
  })
})
