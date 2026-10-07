import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Hidden jobs and saved filters, against a fake profiles row. These are the
 * paths that cannot be walked in a browser until migration 0030 is applied.
 */
const db = vi.hoisted(() => ({ row: {} as Record<string, unknown> | null, error: null as { message: string } | null, writes: [] as Record<string, unknown>[] }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: db.error }) }) }),
      update: (patch: Record<string, unknown>) => ({ eq: async () => { db.writes.push(patch); return { error: db.error } } }),
    }),
  }),
}))

const { readFeedPrefs, setRoleHidden, MAX_HIDDEN } = await import('../feed-prefs')
const { EMPTY_VIEW } = await import('@/lib/feed-query')

beforeEach(() => { db.row = {}; db.error = null; db.writes = [] })

describe('readFeedPrefs', () => {
  it('says "not stored" instead of failing when migration 0030 is missing', async () => {
    db.error = { message: 'column profiles.hidden_role_ids does not exist' }
    const p = await readFeedPrefs('u')
    expect(p.stored).toBe(false)
    expect(p.hidden.size).toBe(0)
  })

  it('rebuilds saved filters through the whitelist — junk and injected keys are dropped', async () => {
    db.row = {
      hidden_role_ids: ['r1'],
      saved_filters: [
        { name: 'Remote PM', view: { remote: true, q: 'pm', href: 'javascript:alert(1)' } },
        { name: '', view: { remote: true } },
        'not an object',
      ],
    }
    const p = await readFeedPrefs('u')
    expect(p.hidden.has('r1')).toBe(true)
    expect(p.saved).toEqual([{ name: 'Remote PM', view: { ...EMPTY_VIEW, remote: true, q: 'pm' } }])
  })

  it('restores a drawer filter exactly as it was saved, and drops a tampered one (TASK-155)', async () => {
    const drawer = { posted: '7', level: 'mid', type: 'intern', pay: 12, skip: 'Accenture,TCS', sort: 'new' }
    db.row = {
      saved_filters: [
        { name: 'Mid interns', view: { remote: true, ...drawer } },
        { name: 'Tampered', view: { posted: 'forever', level: 'god', pay: 9e9, skip: 5 } },
      ],
    }
    const p = await readFeedPrefs('u')
    expect(p.saved).toEqual([
      { name: 'Mid interns', view: { ...EMPTY_VIEW, remote: true, posted: '7', level: 'mid', type: 'intern', pay: 12, skip: 'Accenture,TCS', sort: 'new' } },
      { name: 'Tampered', view: EMPTY_VIEW },
    ])
  })
})

describe('setRoleHidden', () => {
  it('adds and removes one role', async () => {
    db.row = { hidden_role_ids: ['a'] }
    await setRoleHidden('u', 'b', true)
    expect(db.writes.at(-1)).toEqual({ hidden_role_ids: ['a', 'b'] })
    db.row = { hidden_role_ids: ['a', 'b'] }
    await setRoleHidden('u', 'a', false)
    expect(db.writes.at(-1)).toEqual({ hidden_role_ids: ['b'] })
  })

  it('keeps the newest past the cap', async () => {
    db.row = { hidden_role_ids: Array.from({ length: MAX_HIDDEN }, (_, i) => `r${i}`) }
    await setRoleHidden('u', 'newest', true)
    const written = db.writes.at(-1)?.hidden_role_ids as string[]
    expect(written).toHaveLength(MAX_HIDDEN)
    expect(written.at(-1)).toBe('newest')
    expect(written[0]).toBe('r1')
  })

  it('reports failure when the column is missing', async () => {
    db.error = { message: 'column does not exist' }
    expect((await setRoleHidden('u', 'x', true)).ok).toBe(false)
  })
})
