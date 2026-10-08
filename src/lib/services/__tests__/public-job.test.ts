import { describe, it, expect, vi, beforeEach } from 'vitest'

/** One public job page: a posting the employer has taken down is not served (the function's own documented contract). */
const h = vi.hoisted(() => ({ role: null as unknown, calls: [] as [string, unknown[]][] }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'order', 'limit']) chain[m] = (...a: unknown[]) => { h.calls.push([m, a]); return chain }
    chain.maybeSingle = async () => ({ data: h.role, error: null })
    chain.then = (res: (v: unknown) => unknown) => res({ data: [], error: null, count: 0 })
    return { from: () => chain }
  },
}))

const { readPublicJob } = await import('../public-jobs')
const ID = '0b6c1f0e-5d3a-4a52-9a0e-6f2f3f6f7a11'
const role = (closed_at: string | null) => ({ id: ID, title: 'Product Manager', company_name: 'Acme', description: 'Own the roadmap.', city: 'Bengaluru', location_raw: 'Bengaluru', in_india: true, apply_url: 'https://boards.greenhouse.io/acme/jobs/1', posted_at: null, first_seen_at: '2026-10-08T00:00:00Z', closed_at })
beforeEach(() => { h.calls = []; h.role = null })

describe('readPublicJob', () => {
  it('serves a role the employer still lists', async () => {
    h.role = role(null)
    expect((await readPublicJob(ID))?.title).toBe('Product Manager')
  })
  it('carries the employer\'s own contract type and work mode through to the page', async () => {
    h.role = { ...role(null), employment_type: 'contract', work_mode: 'remote' }
    const job = await readPublicJob(ID)
    expect(job?.employmentType).toBe('contract')
    expect(job?.workMode).toBe('remote')
  })
  it('returns null for a role the employer has taken down, so the page 404s and the crawl drops it', async () => {
    h.role = role('2026-10-08T07:58:18Z')
    expect(await readPublicJob(ID)).toBeNull()
  })
})
