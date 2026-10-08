import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The agent's actions (TASK-191): each re-authenticates, validates what the browser sends, queues only in
 * 'queue' mode whatever the browser asks, and remembers only what was actually queued.
 */
const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  stored: true,
  mode: 'queue' as 'off' | 'suggest' | 'queue',
  picks: [{ roleId: '00000000-0000-4000-8000-000000000001', title: 'PM', company: 'Acme', score: 88, applyUrl: 'https://boards.greenhouse.io/a/jobs/1' }] as unknown[],
  proposeArgs: [] as unknown[],
  written: [] as unknown[],
  marked: [] as unknown[],
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }) }))
vi.mock('@/lib/services/agent', () => ({
  readAgentSettings: async () => ({ settings: { mode: h.mode, weeklyTarget: 5, minScore: 75, queued: [{ id: 'keep', at: '2026-10-01T00:00:00Z' }] }, stored: h.stored }),
  writeAgentSettings: async (_u: string, s: unknown) => { h.written.push(s); return { ok: true } },
  proposeForCandidate: async (_u: string, o: unknown) => { h.proposeArgs.push(o); return { settings: { mode: h.mode }, stored: h.stored, appliedThisWeek: 0, picks: h.picks } },
  markQueued: async (_u: string, ids: string[]) => { h.marked.push(ids); return { ok: true } },
}))

const { saveAgentSettings, proposeAutoQueue, confirmAutoQueued } = await import('../agent')
beforeEach(() => { h.user = { id: 'u1' }; h.stored = true; h.mode = 'queue'; h.proposeArgs = []; h.written = []; h.marked = [] })

describe('saveAgentSettings', () => {
  it('saves the three choices and keeps the list of roles already queued', async () => {
    expect(await saveAgentSettings({ mode: 'suggest', weeklyTarget: 10, minScore: 80 })).toEqual({ ok: true })
    expect(h.written[0]).toMatchObject({ mode: 'suggest', weeklyTarget: 10, minScore: 80, queued: [{ id: 'keep' }] })
  })
  it('refuses a mode, target or score that is not on the menu', async () => {
    for (const bad of [{ mode: 'yolo', weeklyTarget: 5, minScore: 75 }, { mode: 'queue', weeklyTarget: 500, minScore: 75 }, { mode: 'queue', weeklyTarget: 5, minScore: 1 }]) {
      expect((await saveAgentSettings(bad as never)).ok).toBe(false)
    }
    expect(h.written).toEqual([])
  })
  it('needs a session, and says plainly when the database update is missing', async () => {
    h.user = null
    expect(await saveAgentSettings({ mode: 'off', weeklyTarget: 0, minScore: 60 })).toEqual({ ok: false, error: 'Not signed in.' })
    h.user = { id: 'u1' }; h.stored = false
    expect(await saveAgentSettings({ mode: 'off', weeklyTarget: 0, minScore: 60 })).toMatchObject({ ok: false, error: expect.stringContaining('0048') })
  })
})

describe('proposeAutoQueue', () => {
  it('asks only for roles when the candidate chose Auto-queue — and says so to the service', async () => {
    const r = await proposeAutoQueue()
    expect(r).toEqual({ ok: true, jobs: [{ roleId: '00000000-0000-4000-8000-000000000001', url: 'https://boards.greenhouse.io/a/jobs/1', title: 'PM', company: 'Acme' }] })
    expect(h.proposeArgs).toEqual([{ onlyMode: 'queue' }])
  })
  it('queues nothing in any other mode, however it is called', async () => {
    for (const m of ['off', 'suggest'] as const) { h.mode = m; expect(await proposeAutoQueue()).toEqual({ ok: true, jobs: [] }) }
  })
  it('needs a session', async () => {
    h.user = null
    expect(await proposeAutoQueue()).toEqual({ ok: false })
    expect(h.proposeArgs).toEqual([])
  })
})

describe('confirmAutoQueued', () => {
  it('remembers only well-formed role ids, from the signed-in candidate', async () => {
    expect((await confirmAutoQueued(['00000000-0000-4000-8000-000000000001'])).ok).toBe(true)
    expect(h.marked).toEqual([['00000000-0000-4000-8000-000000000001']])
    expect((await confirmAutoQueued(['not-a-uuid'])).ok).toBe(false)
    expect((await confirmAutoQueued(Array(21).fill('00000000-0000-4000-8000-000000000001'))).ok).toBe(false)
    h.user = null
    expect((await confirmAutoQueued(['00000000-0000-4000-8000-000000000001'])).ok).toBe(false)
  })
})
