import { describe, it, expect } from 'vitest'
import { formatRevenue, isBusiness, latestRevenue, normaliseCompany, pickCompany } from '../company-facts'

const ent = (id: string, label: string, p31: string[], extra: Record<string, unknown[]> = {}, aliases: string[] = [], links = 0) => ({
  id,
  sitelinks: Object.fromEntries(Array.from({ length: links }, (_, i) => [`w${i}`, {}])),
  labels: { en: { value: label } },
  aliases: { en: aliases.map((value) => ({ value })) },
  claims: Object.fromEntries([
    ['P31', p31.map((q) => ({ mainsnak: { datavalue: { value: { id: q } } } }))],
    ...Object.entries(extra).map(([p, vs]) => [p, vs.map((value) => ({ mainsnak: { datavalue: { value } } }))]),
  ]),
})

describe('pickCompany — the right company or none', () => {
  it('picks the single business with the same name (probed shape, 2026-09-25)', () => {
    const razorpay = ent('Q109985545', 'Razorpay', ['Q4830453'])
    const lib = ent('Q107386383', 'razorpay', ['Q188860']) // a Python library
    expect(pickCompany('Razorpay', [razorpay, lib])?.id).toBe('Q109985545')
  })

  it('returns nothing when the name is a word, not a company', () => {
    expect(pickCompany('Zeta', [ent('Q729037', 'Zeta', ['Q34740']), ent('Q136062', 'Zeta', ['Q9135'])])).toBeNull()
  })

  it('returns nothing when two equally known businesses share the name', () => {
    expect(pickCompany('Acme', [ent('Q1', 'Acme', ['Q4830453'], {}, [], 4), ent('Q2', 'ACME Inc.', ['Q783794'], {}, [], 5)])).toBeNull()
  })

  it('takes the far more prominent one when names collide (ABB vs a Czech ABB, measured)', () => {
    const czech = ent('Q1', 'ABB', ['Q4830453'], {}, [], 1)
    const group = ent('Q52825', 'ABB Group', ['Q891723'], {}, ['ABB'], 60)
    expect(pickCompany('ABB', [czech, group])?.id).toBe('Q52825')
  })

  it('rejects a club that merely has an industry or headcount (DBS, measured)', () => {
    expect(pickCompany('DBS', [ent('Q7', 'DBS', ['Q847017'], { P452: [{ id: 'Q1' }], P1128: [{ amount: '+30' }] })])).toBeNull()
  })

  it('matches through legal suffixes and aliases', () => {
    expect(pickCompany('Groww', [ent('Q85764693', 'Groww Pvt. Ltd.', ['Q4830453'])])?.id).toBe('Q85764693')
    expect(pickCompany('Swiggy', [ent('Q9', 'Bundl Technologies', ['Q4830453'], {}, ['Swiggy'])])?.id).toBe('Q9')
  })

  it('prefers a real name match over a nickname (Walmart vs Walmart Canada, measured)', () => {
    const walmart = { ...ent('Q483551', '', ['Q891723'], {}, [], 120), labels: { mul: { value: 'Walmart' } } }
    const canada = ent('Q1645718', 'Walmart Canada', ['Q658255'], {}, ['Walmart'], 6)
    expect(pickCompany('Walmart', [canada, walmart])?.id).toBe('Q483551')
  })

  it('never lets a nickname pick a non-company (RSM → Sisters of Mercy, measured)', () => {
    const sisters = ent('Q1', 'Sisters of Mercy', ['Q2061186'], { P1128: [{ amount: '+5000' }] }, ['RSM'])
    expect(pickCompany('RSM', [sisters])).toBeNull()
  })

  it('treats a listed organisation as a business even without the class, but not a staffed one', () => {
    expect(isBusiness(ent('Q5', 'X', ['Q43229'], { P414: [{ id: 'Q13677' }] }))).toBe(true)
    expect(isBusiness(ent('Q6', 'X', ['Q43229'], { P1128: [{ amount: '+9' }] }))).toBe(false)
  })
})

describe('normaliseCompany', () => {
  it('drops suffixes, punctuation and case', () => {
    expect(normaliseCompany('Tata Consultancy Services Ltd.')).toBe('tataconsultancyservices')
    expect(normaliseCompany('Groww India Pvt Ltd')).toBe('groww')
  })
})

describe('latestRevenue', () => {
  const claim = (amount: string, unit: string, year?: number, rank: 'normal' | 'deprecated' = 'normal') => ({
    rank,
    mainsnak: { datavalue: { value: { amount, unit: `http://www.wikidata.org/entity/${unit}` } } },
    qualifiers: year ? { P585: [{ datavalue: { value: { time: `+${year}-12-31T00:00:00Z` } } }] } : undefined,
  })
  it('takes the most recent dated figure, in a currency we can state', () => {
    expect(latestRevenue([claim('+3000000000', 'Q4917', 2022), claim('+4500000000', 'Q4917', 2024), claim('+4000000000', 'Q4917', 2023)])).toEqual({ amount: 4_500_000_000, currency: 'USD', year: 2024 })
  })
  it('ignores a deprecated claim, another currency, a zero and junk', () => {
    expect(latestRevenue([claim('+9000000000', 'Q4917', 2025, 'deprecated'), claim('+5', 'Q99999', 2024), claim('+0', 'Q4917', 2024), claim('x', 'Q4917', 2024)])).toBeNull()
  })
  it('says nothing for nothing', () => {
    expect(latestRevenue(undefined)).toBeNull()
    expect(latestRevenue([])).toBeNull()
  })
  it('writes each currency the way it is written', () => {
    expect(formatRevenue({ amount: 4_500_000_000, currency: 'USD', year: 2024 })).toBe('$4.5B')
    expect(formatRevenue({ amount: 900_000_000, currency: 'EUR', year: null })).toBe('€900M')
    expect(formatRevenue({ amount: 12_000_000_000, currency: 'INR', year: 2024 })).toBe('₹1200 crore')
  })
})
