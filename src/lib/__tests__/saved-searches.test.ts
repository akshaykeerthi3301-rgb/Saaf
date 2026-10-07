import { describe, it, expect } from 'vitest'
import {
  MAX_SEARCHES, MAX_SEARCH_ROLES, isActive, profileFieldsFromSearch, sanitizeSearches, searchFromProfile, withSearch,
} from '../saved-searches'

const S = (name: string, roles: string[], keywords: string[] = []) => ({ name, roles, keywords })

describe('the stored shape', () => {
  it('keeps a well-formed search exactly as it is', () => {
    const list = [S('PM', ['Product Manager', 'Program Manager'], ['fintech'])]
    expect(sanitizeSearches(list)).toEqual(list)
  })

  it('drops what the controls could not have made: no name, no roles, junk, a repeated name', () => {
    const out = sanitizeSearches([
      S('', ['PM']), S('No roles', []), null, 'x', 42, { name: 'ok', roles: 'PM' }, S('Dup', ['A']), S('dup', ['B']), S('Fine', ['C']),
    ])
    expect(out.map((s) => s.name)).toEqual(['Dup', 'Fine'])
  })

  it('caps roles, trims, dedupes case-insensitively and bounds every string', () => {
    const [s] = sanitizeSearches([S('  Wide  ', ['A', 'a', ' B ', 'C', 'D', 'E', 'F', 'G', 'x'.repeat(500)])])
    expect(s.name).toBe('Wide')
    expect(s.roles).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(s.roles).toHaveLength(MAX_SEARCH_ROLES)
  })

  it('never holds more than the cap, whatever was stored', () => {
    const many = Array.from({ length: 20 }, (_, i) => S(`s${i}`, ['PM']))
    expect(sanitizeSearches(many)).toHaveLength(MAX_SEARCHES)
  })
})

describe('restores identically', () => {
  const profile = { preferredRole: 'Customer Success Manager', preferredRoles: ['Customer Success Manager', 'Account Manager', 'Implementation Manager'], keywords: ['saas', 'onboarding'] }

  it('save → store → sanitise → restore returns the same search', () => {
    const saved = { name: 'CS', ...searchFromProfile(profile) }
    const stored = JSON.parse(JSON.stringify(sanitizeSearches([saved])))
    const back = profileFieldsFromSearch(stored[0])
    expect(back).toEqual({ preferredRole: 'Customer Success Manager', preferredRoles: profile.preferredRoles, keywords: profile.keywords })
  })

  it('a profile whose list omits the singular role still saves it first, once', () => {
    const s = searchFromProfile({ preferredRole: 'Analyst', preferredRoles: ['Data Analyst'], keywords: null })
    expect(s.roles).toEqual(['Analyst', 'Data Analyst'])
    expect(s.keywords).toEqual([])
  })

  it('knows which saved search the profile is on', () => {
    const cs = S('CS', ['Customer Success Manager', 'Account Manager'], ['saas'])
    expect(isActive(cs, { roles: ['Customer Success Manager', 'Account Manager'], keywords: ['SaaS'] })).toBe(true)
    // same roles, different first role = a different search (the first one is "the" role)
    expect(isActive(cs, { roles: ['Account Manager', 'Customer Success Manager'], keywords: ['saas'] })).toBe(false)
    expect(isActive(cs, { roles: ['Customer Success Manager'], keywords: ['saas'] })).toBe(false)
  })
})

describe('withSearch', () => {
  it('replaces a search of the same name, in any case, instead of adding another', () => {
    const out = withSearch([S('PM', ['A'])], S('pm', ['B']))
    expect(out).toEqual([S('pm', ['B'])])
  })
  it('appends a new name and refuses past the cap', () => {
    expect(withSearch([S('a', ['A'])], S('b', ['B']))).toHaveLength(2)
    const full = Array.from({ length: MAX_SEARCHES }, (_, i) => S(`s${i}`, ['A']))
    expect(withSearch(full, S('one more', ['B']))).toBeNull()
    expect(withSearch(full, S('S0', ['Z']))).toHaveLength(MAX_SEARCHES)
  })
})
