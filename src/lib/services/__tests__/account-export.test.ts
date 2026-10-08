import { describe, it, expect, vi, beforeEach } from 'vitest'

/** The export reads as the caller, says what it leaves out, and says "unavailable" rather than "empty". */
const db = vi.hoisted(() => ({
  profile: { id: 'u1', current_title: 'CSM', saved_filters: [] } as Record<string, unknown> | null,
  apps: { data: [{ id: 'a1', role_id: 'r1', status: 'applied' }], error: null } as { data: unknown[] | null; error: unknown },
  scored: { count: 12, error: null } as { count: number | null; error: unknown },
  connections: 5 as number | null,
  resumes: [{ id: 'x', label: 'v1', targetRole: 'CSM', score: 70, updatedAt: '2026-10-01' }] as unknown[] | 'throw',
  eqs: [] as [string, unknown][],
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: (_cols: string, opts?: { head?: boolean }) => {
        const chain = {
          eq: (col: string, val: unknown) => { db.eqs.push([`${table}.${col}`, val]); return chain },
          or: () => chain,
          maybeSingle: async () => ({ data: db.profile, error: null }),
          then: (res: (v: unknown) => unknown) => res(table === 'applications' ? db.apps : opts?.head ? db.scored : { data: [], error: null }),
        }
        return chain
      },
    }),
  }),
}))
vi.mock('@/lib/services/network', () => ({ countConnections: async () => db.connections }))
vi.mock('@/lib/services/resume-documents', () => ({
  listResumes: async () => { if (db.resumes === 'throw') throw new Error('x'); return db.resumes },
  getResume: async (_u: string, id: string) => ({ id, label: 'v1', targetRole: 'CSM', score: 70, updatedAt: '2026-10-01', sections: { summary: 'S' }, body: 'BODY' }),
}))

const { readAccountExport } = await import('../account-export')

beforeEach(() => {
  db.profile = { id: 'u1', current_title: 'CSM' }
  db.apps = { data: [{ id: 'a1', role_id: 'r1', status: 'applied' }], error: null }
  db.scored = { count: 12, error: null }
  db.connections = 5
  db.resumes = [{ id: 'x' }]
  db.eqs = []
})

describe('readAccountExport', () => {
  it('collects the profile, applications and saved résumés for the caller', async () => {
    const e = await readAccountExport('u1', 'asha@example.com')
    expect(e.account.email).toBe('asha@example.com')
    expect(e.profile).toMatchObject({ current_title: 'CSM' })
    expect(e.applications).toEqual([{ id: 'a1', role_id: 'r1', status: 'applied' }])
    expect(e.savedResumes).toEqual([{ label: 'v1', targetRole: 'CSM', updatedAt: '2026-10-01', sections: { summary: 'S' } }])
  })
  it('filters every read by the caller\'s id', async () => {
    await readAccountExport('u1', null)
    expect(db.eqs).toContainEqual(['profiles.id', 'u1'])
    expect(db.eqs).toContainEqual(['applications.user_id', 'u1'])
    expect(db.eqs).toContainEqual(['gate_results.user_id', 'u1'])
    expect(db.eqs.every(([, v]) => v === 'u1')).toBe(true)
  })
  it('counts the derived scores and the uploaded connections instead of dumping them, and says so', async () => {
    const e = await readAccountExport('u1', null)
    expect(e.counts).toEqual({ scoredRoles: 12, connectionsUploaded: 5 })
    expect(e.notes.join(' ')).toContain('counted here, not listed')
    expect(e.notes.join(' ')).toContain('other people’s')
    expect(JSON.stringify(e)).not.toContain('BODY') // the raw résumé text body is not duplicated
  })
  it('reports an unreadable part as unavailable (null), never as empty', async () => {
    db.apps = { data: null, error: { message: 'no table' } }
    db.resumes = 'throw'
    db.connections = null
    const e = await readAccountExport('u1', null)
    expect(e.applications).toBeNull()
    expect(e.savedResumes).toBeNull()
    expect(e.counts.connectionsUploaded).toBeNull()
    expect(e.notes.join(' ')).toContain('applications could not be read')
    expect(e.notes.join(' ')).toContain('saved résumés could not be read')
    expect(e.notes.join(' ')).toContain('database update')
  })
  it('carries the credit ledger and invites, and says when that update is missing', async () => {
    const e = await readAccountExport('u1', null)
    expect(e.credits).toEqual([])
    expect(e.referrals).toEqual([])
  })
  it('an empty account exports empty lists, not nulls', async () => {
    db.apps = { data: [], error: null }
    db.resumes = []
    const e = await readAccountExport('u1', null)
    expect(e.applications).toEqual([])
    expect(e.savedResumes).toEqual([])
  })
})
