import { describe, it, expect } from 'vitest'
import { evaluate } from '../evaluate'
import { extractExperienceYears, extractCredential, resolveInIndia } from '../extract'
import { CONFIDENCE_THRESHOLD, type CandidateProfile, type TypedRequirement } from '../types'

/**
 * The most important tests in this codebase.
 *
 * src/gates decides what a candidate is allowed to see. A silent regression here
 * causes the exact harm Saaf exists to prevent — so these cover the boundaries,
 * not just the happy path.
 */

const rohan: CandidateProfile = { yearsExperience: 2, fn: 'engineering', city: 'Bengaluru', credential: 'none' }
const arjun: CandidateProfile = { yearsExperience: 2, fn: 'finance', city: 'Mumbai', credential: 'none' }
const arjunCA: CandidateProfile = { ...arjun, credential: 'CA' }

const req = (p: Partial<TypedRequirement>): TypedRequirement => ({
  kind: 'experience_years', sourceQuote: 'test', confidence: 0.9, ...p,
})

describe('experience gate', () => {
  it('clears at the exact boundary', () => {
    const r = evaluate({ ...rohan, yearsExperience: 3 }, [req({ minYears: 3 })])
    expect(r.outcome).toBe('cleared')
  })

  it('stretches when one year short, and caps the gap', () => {
    const r = evaluate(rohan, [req({ minYears: 3 })])
    expect(r.outcome).toBe('stretch')
    expect(r.gapYears).toBe(1)
    expect(r.reason).toMatch(/1 year above you/)
  })

  it('withholds when the gap exceeds the stretch cap', () => {
    const r = evaluate(rohan, [req({ minYears: 15 })])
    expect(r.outcome).toBe('withheld')
    expect(r.refusedOn).toBe('experience_years')
    expect(r.reason).toBe('Withheld — asks for 15 years; you have 2 years.')
    expect(r.score).toBeUndefined() // nothing is scored after a refusal
  })

  it('gates on the strictest reading when a description states several minimums', () => {
    // Real case from the fixture: "10+ years in software engineering, with 5+
    // years leading engineers." Refusing on the higher number is the safer error.
    const r = evaluate(rohan, [req({ minYears: 5 }), req({ minYears: 10 })])
    expect(r.outcome).toBe('withheld')
    expect(r.reason).toMatch(/asks for 10 years/)
  })
})

describe('credential gate', () => {
  it('withholds when the credential is required and not held', () => {
    const r = evaluate(arjun, [req({ kind: 'credential', credential: 'CA' })])
    expect(r.outcome).toBe('withheld')
    expect(r.refusedOn).toBe('credential')
    expect(r.reason).toMatch(/chartered accountant/)
    expect(r.reason).toMatch(/can't be stretched/)
  })

  it('clears when the credential is held', () => {
    const r = evaluate(arjunCA, [req({ kind: 'credential', credential: 'CA' })])
    expect(r.outcome).toBe('cleared')
  })

  it('never stretches a credential, even with everything else clearing', () => {
    const r = evaluate(arjun, [
      req({ kind: 'credential', credential: 'CA' }),
      req({ minYears: 2 }),
    ])
    expect(r.outcome).toBe('withheld')
    expect(r.gapYears).toBeUndefined()
  })
})

describe('confidence threshold — the wrong-refusal guard', () => {
  it('ignores a requirement below the threshold rather than refusing on it', () => {
    const r = evaluate(rohan, [req({ minYears: 15, confidence: 0.6 })])
    expect(r.outcome).toBe('cleared')
  })

  it('gates at exactly the threshold', () => {
    const r = evaluate(rohan, [req({ minYears: 15, confidence: CONFIDENCE_THRESHOLD })])
    expect(r.outcome).toBe('withheld')
  })
})

describe('silent descriptions', () => {
  it('clears when the description states nothing to gate on', () => {
    expect(evaluate(rohan, []).outcome).toBe('cleared')
  })
})

describe('extraction against real posting prose', () => {
  it('reads a plain minimum', () => {
    const [r] = extractExperienceYears('Must have 8+ years of experience shipping production software.')
    expect(r.minYears).toBe(8)
    expect(r.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
  })

  it('handles the U+2010 hyphen real postings actually use', () => {
    // "1‐2 years’ experience" — not an ASCII hyphen.
    const [r] = extractExperienceYears('Required: 1‐2 years’ experience in business development.')
    expect(r.minYears).toBe(1)
  })

  it('DOES NOT gate on a credential offered as optional', () => {
    // The false refusal this guard exists to prevent, taken verbatim from the
    // fixture: "CA/FRM/CFA/MBA is a plus."
    const found = extractCredential('CA/FRM/CFA/MBA is a plus.')
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((r) => r.confidence < CONFIDENCE_THRESHOLD)).toBe(true)
    expect(evaluate(arjun, found).outcome).toBe('cleared')
  })

  it('does gate on a credential stated as required', () => {
    const found = extractCredential('Minimum qualification: candidate must be a qualified Chartered Accountant.')
    expect(found.some((r) => r.confidence >= CONFIDENCE_THRESHOLD)).toBe(true)
    expect(evaluate(arjun, found).outcome).toBe('withheld')
  })

  it('ignores company boilerplate about its own age', () => {
    expect(extractExperienceYears('We have been building payments for over 10 years.')).toHaveLength(0)
  })
})

describe('India resolution — ATS boards are global', () => {
  it.each([
    ['Bengaluru', true], ['Bangalore, Karnataka', true], ['India', true],
    ['Bengaluru, Karnataka, India', true],
    ['San Francisco, California, United States', false], ['London, UK', false],
    ['Pristina', false], ['Skopje', false],
  ])('%s → in India: %s', (loc, expected) => {
    expect(resolveInIndia(loc)).toBe(expected)
  })
})
