import { describe, it, expect } from 'vitest'
import { managementAbove12L, annualInr } from '../management'

const yes = ['Director - Product', 'Senior Director, Finance', 'Associate Director - Risk', 'Vice President, Engineering', 'AVP - Credit Risk', 'Assistant Vice President - Operations',
  'General Manager - Supply Chain', 'DGM Finance', 'Deputy General Manager - Procurement', 'AGM - Marketing', 'Chief Financial Officer', 'Head of Product', 'Head - Data Analytics',
  'Senior Manager, Programme Management', 'Engineering Manager', 'Manager II - Finance', 'Product Manager', 'Finance Manager', 'Supply Chain Manager', 'Regional Director, Retail',
  'Partner - Strategy', 'Group Manager - Brand', 'Senior Manager - Sales Strategy', 'BLG - Zonal Business Head - Business Banking Group (BBG)', 'Head - Security']
const no = ['Branch Manager', 'Branch Manager - Retail Banking', 'Relationship Manager', 'Assistant Manager - Accounts', 'Deputy Manager Finance', 'Associate Manager - HR', 'Manager Trainee',
  'Store Manager', 'Manager', 'Sales Officer', 'Collections Manager', 'Software Engineer', 'Principal Engineer', 'Staff Software Engineer', 'Senior Executive - Finance', 'Executive Assistant',
  'Branch Head', 'Showroom Manager', 'Retail Operations Manager', 'Sales Manager - Business Loans - Jodhpur', 'Premier Acquisition Manager-Business Banking_Sales-Surat', 'Credit Manager - Business Loans', 'Head Chef', 'Food & Beverage Manager', 'Senior Manager - Branch Banking']

describe('management roles above 12 LPA (title guess)', () => {
  it.each(yes)('keeps %s', (title) => expect(managementAbove12L({ title })).toBe(true))
  it.each(no)('drops %s', (title) => expect(managementAbove12L({ title })).toBe(false))

  it('lets stated pay overrule the title, in either direction', () => {
    expect(managementAbove12L({ title: 'Branch Manager', pay: { min: 1_500_000, max: 1_800_000, currency: 'INR', period: 'year' } })).toBe(true)
    expect(managementAbove12L({ title: 'Director - Product', pay: { min: 700_000, max: 900_000, currency: 'INR', period: 'year' } })).toBe(false)
  })

  it('annualises pay: monthly × 12, USD at the fixed screening rate; unknown currency is no evidence', () => {
    expect(annualInr({ min: null, max: 100_000, currency: 'INR', period: 'month' })).toBe(1_200_000)
    expect(annualInr({ min: 20_000, max: 30_000, currency: 'USD', period: 'year' })).toBe(2_550_000)
    expect(annualInr({ min: 1, max: 2, currency: 'XYZ', period: 'year' })).toBeNull()
    expect(annualInr({ min: 1, max: 2, currency: 'INR', period: 'hour' })).toBeNull()
  })
})
