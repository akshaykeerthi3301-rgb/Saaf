import { describe, it, expect } from 'vitest'
import { evaluate } from '../evaluate'
import { extractExperienceYears, extractCredential, resolveInIndia, isRemoteLocation, isHybridLocation } from '../extract'
import { extractTitleSeniority } from '../title'
import { CONFIDENCE_THRESHOLD, type CandidateProfile, type TypedRequirement } from '../types'

/**
 * The most important tests in this codebase.
 *
 * src/gates decides what a candidate is allowed to see. A silent regression here
 * causes the exact harm Saaf exists to prevent — so these cover the boundaries,
 * not just the happy path.
 */

const rohan: CandidateProfile = { yearsExperience: 2, city: 'Bengaluru', credential: 'none' }
const arjun: CandidateProfile = { yearsExperience: 2, city: 'Mumbai', credential: 'none' }
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

describe('title seniority gate', () => {
  const t = (title: string) => extractTitleSeniority(title)

  it.each([
    ['Staff Engineer – Observability Platform', 8],
    ['Principal Product Manager', 10],
    ['Senior Engineer, IAM', 5],
    ['Director of Engineering', 10],
    ['Head of Meesho Foundation', 10],
    ['VP, Finance', 15],
  ])('%s → band %i years', (title, years) => {
    expect(t(title)[0]?.minYears).toBe(years)
  })

  it.each([
    'Assistant Manager - Ops',
    'Assistant Manager Finance – Logistics Intelligence',
    'Associate - Content (Digest)',
    'Software Engineer',
    'Business Analyst',
  ])('does not gate on %s — Indian junior titles', (title) => {
    expect(t(title)).toHaveLength(0)
  })

  it('discounts Associate Director rather than treating it as Director', () => {
    // Director is 10; the associate qualifier pulls it to 6. Treating it as a
    // full Director role would be a false refusal on a reachable job.
    expect(t('Associate Director - Business Finance')[0]?.minYears).toBe(6)
  })

  it('withholds a senior title with a reason that quotes the title', () => {
    const r = evaluate(rohan, t('Staff Engineer – Observability Platform'))
    expect(r.outcome).toBe('withheld')
    expect(r.refusedOn).toBe('title_seniority')
    expect(r.reason).toContain('Staff Engineer')
    // It must never invent a years figure the posting did not state.
    expect(r.reason).not.toMatch(/asks for \d+ years/)
    expect(r.reason).toMatch(/doesn't state a year count/)
  })

  it('lets an explicit statement in the description override the title band', () => {
    // "Senior Engineer" implies 5, but the posting says 3+. Believe the posting.
    const reqs = [...t('Senior Engineer'), req({ minYears: 3, confidence: 0.95 })]
    const r = evaluate(rohan, reqs)
    expect(r.outcome).toBe('stretch')
    expect(r.gapYears).toBe(1)
  })
})

describe('regressions found by running against real postings', () => {
  it('does not read a requirement out of an adjectival year phrase', () => {
    // Verbatim from the fixture. This produced a 2-year minimum, which then
    // suppressed a correct Senior Manager title gate and cleared the role for a
    // two-year candidate — two bugs compounding into a false clearance.
    const found = extractExperienceYears(
      "It also gives you a seat at the table with senior leadership on one of Meesho's most visible 2-year bets."
    )
    expect(found).toHaveLength(0)
  })

  it('still reads a requirement that omits the word "experience"', () => {
    // The fix above must not throw out legitimate requirements: 29 of 107 in
    // the fixture are phrased without it.
    const [r] = extractExperienceYears(
      'About You You need 6-8+ years in a technical customer-facing role.'
    )
    expect(r?.minYears).toBe(6)
  })

  it('an unframed mention cannot suppress a correct title gate', () => {
    const reqs = [
      ...extractTitleSeniority('Senior Manager - User Experience'),
      req({ minYears: 2, confidence: 0.75 }), // unframed
    ]
    expect(evaluate(rohan, reqs).outcome).toBe('withheld')
  })

  it('a framed statement still overrides the title band', () => {
    const reqs = [
      ...extractTitleSeniority('Senior Engineer'),
      req({ minYears: 3, confidence: 0.95 }), // "must have 3+ years"
    ]
    const r = evaluate(rohan, reqs)
    expect(r.outcome).toBe('stretch')
    expect(r.gapYears).toBe(1)
  })
})

describe('bug-and-fix campaign regressions (2026-09-03)', () => {
  it('"CS" as Computer Science is never read as Company Secretary', () => {
    const found = extractCredential("Bachelor's in CS or related field is required.")
    expect(found).toHaveLength(0)
  })

  it('"CS" for Computer Science background does not gate on Company Secretary', () => {
    const found = extractCredential('We are looking for candidates from a CS background.')
    expect(found).toHaveLength(0)
  })

  it('the spelled-out credential still gates', () => {
    const [r] = extractCredential('You must be a qualified Company Secretary.')
    expect(r?.credential).toBe('CS')
    expect(r?.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
  })

  it('a preference clause does not suppress a requirement stated elsewhere in the same sentence', () => {
    const [r] = extractExperienceYears(
      'CFA is preferred, but you must have 5+ years of experience in equity research.'
    )
    expect(r?.minYears).toBe(5)
    expect(r?.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
  })

  it('the preference clause itself still reads as low confidence', () => {
    const found = extractCredential('CFA is preferred, but you must have 5+ years of experience.')
    expect(found[0]?.confidence).toBeLessThan(CONFIDENCE_THRESHOLD)
  })

  it('"Head, Growth" reads as a director-level title, same as "Head of Growth"', () => {
    const [r] = extractTitleSeniority('Head, Growth')
    expect(r?.minYears).toBe(10)
  })

  it('a singular "1 year" minimum is extracted, not just plural phrasing', () => {
    const [r] = extractExperienceYears('You must have at least 1 year of relevant experience.')
    expect(r?.minYears).toBe(1)
  })
})

describe('work-mode preference helpers', () => {
  // Shared with the location gate (evaluate.ts) and the /today work-mode
  // preference sort — one definition, tested once.
  it('detects remote from the same signals the location gate already uses', () => {
    expect(isRemoteLocation('Remote - India')).toBe(true)
    expect(isRemoteLocation('Work from home')).toBe(true)
    expect(isRemoteLocation('Bengaluru, Karnataka')).toBe(false)
  })

  it('detects hybrid, as written in real Indian postings\' location field', () => {
    expect(isHybridLocation('Hybrid in Bangalore')).toBe(true)
    expect(isHybridLocation('Bengaluru, Karnataka')).toBe(false)
  })
})
