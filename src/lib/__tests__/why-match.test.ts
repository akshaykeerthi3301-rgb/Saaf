import { describe, it, expect } from 'vitest'
import { whyThisMatches } from '../why-match'
import type { ScoreBreakdown } from '@/match/score'

const bd = (components: ScoreBreakdown['components']): ScoreBreakdown => ({ total: 0, components, confidence: 'high' })

describe('whyThisMatches — built only from the score\'s own notes', () => {
  const components: ScoreBreakdown['components'] = [
    { key: 'title', label: 'Role', points: 28, max: 28, note: 'Title matches every word of the role you asked for' },
    { key: 'skills', label: 'Skills', points: 8, max: 20, note: 'Mentions 2 of your skills: Excel, CSM.' },
    { key: 'seniority', label: 'Experience', points: 5, max: 25, note: 'Asks for 5 years; you have 2' },
    { key: 'cap', label: 'Cap', points: 0, max: 0, note: 'Capped' },
  ]

  it('leads with the best-scoring component and names the weakest as the gap', () => {
    expect(whyThisMatches(bd(components))).toEqual({
      strength: 'Title matches every word of the role you asked for.',
      gap: 'Asks for 5 years; you have 2.',
    })
  })

  it('never repeats the card\'s reason line', () => {
    const withSkills = components.map((c) => (c.key === 'skills' ? { ...c, points: 12 } : c))
    const r = whyThisMatches(bd(withSkills), 'Title matches every word of the role you asked for')
    expect(r.strength).toBe('Mentions 2 of your skills: Excel, CSM.')
  })

  it('says nothing rather than something weak', () => {
    expect(whyThisMatches(bd([{ key: 'skills', label: 'S', points: 2, max: 20, note: 'Mentions 1 skill' }]))).toEqual({ strength: null, gap: null })
    expect(whyThisMatches(null)).toEqual({ strength: null, gap: null })
  })

  it('never names a skills note as the gap — it reads as good news (observed on /today, 2026-10-02)', () => {
    const r = whyThisMatches(bd([
      { key: 'location', label: 'Location', points: 10, max: 10, note: 'In Bengaluru' },
      { key: 'skills', label: 'Skills', points: 4, max: 20, note: 'Mentions 2 of your skills: stakeholder management, Excel.' },
    ]))
    expect(r).toEqual({ strength: 'In Bengaluru.', gap: null })
  })

  it('has no gap when nothing scored under half', () => {
    expect(whyThisMatches(bd(components.slice(0, 1))).gap).toBeNull()
  })
})
