import { describe, it, expect } from 'vitest'
import { profileHealth, seniorityFromYears } from '@/lib/profile-health'

describe('profileHealth', () => {
  it('weights sum to 100', () => {
    expect(profileHealth({}).items.reduce((n, i) => n + i.weight, 0)).toBe(100)
  })
  it('is 0 for an empty profile and 100 for a complete one', () => {
    expect(profileHealth({}).score).toBe(0)
    expect(profileHealth({
      currentTitle: 'Analyst', employer: 'Acme', yearsExperience: 3, city: 'Pune', preferredRole: 'Data Analyst',
      extraRoles: ['BI Analyst'], skills: Array.from({ length: 10 }, (_, i) => `s${i}`), workMode: 'hybrid',
      seniority: 'mid', salaryMin: 1_200_000,
    }).score).toBe(100)
  })
  it('counts zero years as stated, and "no preference" as not stated', () => {
    const a = profileHealth({ yearsExperience: 0, workMode: 'no_preference' })
    expect(a.items.find((i) => i.key === 'years')!.done).toBe(true)
    expect(a.items.find((i) => i.key === 'mode')!.done).toBe(false)
  })
})

describe('seniorityFromYears', () => {
  it.each([[0, 'entry'], [3, 'mid'], [6, 'senior'], [10, 'lead'], [20, 'executive']] as const)('%s → %s', (y, s) => {
    expect(seniorityFromYears(y)).toBe(s)
  })
  it('guesses nothing without years', () => {
    expect(seniorityFromYears(null)).toBeNull()
  })
})
