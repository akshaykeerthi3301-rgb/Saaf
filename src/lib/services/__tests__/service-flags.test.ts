import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const db = vi.hoisted(() => ({ result: { data: null, error: null } as { data: unknown; error: unknown }, throws: false }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => {
    if (db.throws) throw new Error('no key')
    return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => db.result }) }) }) }
  },
}))
const { readApplyForMeStatus } = await import('../service-flags')

beforeEach(() => { db.result = { data: null, error: null }; db.throws = false; delete process.env.APPLY_FOR_ME_PAUSED })
afterEach(() => { delete process.env.APPLY_FOR_ME_PAUSED })

describe('the Apply for me kill switch', () => {
  it('is on by default', async () => {
    expect((await readApplyForMeStatus()).paused).toBe(false)
  })
  it("pauses when the row says 'true', with the founder's message", async () => {
    db.result = { data: { value: ' TRUE ', message: 'Checking a problem.' }, error: null }
    expect(await readApplyForMeStatus()).toEqual({ paused: true, message: 'Checking a problem.' })
  })
  it('stays on for any other value', async () => {
    for (const value of ['false', '', 'no', '1']) {
      db.result = { data: { value, message: 'x' }, error: null }
      expect((await readApplyForMeStatus()).paused).toBe(false)
    }
  })
  it('pauses from the environment variable even with no database at all', async () => {
    process.env.APPLY_FOR_ME_PAUSED = '1'
    db.throws = true
    expect((await readApplyForMeStatus()).paused).toBe(true)
  })
  it('a missing table, an error or a thrown client reads as not paused — the switch never fails closed', async () => {
    db.result = { data: null, error: { code: '42P01' } }
    expect((await readApplyForMeStatus()).paused).toBe(false)
    db.throws = true
    expect((await readApplyForMeStatus()).paused).toBe(false)
  })
  it('caps the message', async () => {
    db.result = { data: { value: 'true', message: 'x'.repeat(900) }, error: null }
    expect((await readApplyForMeStatus()).message).toHaveLength(200)
  })
})
