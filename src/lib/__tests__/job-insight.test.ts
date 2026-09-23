import { describe, it, expect } from 'vitest'
import { analyseFit, factorHighlight } from '@/lib/job-insight'
import type { ScoreBreakdown } from '@/match/score'

const breakdown: ScoreBreakdown = {
  total: 70,
  confidence: 'high',
  components: [
    { key: 'title', label: 'Title', points: 28, max: 28, note: 'Title matches Product Manager.' },
    { key: 'skills', label: 'Skills', points: 6, max: 20, note: '3 of 10 skills.' },
    { key: 'seniority', label: 'Seniority', points: 20, max: 25, note: 'Within the band.' },
  ],
}

describe('analyseFit', () => {
  const base = {
    title: 'Product Manager',
    description: 'You will use SQL and Python daily. Experience with Kubernetes is a plus. Stakeholder management matters.',
    yearsExperience: 2,
    breakdown,
    requirements: [{ kind: 'experience_years', minYears: 4, sourceQuote: '4+ years of product experience' }],
  }

  it('splits named skills into held and missing', () => {
    const a = analyseFit({ ...base, skills: ['SQL', 'Stakeholder management'] })
    expect(a.matched).toEqual(expect.arrayContaining(['SQL', 'Stakeholder management']))
    expect(a.missing.map((m) => m.term)).not.toContain('SQL')
  })

  it('states the experience gap with the quote it came from', () => {
    const a = analyseFit({ ...base, skills: [] })
    expect(a.gaps.some((g) => g.includes('Asks for 4 years') && g.includes('4+ years of product experience'))).toBe(true)
  })

  it('reads strong and weak factors off the stored breakdown', () => {
    const a = analyseFit({ ...base, skills: [] })
    expect(a.whyFit).toContain('Title matches Product Manager.')
    expect(a.gaps).toContain('3 of 10 skills.')
    expect(a.strongFactors).toBe(2)
    expect(a.totalFactors).toBe(3)
  })
})

describe('factorHighlight', () => {
  it('counts factors, and says so', () => {
    expect(factorHighlight(breakdown)).toBe('Strong match: strong on 2 of 3 score factors')
  })
  it('is null without a breakdown', () => {
    expect(factorHighlight(null)).toBeNull()
  })
})
