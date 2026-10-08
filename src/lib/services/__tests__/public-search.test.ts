import { describe, it, expect, vi, beforeEach } from 'vitest'

/** The public search reads `roles` only, in a fixed shape, shallowly, and from tokens — never from the raw query. */
const h = vi.hoisted(() => ({ calls: [] as [string, unknown[]][], rows: [] as unknown[], error: null as unknown, count: 0 }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'or', 'ilike', 'order', 'range', 'gte', 'limit']) {
      chain[m] = (...a: unknown[]) => { h.calls.push([m, a]); return chain }
    }
    chain.then = (res: (v: unknown) => unknown) => res({ data: h.rows, error: h.error, count: h.count })
    return { from: (t: string) => { h.calls.push(['from', [t]]); return chain } }
  },
}))

const { searchPublicJobs, readTicker } = await import('../public-jobs')
const row = (i: number) => ({ id: `id${i}`, title: `Role ${i}`, company_name: 'Acme', city: 'bengaluru', apply_url: 'https://boards.greenhouse.io/x/jobs/1', posted_at: null, first_seen_at: '2026-10-08T00:00:00Z' })
const called = (m: string) => h.calls.filter(([n]) => n === m).map(([, a]) => a)

beforeEach(() => { h.calls = []; h.rows = []; h.error = null; h.count = 0 })

describe('searchPublicJobs', () => {
  it('reads roles only, India only, and matches each word against title and employer', async () => {
    await searchPublicJobs({ q: 'Product Analyst', city: 'Pune' })
    expect(called('from')).toEqual([['roles']])
    expect(called('eq')).toContainEqual(['in_india', true])
    expect(called('or')).toEqual([['title.ilike.%product%,company_name.ilike.%product%'], ['title.ilike.%analyst%,company_name.ilike.%analyst%']])
    expect(called('ilike')).toEqual([['city', '%pune%']])
  })
  it('never returns a posting the employer has taken down', async () => {
    await searchPublicJobs({ q: 'analyst' })
    expect(called('is')).toEqual([['closed_at', null]])
  })
  it('never lets typed punctuation into a filter', async () => {
    await searchPublicJobs({ q: 'x),title.ilike.%,id.eq.1' })
    for (const [filter] of called('or') as string[][]) expect(filter).toMatch(/^title\.ilike\.%[\p{L}\p{N}+#]+%,company_name\.ilike\.%[\p{L}\p{N}+#]+%$/u)
  })
  it('is shallow: one page of twenty, a flag for more, and a hard stop at page three', async () => {
    h.rows = Array.from({ length: 21 }, (_, i) => row(i))
    const p1 = await searchPublicJobs({ page: 1 })
    expect(p1.rows).toHaveLength(20)
    expect(p1.more).toBe(true)
    expect(called('range')[0]).toEqual([0, 20])
    h.calls = []
    const p9 = await searchPublicJobs({ page: 9 })
    expect(called('range')[0]).toEqual([40, 60])
    expect(p9.more).toBe(false)
  })
  it('returns only display fields — no description, no apply link', async () => {
    h.rows = [row(1)]
    const { rows } = await searchPublicJobs({})
    expect(Object.keys(rows[0]).sort()).toEqual(['city', 'company', 'easyApply', 'firstSeenAt', 'id', 'postedAt', 'title'])
  })
  it('a database error is an empty list, not a crash', async () => {
    h.error = { message: 'x' }
    expect(await searchPublicJobs({ q: 'analyst' })).toEqual({ rows: [], more: false })
  })
})

describe('readTicker', () => {
  it('is null when nothing could be read, so the landing page simply omits it', async () => {
    h.rows = []
    expect(await readTicker()).toBeNull()
  })
  it('counts and lists only roles the employer still lists', async () => {
    h.rows = [row(1)]
    await readTicker()
    expect(called('is')).toEqual([['closed_at', null], ['closed_at', null]])
  })
})
