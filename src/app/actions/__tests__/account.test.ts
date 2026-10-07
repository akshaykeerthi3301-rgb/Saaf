import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  user: { id: 'u1', email: 'asha@example.com' } as { id: string; email: string | null } | null,
  limitOk: true,
  asked: [] as string[],
  fail: false,
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => (h.limitOk ? { ok: true } : { ok: false, retryAfterSeconds: 60 }) }))
vi.mock('@/lib/services/account-export', () => ({
  readAccountExport: async (id: string, email: string | null) => {
    h.asked.push(id)
    if (h.fail) throw new Error('db down')
    return { exportedAt: '2026-10-08T10:00:00.000Z', account: { email }, profile: { id, current_title: 'CSM' }, applications: [], savedResumes: [], counts: { scoredRoles: 3, connectionsUploaded: null }, notes: [] }
  },
}))

const { exportMyData } = await import('../account')

beforeEach(() => { h.user = { id: 'u1', email: 'asha@example.com' }; h.limitOk = true; h.asked = []; h.fail = false })

describe('exportMyData', () => {
  it('gives the signed-in candidate their own data as a dated JSON file', async () => {
    const r = await exportMyData()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.filename).toBe('saaf-my-data-2026-10-08.json')
    const parsed = JSON.parse(r.json)
    expect(parsed.account.email).toBe('asha@example.com')
    expect(parsed.profile.current_title).toBe('CSM')
  })
  it('the account is the session\'s — the action takes no argument that could name another', async () => {
    expect(exportMyData.length).toBe(0)
    await exportMyData()
    expect(h.asked).toEqual(['u1'])
  })
  it('requires a session', async () => {
    h.user = null
    expect(await exportMyData()).toEqual({ ok: false, error: 'Not signed in.' })
    expect(h.asked).toEqual([])
  })
  it('is rate-limited', async () => {
    h.limitOk = false
    const r = await exportMyData()
    expect(r.ok).toBe(false)
    expect(h.asked).toEqual([])
  })
  it('a failure says nothing was changed, and does not leak the error', async () => {
    h.fail = true
    const r = await exportMyData()
    expect(r.ok).toBe(false)
    expect((r as { error: string }).error).toContain('Nothing was changed')
    expect((r as { error: string }).error).not.toContain('db down')
  })
})
