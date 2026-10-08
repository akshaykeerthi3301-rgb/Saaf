import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EMPTY_VIEW, parseFeedQuery, type FeedView } from '@/lib/feed-query'
import { REMOTE_LOCATION } from '../public-jobs'

/** Search all roles (TASK-217): reads as the signed-in candidate, applies what the database can, scores on the spot. */
const h = vi.hoisted(() => ({
  calls: [] as [string, unknown[]][],
  profile: null as unknown,
  profileError: null as unknown,
  roles: [] as unknown[],
  count: 0,
  rolesError: null as unknown,
  rolesQueried: false,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (t: string) => {
      if (t === 'profiles') {
        const c: Record<string, unknown> = {}
        c.select = () => c; c.eq = () => c
        c.maybeSingle = async () => ({ data: h.profile, error: h.profileError })
        return c
      }
      h.rolesQueried = true
      const c: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'or', 'gte', 'in', 'not', 'order', 'limit']) c[m] = (...a: unknown[]) => { h.calls.push([m, a]); return c }
      c.then = (res: (v: unknown) => unknown) => res({ data: h.roles, count: h.count, error: h.rolesError })
      return c
    },
  }),
}))

const { exploreIndex } = await import('../explore')
const view = (o: Partial<FeedView>): FeedView => ({ ...EMPTY_VIEW, ...o })
const called = (m: string) => h.calls.filter(([n]) => n === m).map(([, a]) => a)
const me = { confirmed_at: '2026-10-01', years_experience: 3, current_title: 'Product Manager', city: 'Bengaluru', credential: 'none', preferred_role: 'Product Manager', preferred_roles: null, keywords: null, work_mode_preference: null, skills: ['sql'] }
const role = (id: string, title: string, over: Record<string, unknown> = {}) => ({
  id, title, company_name: 'Acme', apply_url: 'https://boards.greenhouse.io/acme/jobs/1', description: 'Own the roadmap with SQL.', location_raw: 'Bengaluru',
  city: 'Bengaluru', unread_experience_mention: false, role_requirements: [], posted_at: '2026-10-07T00:00:00Z', first_seen_at: '2026-10-07T00:00:00Z',
  pay_min: null, pay_max: null, pay_currency: null, pay_period: null, work_mode: null, employment_type: null, ...over,
})

beforeEach(() => { h.calls = []; h.profile = me; h.profileError = null; h.roles = []; h.count = 0; h.rolesError = null; h.rolesQueried = false })

describe('exploreIndex', () => {
  it('sends an unconfirmed profile back to confirm without reading any roles', async () => {
    h.profile = { ...me, confirmed_at: null }
    expect((await exploreIndex('u1', view({ q: 'analyst' }))).kind).toBe('unconfirmed')
    expect(h.rolesQueried).toBe(false)
  })
  it('refuses an open-ended search without touching the roles table', async () => {
    expect((await exploreIndex('u1', view({ min80: true }))).kind).toBe('open-ended')
    expect(h.rolesQueried).toBe(false)
  })
  it('reads only open roles in India and applies every filter the database can honour', async () => {
    h.count = 0
    await exploreIndex('u1', parseFeedQuery('remote data analyst in Pune posted this week full-time excluding TCS'))
    expect(called('eq')).toContainEqual(['in_india', true])
    expect(called('is')).toContainEqual(['closed_at', null])
    expect(called('or')).toContainEqual(['title.ilike.%data%,company_name.ilike.%data%'])
    expect(called('or')).toContainEqual(['title.ilike.%analyst%,company_name.ilike.%analyst%'])
    // The city carries the scorer's own spellings, joined into one OR group.
    expect(called('or').some(([f]) => String(f).includes('city.ilike.%pune%'))).toBe(true)
    expect(called('or')).toContainEqual([REMOTE_LOCATION])
    expect(called('gte')[0][0]).toBe('posted_at')
    expect(called('in')).toContainEqual(['employment_type', ['fulltime']])
    expect(called('not')).toContainEqual(['company_name', 'ilike', '%TCS%'])
    expect(called('limit')).toEqual([[1000]])
  })
  it('sends several work modes and "only these employers" to the query too (TASK-219)', async () => {
    await exploreIndex('u1', view({ q: 'manager', mode: 'remote,hybrid', only: 'Zoho' }))
    expect(called('in')).toContainEqual(['work_mode', ['remote', 'hybrid']])
    expect(called('or').some(([f]) => String(f) === 'company_name.ilike.%Zoho%')).toBe(true)
  })
  it('scores what it finds with the real scorer, best first, and says how many fit in all', async () => {
    h.count = 1432
    h.roles = [role('r1', 'Warehouse Supervisor'), role('r2', 'Product Manager', { pay_min: 1500000, pay_max: 2000000, pay_currency: 'INR', pay_period: 'year' })]
    const r = await exploreIndex('u1', view({ q: 'manager' }))
    expect(r.kind).toBe('ok')
    if (r.kind !== 'ok') return
    expect(r.total).toBe(1432)
    expect(r.scanned).toBe(2)
    expect(r.shown.map((x) => x.roleId)).toEqual(['r2', 'r1'])
    expect(r.shown[0].score).toBeGreaterThan(r.shown[1].score)
    expect(r.shown[0].postedAt).toBe('2026-10-07T00:00:00Z')
    expect(r.shown[0].statedPay).toMatch(/₹|L|lakh|15/i)
    expect(r.shown[1].statedPay).toBeNull()
  })
  it('applies Match 80+ after scoring and counts what it set aside', async () => {
    h.roles = [role('r1', 'Warehouse Supervisor'), role('r2', 'Product Manager')]
    const r = await exploreIndex('u1', view({ q: 'manager', min80: true }))
    if (r.kind !== 'ok') throw new Error('expected ok')
    expect(r.shown.every((x) => x.score >= 80)).toBe(true)
    expect(r.removedAfterScoring + r.shown.length).toBe(2)
  })
  it('names the filters it could not apply', async () => {
    const r = await exploreIndex('u1', view({ q: 'manager', level: 'senior', pay: 20 }))
    if (r.kind !== 'ok') throw new Error('expected ok')
    expect(r.plan.notApplied).toHaveLength(2)
  })
  it('reports a failed read as failed, not as an empty market', async () => {
    h.rolesError = { message: 'boom' }
    expect((await exploreIndex('u1', view({ q: 'analyst' }))).kind).toBe('failed')
    h.rolesError = null; h.profileError = { message: 'boom' }
    expect((await exploreIndex('u1', view({ q: 'analyst' }))).kind).toBe('failed')
  })
})
