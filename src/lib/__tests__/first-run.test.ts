import { describe, it, expect } from 'vitest'
import { LEVELS, feedLevelFor, levelFromYears, profileFromRead, seniorityFor } from '../first-run'

describe('profileFromRead — when a parsed résumé may become a profile with no typing', () => {
  const full = { currentTitle: 'Private Banking Manager', employer: 'ICICI Bank', city: 'Bangalore', yearsExperience: 4, skills: ['Salesforce'] }

  it('saves a complete read, with the target role taken from the index-backed suggestion', () => {
    const r = profileFromRead(full, 'Relationship Manager')
    expect(r).toEqual({
      ok: true,
      input: { currentTitle: 'Private Banking Manager', employer: 'ICICI Bank', yearsExperience: 4, preferredRole: 'Relationship Manager', city: 'Bangalore', skills: ['Salesforce'] },
    })
  })

  it('never invents a target role — no suggestion means the details screen, with the gap named', () => {
    expect(profileFromRead(full, undefined)).toEqual({ ok: false, missing: ['target role'] })
  })

  it('names every missing field, and treats blank as missing', () => {
    const r = profileFromRead({ currentTitle: '  ', employer: 'Acme', yearsExperience: 99 }, 'PM')
    expect(r).toEqual({ ok: false, missing: ['current title', 'city', 'years of experience'] })
  })

  it('accepts zero years — a fresher is a real answer, not a gap', () => {
    expect(profileFromRead({ ...full, yearsExperience: 0 }, 'Analyst').ok).toBe(true)
  })
})

describe('the welcome card levels', () => {
  it('ticks the card the years fall in, and none when years are unknown', () => {
    expect([0.5, 1.5, 4, 7, 12, 20].map(levelFromYears)).toEqual(['intern', 'entry', 'mid', 'senior', 'lead', 'executive'])
    // The boundaries follow the words on the cards: entry is up to 2 years, mid 3 to 5, senior 6 or more.
    expect([2, 2.5, 5, 5.5, 6].map(levelFromYears)).toEqual(['entry', 'mid', 'mid', 'mid', 'senior'])
    expect(levelFromYears(null)).toBeNull()
    expect(levelFromYears(Number.NaN)).toBeNull()
  })

  it('stores the lowest ticked level — where the person is, not where they would stretch', () => {
    expect(seniorityFor(['senior', 'mid'])).toBe('mid')
    expect(seniorityFor([])).toBeNull()
  })

  it('filters the feed only when every ticked level sits in one of its three buckets', () => {
    expect(feedLevelFor(['intern', 'entry'])).toBe('entry')
    expect(feedLevelFor(['senior', 'lead', 'executive'])).toBe('senior')
    expect(feedLevelFor(['mid'])).toBe('mid')
    expect(feedLevelFor(['entry', 'mid'])).toBeNull()
    expect(feedLevelFor([])).toBeNull()
  })

  it('offers six distinct cards', () => {
    expect(new Set(LEVELS.map((l) => l.key)).size).toBe(6)
  })
})
