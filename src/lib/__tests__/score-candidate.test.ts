import { describe, it, expect } from 'vitest'
import { candidateSearch } from '../score-candidate'

/**
 * The search the scorer scopes the index by. The shortlist's "of N" count asks
 * roles_for_candidates() with exactly these arguments, so these cases are what
 * keep the count and the scored list describing the same set of roles.
 */
describe('candidateSearch', () => {
  it('is null when the profile names no role', () => {
    expect(candidateSearch({}, false)).toBeNull()
    expect(candidateSearch({ preferredRole: '  ', preferredRoles: [''] }, true)).toBeNull()
  })

  it('merges the array and the legacy column, deduped case-insensitively, array first', () => {
    // The founder's live profile carries the same role twice in the array.
    const s = candidateSearch(
      { preferredRole: 'Customer Success Manager', preferredRoles: ['Customer Success Manager', 'customer success manager', 'Account Manager'] },
      false,
    )!
    expect(s.preferredAll).toEqual(['Customer Success Manager', 'Account Manager'])
    expect(s.searches).toEqual(['Customer Success Manager', 'Account Manager'])
    expect(s.adjacent).toBe(false)
  })

  it('passes roles verbatim when strict — websearch_to_tsquery does the parsing', () => {
    expect(candidateSearch({ preferredRole: 'C++ Developer (Backend)' }, false)!.searches).toEqual(['C++ Developer (Backend)'])
  })

  it('lowercases and strips punctuation when adjacent, for to_tsquery', () => {
    const s = candidateSearch({ preferredRole: 'Customer-Success Manager!' }, true)!
    expect(s.adjacent).toBe(true)
    expect(s.searches).toEqual(['customer success manager'])
  })

  it('stays strict for a one-word role even when adjacent is asked for', () => {
    // An OR of one word is the same query; the flag is not worth flipping.
    const s = candidateSearch({ preferredRole: 'Recruiter' }, true)!
    expect(s.adjacent).toBe(false)
    expect(s.searches).toEqual(['Recruiter'])
  })
})
