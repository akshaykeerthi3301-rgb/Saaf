import { describe, it, expect } from 'vitest'
import { resolveCity, matchLocation, isIndianLocation, CITIES } from '../locations'

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

/**
 * isIndianLocation is the ingest's only gate on supply, and — through
 * scripts/qualify-boards.ts — the test that decides whether a whole employer
 * enters the registry. A name it misses is a role, or a company, the product
 * never sees. So the cases below are the ones the twenty-substring predicate
 * it replaced got wrong, in both directions.
 */
describe('isIndianLocation', () => {
  it('accepts the cities the old hardcoded list silently dropped', () => {
    for (const l of [
      'Kochi', 'Kochi, Kerala', 'Indore', 'Indore, Madhya Pradesh',
      'Coimbatore', 'Coimbatore, Tamil Nadu', 'Chandigarh', 'Chandigarh, India',
      'Thiruvananthapuram', 'Bhubaneswar, Odisha', 'Ludhiana, Punjab, India',
      'Kozhikode', 'Visakhapatnam', 'Guwahati, Assam', 'Ranchi, Jharkhand',
      'Goa', 'Puducherry', 'Dehradun, Uttarakhand',
    ]) {
      expect(isIndianLocation(l), l).toBe(true)
    }
  })

  it('accepts a state even when the city is outside the taxonomy', () => {
    // Sonipat and Bhilai name no city we carry. The state is the only signal.
    expect(isIndianLocation('Sonipat, Haryana')).toBe(true)
    expect(isIndianLocation('Bhilai, Chhattisgarh')).toBe(true)
  })

  it('accepts every location shape the live index actually contains', () => {
    for (const l of [
      'Bengaluru', 'Bengaluru, Karnataka, India', 'Bangalore, Karnataka',
      'Bengaluru, in', 'India', 'Chennai, in', 'Hybrid in Bangalore, India',
      'Bengaluru-VTP, India', 'Bangalore - DD', 'India - Remote',
      'bengaluru, mumbai', 'New Delhi, in', 'Noida, Uttar Pradesh',
    ]) {
      expect(isIndianLocation(l), l).toBe(true)
    }
  })

  it('rejects Indiana, which the old substring match called India', () => {
    // 'india'.includes was the whole test, so every Indiana address passed.
    expect(isIndianLocation('Indianapolis, Indiana')).toBe(false)
    expect(isIndianLocation('Bloomington, Indiana')).toBe(false)
    expect(isIndianLocation('Indiana, United States')).toBe(false)
  })

  it('rejects the foreign namesakes of Indian places', () => {
    expect(isIndianLocation('Hyderabad, Pakistan')).toBe(false)
    expect(isIndianLocation('Lahore, Punjab, Pakistan')).toBe(false)
    expect(isIndianLocation('Delhi, Ontario, Canada')).toBe(false)
    expect(isIndianLocation('Delhi, New York, United States')).toBe(false)
  })

  it('keeps a multi-country posting that names India', () => {
    // The India rule runs before the foreign-country rejection, deliberately:
    // a role open in Bengaluru and Singapore is an India role.
    expect(isIndianLocation('Bengaluru, India / Singapore')).toBe(true)
    expect(isIndianLocation('Remote — India, United States')).toBe(true)
  })

  it('rejects plainly foreign and empty locations', () => {
    for (const l of ['London, United Kingdom', 'San Francisco, CA', 'Singapore', 'Remote - US', '']) {
      expect(isIndianLocation(l), l).toBe(false)
    }
  })
})

/**
 * Real profile cities are not bare names.
 *
 * The résumé parser and the location picker both produce "Bangalore, India" or
 * "Mumbai, Maharashtra, India" — that is what a CV says. resolveCity did an
 * exact lookup, missed all of them, and returned null; matchLocation then read
 * null as "a city we do not carry" and fell back to a literal substring test.
 * The effect was silent and large: a candidate in "Bangalore, India" matched
 * only postings containing that exact phrase, so "Bengaluru, Karnataka, India"
 * — the commonest location in the index — scored as ANOTHER CITY. Observed on
 * a live profile 2026-09-07: 36 roles placed in-city against 385 elsewhere,
 * nearly all of which were in fact in Bengaluru.
 */
describe('resolveCity handles a city written the way a résumé writes it', () => {
  it('resolves a city with a country or state attached', () => {
    expect(resolveCity('Bangalore, India')?.name).toBe('Bengaluru')
    expect(resolveCity('Mumbai, Maharashtra, India')?.name).toBe('Mumbai')
    expect(resolveCity('New Delhi, India')?.name).toBe('Delhi')
    expect(resolveCity('Kolkata ')?.name).toBe('Kolkata')
  })

  it('still returns null for a city the taxonomy does not carry', () => {
    // Null is never a rejection — it turns off alias matching, nothing else.
    expect(resolveCity('Atlantis, Narnia')).toBeNull()
  })

  it('matches the index\'s commonest location, which it used to miss entirely', () => {
    expect(matchLocation('Bangalore, India', 'Bengaluru, Karnataka, India'))
      .toEqual({ kind: 'exact', city: 'Bengaluru' })
    expect(matchLocation('Bangalore, India', 'Bangalore, Karnataka'))
      .toEqual({ kind: 'exact', city: 'Bengaluru' })
  })

  it('restores commute-cluster matching, which null had disabled', () => {
    expect(matchLocation('New Delhi, India', 'Noida, Uttar Pradesh'))
      .toEqual({ kind: 'cluster', city: 'Noida', cluster: 'ncr' })
  })

  it('does not start matching unrelated cities', () => {
    expect(matchLocation('Bangalore, India', 'Pune, Maharashtra')).toBeNull()
    expect(matchLocation('New Delhi, India', 'Mumbai')).toBeNull()
  })
})
