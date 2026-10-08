import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * checkRoleTitle (TASK-173): what a typed title would return, against a fake `roles`
 * table whose counts are keyed by the exact websearch string the matcher would run.
 */
const db = vi.hoisted(() => ({
  counts: {} as Record<string, number>,
  failFor: new Set<string>(),
  asked: [] as string[],
  openOnly: [] as unknown[][],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: (...a: unknown[]) => ({
            textSearch: async (_col: string, q: string) => {
              db.asked.push(q)
              db.openOnly.push(a)
              // Postgres full-text search ignores case; so does this fake.
              return db.failFor.has(q) ? { count: null, error: { message: 'boom' } } : { count: db.counts[q.toLowerCase()] ?? 0, error: null }
            },
          }),
        }),
      }),
    }),
  }),
}))

const { checkRoleTitle } = await import('../role-catalogue')

beforeEach(() => { db.counts = {}; db.failFor = new Set(); db.asked = []; db.openOnly = [] })

describe('checkRoleTitle', () => {
  it('returns the live count for the title as typed, and the closest roles with their own counts', async () => {
    db.counts = { 'founders office': 0, 'chief of staff': 12, 'strategy manager': 31, 'business operations': 9 }
    const r = await checkRoleTitle('Founders Office')
    expect(r.count).toBe(0)
    expect(db.asked).toContain('Founders Office') // the matcher's own query, on the raw title
    for (const s of r.suggestions) expect(s.count).toBe(db.counts[s.role.toLowerCase()] ?? 0)
  })

  it('counts only roles the employer still lists — a taken-down posting is not "a live role"', async () => {
    await checkRoleTitle('Chief of Staff')
    expect(db.openOnly.length).toBeGreaterThan(0)
    for (const a of db.openOnly) expect(a).toEqual(['closed_at', null])
  })

  it('a title with postings says how many, and does not suggest itself', async () => {
    db.counts = { 'data analyst': 40 }
    const r = await checkRoleTitle('data analyst')
    expect(r.count).toBe(40)
    expect(r.suggestions.map((s) => s.role)).not.toContain('Data Analyst')
  })

  it('finds the role behind a typo and counts it', async () => {
    db.counts = { 'product manager': 36 }
    const r = await checkRoleTitle('prodcut managr')
    expect(r.suggestions[0]).toEqual({ role: 'Product Manager', count: 36 })
  })

  it('refuses nonsense input without touching the database', async () => {
    for (const bad of ['', ' ', 'a', 'x'.repeat(61)]) {
      expect(await checkRoleTitle(bad)).toEqual({ count: null, suggestions: [] })
    }
    expect(await checkRoleTitle(42 as unknown as string)).toEqual({ count: null, suggestions: [] })
    expect(db.asked).toEqual([])
  })

  it('says "could not check" (null), never zero, when the query fails', async () => {
    db.failFor = new Set(['Quantum Gardener'])
    const r = await checkRoleTitle('Quantum Gardener')
    expect(r.count).toBeNull()
  })

  it('answers a repeat from memory — the index changes once a day', async () => {
    db.counts = { 'legal counsel': 5 }
    await checkRoleTitle('Legal Counsel')
    const first = db.asked.length
    await checkRoleTitle('legal counsel')
    expect(db.asked).toHaveLength(first)
  })
})
