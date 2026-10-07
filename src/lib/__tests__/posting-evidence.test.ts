import { describe, it, expect } from 'vitest'
import { postingEvidence, type RequirementRow } from '../posting-evidence'

const row = (o: Partial<RequirementRow>): RequirementRow => ({ kind: 'experience_years', minYears: 2, confidence: 0.9, sourceQuote: '2 to 5 years required', ...o })

describe('postingEvidence', () => {
  it('lists each requirement with its quote and a readable label', () => {
    const e = postingEvidence([row({})])
    expect(e).toHaveLength(1)
    expect(e[0]).toMatchObject({ kind: 'experience_years', quote: '2 to 5 years required', lowConfidence: false })
    expect(e[0].label.length).toBeGreaterThan(0)
  })
  it('shows one quote once, keeping the higher-confidence reading of it', () => {
    const q = 'Exp should be in between 2 - 4 years, out of which minimum 2 years in product management'
    const e = postingEvidence([row({ sourceQuote: q, confidence: 0.8, minYears: 2 }), row({ sourceQuote: q, confidence: 0.95, minYears: 2 })])
    expect(e).toHaveLength(1)
  })
  it('on equal confidence keeps the reading that captured a floor', () => {
    const e = postingEvidence([row({ minYears: null, confidence: 0.9 }), row({ minYears: 3, confidence: 0.9 })])
    expect(e).toHaveLength(1)
  })
  it('keeps the same quote when it supports two different kinds of requirement', () => {
    expect(postingEvidence([row({ kind: 'experience_years' }), row({ kind: 'title_seniority' })])).toHaveLength(2)
  })
  it('marks a reading below the confidence bar, and does not hide it', () => {
    expect(postingEvidence([row({ confidence: 0.4 })])[0].lowConfidence).toBe(true)
  })
  it('cleans an entity out of a stored quote and drops an empty one', () => {
    expect(postingEvidence([row({ sourceQuote: 'required&nbsp;' })])[0].quote).toBe('required')
    expect(postingEvidence([row({ sourceQuote: '   ' })])).toEqual([])
  })
})
