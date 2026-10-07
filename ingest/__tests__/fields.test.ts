import { describe, it, expect } from 'vitest'
import {
  employmentTypeFrom, payFromAshby, payFromGreenhouse, payFromLever, payFromRecruitee, sanePay, workModeFrom, workModeFromFlags,
} from '../providers/fields'

describe('work mode — only what the provider positively says', () => {
  it.each([['Remote', 'remote'], ['onsite', 'onsite'], ['OnSite', 'onsite'], ['on-site', 'onsite'], ['Hybrid', 'hybrid'], ['fully remote', 'remote']])('%s → %s', (v, want) => {
    expect(workModeFrom(v)).toBe(want)
  })
  it.each(['unspecified', '', 'Flexible', null, undefined, 5])('%s is not stated', (v) => {
    expect(workModeFrom(v)).toBeNull()
  })
  it('a false flag is not "on-site"', () => {
    expect(workModeFromFlags({ remote: false, hybrid: false })).toBeNull()
    expect(workModeFromFlags({ remote: true })).toBe('remote')
    expect(workModeFromFlags({ remote: true, hybrid: true })).toBe('hybrid')
  })
})

describe('employment type', () => {
  it.each([
    ['Full-time Employment', 'fulltime'], ['FullTime', 'fulltime'], ['fulltime_permanent', 'fulltime'], ['fulltime_fixed_term', 'fulltime'], ['permanent', 'fulltime'],
    ['Part-time', 'parttime'], ['PartTime', 'parttime'], ['Contract', 'contract'], ['Contractor', 'contract'], ['Freelance', 'contract'],
    ['Intern', 'intern'], ['Internship', 'intern'], ['Temporary', 'temporary'],
  ])('%s → %s', (v, want) => { expect(employmentTypeFrom(v)).toBe(want) })
  it('says nothing for what it does not know', () => {
    for (const v of ['', 'Other', null, 'Volunteer']) expect(employmentTypeFrom(v)).toBeNull()
  })
})

describe('pay is dropped unless it could be pay', () => {
  it('orders a reversed range, and refuses zero, out of bounds and empty', () => {
    expect(sanePay({ min: 18, max: 12, currency: 'INR', period: 'year' })).toBeNull() // 18 rupees a year is not pay
    expect(sanePay({ min: 1_800_000, max: 1_200_000, currency: 'INR', period: 'year' })).toMatchObject({ min: 1_200_000, max: 1_800_000 })
    expect(sanePay({ min: null, max: null, currency: 'INR', period: 'year' })).toBeNull()
    expect(sanePay({ min: 0, max: 0, currency: 'USD', period: 'year' })).toBeNull()
    expect(sanePay({ min: 100, max: 900_000_000, currency: 'USD', period: 'year' })).toBeNull()
  })
  it('keeps an hourly rate in its own bounds', () => {
    expect(sanePay({ min: 10, max: 15, currency: 'USD', period: 'hour' })).not.toBeNull()
    expect(sanePay({ min: 10, max: 15, currency: 'USD', period: 'year' })).toBeNull()
  })
})

describe('Greenhouse pay_input_ranges (cents, no period)', () => {
  const usd = { min_cents: 10_880_000, max_cents: 14_960_000, currency_type: 'USD', title: 'Zone 3 Pay Range' }
  it('reads a lone range as a yearly figure in whole units', () => {
    expect(payFromGreenhouse([usd])).toEqual({ min: 108_800, max: 149_600, currency: 'USD', period: 'year' })
  })
  it('prefers an INR range among several zones', () => {
    const inr = { min_cents: 2_400_000_00, max_cents: 3_600_000_00, currency_type: 'INR' }
    expect(payFromGreenhouse([usd, { ...usd, currency_type: 'EUR' }, inr])).toMatchObject({ currency: 'INR', min: 2_400_000, max: 3_600_000 })
  })
  it('says nothing for several non-INR zones — which one applies to an Indian role is not stated', () => {
    expect(payFromGreenhouse([usd, { ...usd, min_cents: 9_000_000, title: 'Zone 4' }])).toBeNull()
  })
  it('says nothing for none, or for junk', () => {
    expect(payFromGreenhouse([])).toBeNull()
    expect(payFromGreenhouse(undefined)).toBeNull()
    expect(payFromGreenhouse([{ min_cents: 'x', currency_type: 'USD' }])).toBeNull()
  })
})

describe('Lever, Ashby, Recruitee', () => {
  it('Lever salaryRange with an interval', () => {
    expect(payFromLever({ min: 1_800_000, max: 2_400_000, currency: 'INR', interval: 'per-year-salary' })).toEqual({ min: 1_800_000, max: 2_400_000, currency: 'INR', period: 'year' })
    expect(payFromLever({ currency: 'INR', interval: 'per-year-salary' })).toBeNull()
  })
  const tiers = (list: { title: string; value: number }[]) => ({ compensationTiers: list.map((t) => ({ title: t.title, components: [{ compensationType: 'Salary', interval: '1 HOUR', currencyCode: 'USD', minValue: t.value, maxValue: t.value }] })) })
  it('Ashby: the tier titled for the job’s own place, else a lone tier, else nothing', () => {
    const c = tiers([{ title: 'India', value: 10 }, { title: 'Argentina', value: 15 }])
    expect(payFromAshby(c, 'Bengaluru, India')).toMatchObject({ min: 10, max: 10, period: 'hour' })
    expect(payFromAshby(c, 'Remote')).toBeNull()
    expect(payFromAshby(tiers([{ title: 'All', value: 12 }]), 'x')).toMatchObject({ min: 12 })
  })
  it('Recruitee strings, and nulls', () => {
    expect(payFromRecruitee({ min: '400000', max: '5825040', period: 'year', currency: 'INR' })).toEqual({ min: 400_000, max: 5_825_040, currency: 'INR', period: 'year' })
    expect(payFromRecruitee({ min: null, max: null, period: null, currency: null })).toBeNull()
    expect(payFromRecruitee({ min: '1', max: '5825040', period: 'year', currency: 'INR' })).toBeNull() // a minimum of one rupee is a form default, not pay
  })
})
