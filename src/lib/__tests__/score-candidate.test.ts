import { describe, it, expect } from 'vitest'
import { candidateSearch, scoreAgainstIndex, MAX_ROLES_PER_CANDIDATE } from '../score-candidate'

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

describe('scoreAgainstIndex', () => {
  it('asks the database only for roles the employer still lists, never a taken-down posting', async () => {
    const calls: unknown[][] = []
    const q: Record<string, unknown> = {}
    q.select = () => q
    q.range = () => q
    q.is = (...a: unknown[]) => { calls.push(a); return q }
    q.then = (res: (v: unknown) => unknown) => res({ data: [], error: null })
    const db = { rpc: () => q } as unknown as Parameters<typeof scoreAgainstIndex>[0]
    await scoreAgainstIndex(db, { preferredRole: 'Product Manager' } as Parameters<typeof scoreAgainstIndex>[1], { openToAdjacent: false })
    expect(calls).toEqual([['closed_at', null]])
  })

  it('reads past the 1,000-row ceiling: every ranked id is paged in, then the roles are fetched in batches', async () => {
    const ids = Array.from({ length: 2300 }, (_, i) => `r${String(i).padStart(4, '0')}`)
    const ranges: number[][] = []
    const fetched: number[] = []
    const rpcQuery = () => {
      let from = 0, to = 0
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.is = () => q
      q.range = (a: number, b: number) => { from = a; to = b; ranges.push([a, b]); return q }
      q.then = (res: (v: unknown) => unknown) => res({ data: ids.slice(from, to + 1).map((id) => ({ id })), error: null })
      return q
    }
    const rolesQuery = () => {
      let part: string[] = []
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.in = (_c: string, v: string[]) => { part = v; fetched.push(v.length); return q }
      q.is = () => q
      q.then = (res: (v: unknown) => unknown) => res({ data: part.map((id) => ({ id, title: 'Product Manager', company_name: 'Acme', apply_url: null, description: 'Own the roadmap.', location_raw: 'Bengaluru', city: 'Bengaluru', unread_experience_mention: false, role_requirements: [] })), error: null })
      return q
    }
    const emptyQuery = () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.in = () => q
      q.then = (res: (v: unknown) => unknown) => res({ data: [], error: null })
      return q
    }
    let maxRows: unknown
    const db = { rpc: (_n: string, args: { max_rows: number }) => { maxRows = args.max_rows; return rpcQuery() }, from: (table: string) => (table === 'role_requirements' ? emptyQuery() : rolesQuery()) } as unknown as Parameters<typeof scoreAgainstIndex>[0]
    const out = await scoreAgainstIndex(db, { preferredRole: 'Product Manager', yearsExperience: 3 } as Parameters<typeof scoreAgainstIndex>[1], { openToAdjacent: false })
    expect(maxRows).toBe(MAX_ROLES_PER_CANDIDATE)
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
    expect(out).toHaveLength(2300)
    expect(new Set(out.map((r) => r.roleId)).size).toBe(2300)
    expect(Math.max(...fetched)).toBeLessThanOrEqual(150)
  })
})
