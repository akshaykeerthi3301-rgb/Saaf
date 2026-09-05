import { describe, it, expect } from 'vitest'
import { scoreRole, summarise } from '../score'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'

const junior: CandidateProfile = {
  yearsExperience: 2, city: 'Bengaluru', credential: 'none',
  preferredRole: 'Product Manager', workModePreference: 'no_preference',
}
const senior: CandidateProfile = { ...junior, yearsExperience: 10 }

const role = { title: 'Product Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru' }

const req = (over: Partial<TypedRequirement>): TypedRequirement => ({
  kind: 'experience_years', sourceQuote: 'stated in the posting', confidence: 0.95, ...over,
})

describe('the score reads the candidate', () => {
  it('gives two candidates different scores on the same role', () => {
    // The defect this replaces: scoreFor() took the profile as `_p` and never
    // read it, so every candidate scored identically and the number really
    // measured how wordy the posting was.
    const reqs = [req({ minYears: 8 })]
    const a = scoreRole(junior, role, reqs).total
    const b = scoreRole(senior, role, reqs).total
    expect(a).not.toBe(b)
    expect(b).toBeGreaterThan(a)
  })

  it('never withholds — a role far above the candidate still scores', () => {
    const r = scoreRole(junior, role, [req({ minYears: 15 })])
    expect(r.total).toBeGreaterThan(0)
    expect(r.total).toBeLessThanOrEqual(100)
  })

  it('keeps every total within 0-100', () => {
    for (const years of [0, 2, 5, 20]) {
      for (const min of [0, 3, 10, 25]) {
        const r = scoreRole({ ...junior, yearsExperience: years }, role, [req({ minYears: min })])
        expect(r.total).toBeGreaterThanOrEqual(0)
        expect(r.total).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('components', () => {
  it('scores a matching title above an unrelated one', () => {
    const match = scoreRole(junior, role, []).components.find((c) => c.key === 'title')!
    const miss = scoreRole(junior, { ...role, title: 'Chartered Accountant' }, []).components
      .find((c) => c.key === 'title')!
    expect(match.points).toBeGreaterThan(miss.points)
    expect(match.points).toBe(match.max)
  })

  it('matches "Product Management" to a "Product Manager" search', () => {
    // Crude stemming has to survive the plural/gerund forms real titles use.
    const c = scoreRole(junior, { ...role, title: 'Product Management - Lending' }, [])
      .components.find((x) => x.key === 'title')!
    expect(c.points).toBe(c.max)
  })

  it('penalises a credential the candidate does not hold, without withholding', () => {
    const reqs = [req({ kind: 'credential', credential: 'CA' })]
    const without = scoreRole(junior, role, reqs)
    const with_ = scoreRole({ ...junior, credential: 'CA' }, role, reqs)
    expect(with_.total).toBeGreaterThan(without.total)
    expect(without.total).toBeGreaterThan(0)
  })

  it('rewards a work-mode match', () => {
    const remoteRole = { title: 'Product Manager', locationRaw: 'Remote - India' }
    const wants = scoreRole({ ...junior, workModePreference: 'remote' }, remoteRole, [])
    const doesnt = scoreRole({ ...junior, workModePreference: 'onsite' }, remoteRole, [])
    expect(wants.total).toBeGreaterThan(doesnt.total)
  })

  it('flags low confidence when the experience bar could not be read', () => {
    const r = scoreRole(junior, { ...role, unreadExperienceMention: true }, [])
    expect(r.confidence).toBe('low')
  })

  it('ignores requirements below the gating threshold', () => {
    // A preference-framed mention must not move the score as if it were a
    // requirement — the same threshold the extractor applies.
    const soft = scoreRole(junior, role, [req({ minYears: 12, confidence: 0.3 })])
    const none = scoreRole(junior, role, [])
    expect(soft.total).toBe(none.total)
  })
})

describe('summarise', () => {
  it('surfaces the weakest component, not a generic line', () => {
    const r = scoreRole(junior, role, [req({ minYears: 9 })])
    expect(summarise(r)).toMatch(/9 years/)
  })

  it('says so plainly when nothing is short', () => {
    const r = scoreRole(senior, role, [req({ minYears: 3 })])
    expect(summarise(r)).toMatch(/clears every requirement/i)
  })
})

describe('skills', () => {
  const withSkills: CandidateProfile = { ...junior, skills: ['SQL', 'Roadmapping', 'A/B testing'] }
  const jd = { ...role, description: 'You will own the roadmap and run A/B testing. SQL is essential. '.repeat(3) }

  it('lifts a role whose posting names the candidate’s skills', () => {
    const named = scoreRole(withSkills, jd, []).total
    const notNamed = scoreRole(withSkills, { ...role, description: 'Unrelated duties. '.repeat(10) }, []).total
    expect(named).toBeGreaterThan(notNamed)
  })

  it('does not penalise a candidate who has no skills on file', () => {
    // The component is left out of the total rather than scored zero —
    // otherwise everyone who has not uploaded a résumé sits 20 points below
    // an otherwise identical candidate who has.
    const none = scoreRole(junior, jd, [])
    expect(none.components.some((c) => c.key === 'skills')).toBe(false)
    expect(none.total).toBeGreaterThanOrEqual(scoreRole(withSkills, { ...role, description: 'Unrelated. '.repeat(10) }, []).total)
  })

  it('omits the component when the posting has no text to search', () => {
    const r = scoreRole(withSkills, role, [])
    expect(r.components.some((c) => c.key === 'skills')).toBe(false)
  })

  it('names the matched skills back, rather than asserting a fit', () => {
    const c = scoreRole(withSkills, jd, []).components.find((x) => x.key === 'skills')!
    expect(c.note).toMatch(/SQL/)
  })
})
