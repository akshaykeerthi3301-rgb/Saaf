import { describe, it, expect } from 'vitest'
import { resolveCity, matchLocation, CITIES } from '../locations'

describe('resolveCity', () => {
  it('resolves a canonical name, any casing or padding', () => {
    expect(resolveCity('Bengaluru')?.name).toBe('Bengaluru')
    expect(resolveCity('  bengaluru ')?.name).toBe('Bengaluru')
    expect(resolveCity('BENGALURU')?.name).toBe('Bengaluru')
  })

  it('resolves the former name to the current one', () => {
    expect(resolveCity('Bangalore')?.name).toBe('Bengaluru')
    expect(resolveCity('Gurgaon')?.name).toBe('Gurugram')
    expect(resolveCity('Bombay')?.name).toBe('Mumbai')
    expect(resolveCity('Calcutta')?.name).toBe('Kolkata')
    expect(resolveCity('Madras')?.name).toBe('Chennai')
    expect(resolveCity('Trivandrum')?.name).toBe('Thiruvananthapuram')
  })

  it('returns null for a city we do not carry, rather than guessing', () => {
    expect(resolveCity('Atlantis')).toBeNull()
    expect(resolveCity('')).toBeNull()
    expect(resolveCity(undefined)).toBeNull()
  })

  it('has no duplicate canonical names', () => {
    const names = CITIES.map((c) => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('never lists a city as its own alias', () => {
    for (const c of CITIES) expect(c.aliases ?? []).not.toContain(c.name)
  })
})

describe('matchLocation', () => {
  it('matches the exact city under either spelling — the defect this fixes', () => {
    // Measured on the live index: 182 postings said Bengaluru and 67 said
    // Bangalore. Before the taxonomy, choosing one scored the other 3/10.
    expect(matchLocation('Bengaluru', 'Bangalore, Karnataka')).toEqual({ kind: 'exact', city: 'Bengaluru' })
    expect(matchLocation('Bangalore', 'Bengaluru, Karnataka, India')).toEqual({ kind: 'exact', city: 'Bengaluru' })
    expect(matchLocation('Bengaluru', 'Hybrid in Bangalore, India')).toEqual({ kind: 'exact', city: 'Bengaluru' })
    expect(matchLocation('Bengaluru', 'Bengaluru-VTP, India')).toEqual({ kind: 'exact', city: 'Bengaluru' })
  })

  it('matches across a commute cluster, and names the city it found', () => {
    expect(matchLocation('Delhi', 'Noida, Uttar Pradesh, India'))
      .toEqual({ kind: 'cluster', city: 'Noida', cluster: 'ncr' })
    expect(matchLocation('Noida', 'Gurugram, Haryana, India'))
      .toEqual({ kind: 'cluster', city: 'Gurugram', cluster: 'ncr' })
    // "Mumbai" is a substring of "Navi Mumbai", and the more specific name has
    // to win or the note names a city the posting never mentioned.
    expect(matchLocation('Mumbai', 'Navi Mumbai, Maharashtra, India'))
      .toEqual({ kind: 'cluster', city: 'Navi Mumbai', cluster: 'mmr' })
    expect(matchLocation('Mumbai', 'Mumbai, Maharashtra, India'))
      .toEqual({ kind: 'exact', city: 'Mumbai' })
    expect(matchLocation('Noida', 'Greater Noida, Uttar Pradesh'))
      .toEqual({ kind: 'cluster', city: 'Greater Noida', cluster: 'ncr' })
    expect(matchLocation('Thane', 'Navi Mumbai, Maharashtra, India'))
      .toEqual({ kind: 'cluster', city: 'Navi Mumbai', cluster: 'mmr' })
  })

  it('does not cluster-match across different clusters or unclustered cities', () => {
    expect(matchLocation('Delhi', 'Pune, Maharashtra, India')).toBeNull()
    expect(matchLocation('Bengaluru', 'Chennai, Tamil Nadu, India')).toBeNull()
    expect(matchLocation('Pune', 'Nashik, Maharashtra')).toBeNull()
  })

  it('respects word boundaries, so a short name cannot match a longer word', () => {
    expect(matchLocation('Goa', 'Goalpara, Assam')).toBeNull()
    expect(matchLocation('Delhi', 'New Delhi, Delhi, India')).toEqual({ kind: 'exact', city: 'Delhi' })
  })

  it('falls back to a plain match for a city outside the taxonomy', () => {
    expect(matchLocation('Shillong', 'Shillong, Meghalaya')).toEqual({ kind: 'exact', city: 'Shillong' })
    expect(matchLocation('Shillong', 'Pune, Maharashtra')).toBeNull()
  })

  it('handles a posting that names more than one city', () => {
    // Real row from the index. It is genuinely in both, so both candidates
    // get an exact match — reporting only the most specific one lost Mumbai.
    const loc = 'bengaluru, mumbai bengaluru'
    expect(matchLocation('Mumbai', loc)).toEqual({ kind: 'exact', city: 'Mumbai' })
    expect(matchLocation('Bengaluru', loc)).toEqual({ kind: 'exact', city: 'Bengaluru' })
    expect(matchLocation('Pune', loc)).toBeNull()
  })

  it('returns null when either side is missing', () => {
    expect(matchLocation(undefined, 'Pune')).toBeNull()
    expect(matchLocation('Pune', '')).toBeNull()
  })
})
