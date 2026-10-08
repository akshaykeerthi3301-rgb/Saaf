import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * rewriteStudioLine (TASK-188, F-410): "Edit with AI" on one line. It must re-authenticate, be
 * rate-limited, read the POSTING by id, hand the model only the candidate's own line, and show a
 * refusal from the fabrication guard instead of hiding it.
 */
const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  limitOk: true,
  out: { text: 'Owned the UPI autopay launch', provider: 'groq' } as unknown,
  calls: [] as unknown[][],
  contexts: [] as unknown[][],
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => (h.limitOk ? { ok: true } : { ok: false, retryAfterSeconds: 30 }) }))
vi.mock('@/lib/services/cookie', () => ({ getCookieContext: async (...a: unknown[]) => { h.contexts.push(a); return { ok: true, context: { role: { title: 'PM', company: 'Acme', description: 'Own the roadmap.' } } } } }))
vi.mock('@/lib/services/resume-documents', () => ({ getResume: async () => null }))
vi.mock('@/lib/resume-rewrite', () => ({
  rewriteResume: async () => null, RewriteError: class extends Error {},
  rewriteOneBullet: async (...a: unknown[]) => { h.calls.push(a); return h.out },
}))
vi.mock('@/lib/parse/llm', () => ({ PROVIDER_LABEL: { groq: 'Groq' }, ModelBusyError: class extends Error {} }))

const { rewriteStudioLine } = await import('../tailor-studio')
const ROLE = '00000000-0000-4000-8000-000000000001'

beforeEach(() => { h.user = { id: 'u1' }; h.limitOk = true; h.calls = []; h.contexts = []; h.out = { text: 'Owned the UPI autopay launch', provider: 'groq' } })

describe('rewriteStudioLine', () => {
  it('returns the model’s line and hands it only the candidate’s own words and the posting from the database', async () => {
    const r = await rewriteStudioLine({ roleId: ROLE, line: 'Responsible for the UPI autopay launch' })
    expect(r).toEqual({ ok: true, line: 'Owned the UPI autopay launch', providerLabel: 'Groq' })
    expect(h.contexts).toEqual([['u1', ROLE]])
    expect(h.calls[0][0]).toBe('Responsible for the UPI autopay launch')
    expect(h.calls[0][2]).toMatchObject({ title: 'PM', description: 'Own the roadmap.' })
  })
  it('shows the guard’s refusal rather than hiding it, and leaves the line alone', async () => {
    h.out = { refused: 'added a figure that was not in your line' }
    const r = await rewriteStudioLine({ roleId: ROLE, line: 'Responsible for the UPI autopay launch' })
    expect(r).toMatchObject({ ok: false, refused: true })
    expect((r as { error: string }).error).toContain('Your line is unchanged')
  })
  it('needs a session and respects the rate limit, before any model call', async () => {
    h.user = null
    expect(await rewriteStudioLine({ roleId: ROLE, line: 'Responsible for the UPI autopay launch' })).toEqual({ ok: false, error: 'Not signed in.' })
    h.user = { id: 'u1' }; h.limitOk = false
    expect(await rewriteStudioLine({ roleId: ROLE, line: 'Responsible for the UPI autopay launch' })).toMatchObject({ ok: false })
    expect(h.calls).toEqual([])
  })
  it('refuses a malformed request without any read', async () => {
    for (const bad of [{ roleId: 'nope', line: 'Responsible for the UPI autopay launch' }, { roleId: ROLE, line: 'short' }, { roleId: ROLE, line: 'x'.repeat(601) }]) {
      expect((await rewriteStudioLine(bad as never)).ok).toBe(false)
    }
    expect(h.contexts).toEqual([])
  })
})
