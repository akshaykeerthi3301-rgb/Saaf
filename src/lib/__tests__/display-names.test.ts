import { describe, it, expect } from 'vitest'
import { displayEmployer, displayCity } from '../display-names'

/**
 * ⚠️ EVERY CASE HERE WAS ON THE LIVE SHORTLIST ON 2026-09-14, and the counts
 * are how many indexed roles carried that name. This is not hypothetical
 * tidying: a candidate comparing us with Naukri saw "Wf" where Naukri shows
 * "Wells Fargo", on a product whose entire pitch is precision.
 */
describe('employer names', () => {
  it('corrects the high-volume slugs, from evidence in their own token', () => {
    expect(displayEmployer('Wf', 'wf.wd1.myworkdayjobs.com/wellsfargojobs')).toBe('Wells Fargo')
    expect(displayEmployer('Ag', 'ag.wd3.myworkdayjobs.com/Airbus')).toBe('Airbus')
    expect(displayEmployer('Genmills')).toBe('General Mills')
    expect(displayEmployer('Freseniusmedicalcare')).toBe('Fresenius Medical Care')
    expect(displayEmployer('Theapexgroup')).toBe('The Apex Group')
  })

  it('uppercases an initialism a title-caser ruined', () => {
    expect(displayEmployer('Jll')).toBe('JLL')
    expect(displayEmployer('Aecom')).toBe('AECOM')
  })

  it('strips the boilerplate an ATS appends', () => {
    expect(displayEmployer('Lenskartcareers')).toBe('Lenskart')
    expect(displayEmployer('Lilt Production')).toBe('Lilt')
    expect(displayEmployer('Soprasteria1')).toBe('Soprasteria')
  })

  it('leaves a correct name exactly alone', () => {
    /**
     * The failure mode that would be worse than the bug: a cleanup rule that
     * "fixes" names which were already right. Every one of these is how the
     * employer writes it.
     */
    for (const name of ['Nagarro', 'Paytm', 'Walmart', 'Trane Technologies', 'Turner & Townsend', 'NVIDIA', 'HARMAN', 'G2', 'Apna']) {
      expect(displayEmployer(name)).toBe(name)
    }
  })

  it('never invents a name it cannot ground', () => {
    // No token evidence and no override: the stored value stands. Guessing here
    // would be the fabrication the rest of the product refuses.
    expect(displayEmployer('Techbizglobal')).toBe('Techbiz')
    expect(displayEmployer('Zzqq Pvt')).toBe('Zzqq Pvt')
    expect(displayEmployer('')).toBe('')
    expect(displayEmployer(null)).toBe('')
  })
})

describe('city names', () => {
  it('shows one name for one city', () => {
    // Both appeared on adjacent cards, to a candidate who gave us one city.
    expect(displayCity('Bangalore')).toBe('Bengaluru')
    expect(displayCity('Bengaluru')).toBe('Bengaluru')
    expect(displayCity('Gurgaon')).toBe('Gurugram')
    expect(displayCity('Bombay')).toBe('Mumbai')
  })

  it('does not rewrite inside a phrase the posting wrote', () => {
    // "Hybrid in Bangalore" is the employer's sentence, not a city field.
    expect(displayCity('Hybrid in Bangalore')).toBe('Hybrid in Bangalore')
    expect(displayCity('Bangalore, Karnataka')).toBe('Bangalore, Karnataka')
  })

  it('leaves a city it has no opinion about', () => {
    expect(displayCity('Indore')).toBe('Indore')
    expect(displayCity('')).toBe('')
  })
})
