import { describe, it, expect, vi, beforeEach } from 'vitest'

/** A role page reads `roles` only, filters by Saaf's own taxonomy (never by the visitor), and counts what it shows. */
const h = vi.hoisted(() => ({ calls: [] as [string, unknown[]][], rows: [] as unknown[], count: 0 }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'or', 'ilike', 'order', 'range', 'gte', 'limit']) chain[m] = (...a: unknown[]) => { h.calls.push([m, a]); return chain }
    chain.then = (res: (v: unknown) => unknown) => res({ data: h.rows, error: null, count: h.count })
    return { from: (t: string) => { h.calls.push(['from', [t]]); return chain } }
  },
}))

const { readRolePage, readRemoteHub, listSeoPagesForSitemap } = await import('../public-jobs')
const { cityFromSlug } = await import('@/lib/seo-pages')
const row = (i: number, company: string, city: string, title = 'Product Manager') => ({ id: `id${i}`, title, company_name: company, city, apply_url: 'https://x.test', posted_at: null, first_seen_at: '2026-10-08T00:00:00Z' })
const called = (m: string) => h.calls.filter(([n]) => n === m).map(([, a]) => a)
beforeEach(() => { h.calls = []; h.rows = []; h.count = 0 })

describe('readRolePage', () => {
  it('matches the role as a phrase in the title, in India, and (on a city page) any spelling of the city', async () => {
    await readRolePage('Product Manager', cityFromSlug('bengaluru'))
    expect(called('from')).toEqual([['roles'], ['roles']])
    expect(called('ilike')).toEqual([['title', '%product manager%'], ['title', '%product manager%']])
    expect(called('or')[0][0]).toContain('city.ilike.%bengaluru%')
    expect(called('or')[0][0]).toContain('city.ilike.%bangalore%')
    expect(called('eq')).toContainEqual(['in_india', true])
  })
  it('counts and lists only roles the employer still lists — the total and the sample both skip closed postings', async () => {
    await readRolePage('Product Manager', null)
    expect(called('is')).toEqual([['closed_at', null], ['closed_at', null]])
  })
  it('reports the exact total, twenty newest, and the top employers and cities of the sample', async () => {
    h.count = 36
    h.rows = [...Array.from({ length: 25 }, (_, i) => row(i, i < 14 ? 'Acme' : 'Beta', i < 20 ? 'Bangalore' : 'Pune'))]
    const d = await readRolePage('Product Manager', null)
    expect(d.total).toBe(36)
    expect(d.latest).toHaveLength(20)
    expect(d.employers[0]).toEqual({ company: 'Acme', n: 14 })
    expect(d.cities[0]).toEqual({ city: 'Bengaluru', n: 20 }) // "Bangalore" resolves to the taxonomy's own name
    expect(d.sampled).toBe(25)
  })
})

describe('listSeoPagesForSitemap', () => {
  it('lists a role or role-in-city page only when it has enough roles to be worth indexing', async () => {
    h.rows = [
      ...Array.from({ length: 6 }, (_, i) => row(i, 'A', 'Bangalore', 'Product Manager')),
      ...Array.from({ length: 2 }, (_, i) => row(10 + i, 'B', 'Pune', 'Product Manager')),
    ]
    const { roles, pairs } = await listSeoPagesForSitemap()
    expect(roles).toContain('product-manager')
    expect(pairs).toEqual([{ role: 'product-manager', city: 'bengaluru' }]) // 2 in Pune is below the threshold
  })
})

describe('readRemoteHub', () => {
  it('uses the posting\'s own location words — the same rule as the feed\'s Remote filter — and nothing else', async () => {
    await readRemoteHub()
    expect(called('or')[0][0]).toBe('location_raw.ilike.%remote%,location_raw.ilike.%anywhere%,location_raw.ilike.%work from home%')
    expect(called('ilike')).toEqual([]) // no role or city narrowing
  })
  it('counts the role mix of the sample with Saaf\'s own role phrases', async () => {
    h.count = 9
    h.rows = [row(1, 'A', 'India', 'Product Manager'), row(2, 'B', 'India', 'Senior Product Manager'), row(3, 'C', 'India', 'Data Analyst'), row(4, 'C', 'India', 'Chef')]
    const d = await readRemoteHub()
    expect(d.total).toBe(9)
    expect(d.roles).toEqual([{ role: 'Product Manager', n: 2 }, { role: 'Data Analyst', n: 1 }])
  })
})
