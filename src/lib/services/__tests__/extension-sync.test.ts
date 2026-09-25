import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Filing roles the extension queued. The risk is a duplicate card every time
 * the queue drains twice (hand-added rows have no role_id, so the unique index
 * does not cover them), and a card being dragged backwards by a late "saved".
 */
type Row = { id: string; apply_url: string; status: string }
const db = vi.hoisted(() => ({ rows: [] as Row[], inserts: [] as Record<string, unknown>[], updates: [] as { id: string; patch: Record<string, unknown> }[] }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ not: async () => ({ data: db.rows }) }),
      insert: async (row: Record<string, unknown>) => { db.inserts.push(row); return { error: null } },
      update: (patch: Record<string, unknown>) => ({
        eq: async (_col: string, id: string) => { db.updates.push({ id, patch }); return { error: null } },
      }),
    }),
  }),
}))

const { fileQueuedRoles, pageKey } = await import('../extension-sync')

beforeEach(() => { db.rows = []; db.inserts = []; db.updates = [] })

const item = (url: string, status: 'saved' | 'applying' = 'saved') => ({ url, title: 'PM', company: 'Acme', status })

describe('fileQueuedRoles', () => {
  it('files a new role in the stage it was queued in', async () => {
    const res = await fileQueuedRoles('u1', [item('https://jobs.lever.co/acme/1', 'applying')])
    expect(res).toEqual({ handled: ['https://jobs.lever.co/acme/1'], filed: 1 })
    expect(db.inserts[0]).toMatchObject({ user_id: 'u1', role_id: null, status: 'applying', apply_url: 'https://jobs.lever.co/acme/1' })
  })

  it('does not file a page already on the board, even with a different query string', async () => {
    db.rows = [{ id: 'a', apply_url: 'https://jobs.lever.co/acme/1/?utm_source=x', status: 'interviewing' }]
    const res = await fileQueuedRoles('u1', [item('https://jobs.lever.co/acme/1#apply', 'applying')])
    expect(res.filed).toBe(0)
    expect(res.handled).toHaveLength(1)
    expect(db.inserts).toHaveLength(0)
    // Interviewing is never dragged back to Applying.
    expect(db.updates).toHaveLength(0)
  })

  it('promotes a Saved card to Applying when the form was filled', async () => {
    db.rows = [{ id: 'a', apply_url: 'https://jobs.lever.co/acme/1', status: 'saved' }]
    await fileQueuedRoles('u1', [item('https://jobs.lever.co/acme/1', 'applying')])
    expect(db.updates).toEqual([{ id: 'a', patch: expect.objectContaining({ status: 'applying' }) }])
  })

  it('files the same page once when it is queued twice in one batch', async () => {
    const res = await fileQueuedRoles('u1', [item('https://x.io/j/1'), item('https://x.io/j/1/')])
    expect(res.filed).toBe(1)
    expect(db.inserts).toHaveLength(1)
  })
})

describe('pageKey', () => {
  it('ignores query, hash and a trailing slash', () => {
    expect(pageKey('https://a.io/j/1/?x=1#y')).toBe('https://a.io/j/1')
  })
  it('passes a non-URL through', () => {
    expect(pageKey('not a url')).toBe('not a url')
  })
})
