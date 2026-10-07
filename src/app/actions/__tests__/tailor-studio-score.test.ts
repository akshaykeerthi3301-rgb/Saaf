import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * scoreDraft (TASK-159): the live score of a tailored draft. It must re-authenticate,
 * validate what the browser sends, be rate-limited, and read the POSTING from the
 * database by id — never from the client.
 */
const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  limitOk: true,
  context: { ok: true, context: { role: { title: 'Customer Success Manager', company: 'Diligent', description: 'You will own renewals. SQL and Excel help. 3+ years of experience required.' } } } as unknown,
  contextCalls: [] as unknown[][],
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: () => (h.limitOk ? { ok: true } : { ok: false, retryAfterSeconds: 30 }) }))
vi.mock('@/lib/services/cookie', () => ({ getCookieContext: async (...a: unknown[]) => { h.contextCalls.push(a); return h.context } }))
vi.mock('@/lib/services/resume-documents', () => ({ getResume: async () => null }))
vi.mock('@/lib/resume-rewrite', () => ({ rewriteResume: async () => null, RewriteError: class extends Error {} }))
vi.mock('@/lib/parse/llm', () => ({ PROVIDER_LABEL: {}, ModelBusyError: class extends Error {} }))

const { scoreDraft } = await import('../tailor-studio')

const ROLE = '00000000-0000-4000-8000-000000000001'
const sections: ResumeSections = {
  contact: { name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210', links: [] },
  summary: 'Customer success manager with six years in SaaS renewals and expansion across mid-market accounts.',
  experience: [
    { title: 'Customer Success Manager', employer: 'Acme Software', dates: 'Jan 2020 – Present', location: 'Pune', bullets: ['Owned a book of 40 mid-market accounts and renewed 94% of them.', 'Cut churn by 12% by rebuilding the onboarding plan with product and support.', 'Ran quarterly business reviews with finance and operations stakeholders.'] },
    { title: 'Associate', employer: 'Beta Systems', dates: 'Jun 2017 – Dec 2019', location: 'Pune', bullets: ['Handled onboarding for 30 new customers a quarter.', 'Wrote the playbook the team still uses for escalations.'] },
  ],
  education: [{ qualification: 'B.Com', institution: 'Pune University', dates: '2017' }],
  skills: ['Excel', 'SQL', 'Zendesk', 'Salesforce'],
  other: [], unplaced: 0, order: [],
}

beforeEach(() => { h.user = { id: 'u1' }; h.limitOk = true; h.contextCalls = []; h.context = { ok: true, context: { role: { title: 'Customer Success Manager', company: 'Diligent', description: 'You will own renewals. SQL and Excel help. 3+ years of experience required.' } } } })

describe('scoreDraft', () => {
  it('returns a number for a real draft, scored against the posting', async () => {
    const r = await scoreDraft({ roleId: ROLE, sections })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(typeof r.score).toBe('number'); expect(r.score).toBeGreaterThan(0); expect(r.score).toBeLessThanOrEqual(100) }
  })

  it('reads the posting from the database by the role id and the signed-in user — not from anything the client sends', async () => {
    await scoreDraft({ roleId: ROLE, sections })
    expect(h.contextCalls).toEqual([['u1', ROLE]])
  })

  it('requires a session', async () => {
    h.user = null
    expect(await scoreDraft({ roleId: ROLE, sections })).toEqual({ ok: false, error: 'Not signed in.' })
    expect(h.contextCalls).toEqual([])
  })

  it('refuses a malformed request without a database read', async () => {
    for (const bad of [{ roleId: 'nope', sections }, { roleId: ROLE, sections: { ...sections, skills: Array(81).fill('x') } }, { roleId: ROLE, sections: { ...sections, summary: 'x'.repeat(2001) } }, {}]) {
      const r = await scoreDraft(bad as never)
      expect(r.ok).toBe(false)
    }
    expect(h.contextCalls).toEqual([])
  })

  it('is rate-limited, and says the edits are kept', async () => {
    h.limitOk = false
    const r = await scoreDraft({ roleId: ROLE, sections })
    expect(r).toMatchObject({ ok: false })
    expect((r as { error: string }).error).toContain('edits are kept')
  })

  it('relays a context error (no profile, role gone) instead of a score', async () => {
    h.context = { ok: false, error: 'That role is no longer in the index.' }
    expect(await scoreDraft({ roleId: ROLE, sections })).toEqual({ ok: false, error: 'That role is no longer in the index.' })
  })

  it('answers null — not zero — when the draft is too short for the check to run', async () => {
    const tiny = { ...sections, summary: null, experience: [], education: [], skills: [] }
    const r = await scoreDraft({ roleId: ROLE, sections: tiny })
    expect(r).toEqual({ ok: true, score: null })
  })

  it('a better draft never scores lower than the same draft with the lines stripped to a stub', async () => {
    const full = await scoreDraft({ roleId: ROLE, sections })
    const thin = await scoreDraft({ roleId: ROLE, sections: { ...sections, experience: [{ ...sections.experience[0], bullets: ['Did work.'] }] } })
    expect(full.ok && thin.ok).toBe(true)
    if (full.ok && thin.ok && full.score !== null && thin.score !== null) expect(full.score).toBeGreaterThanOrEqual(thin.score)
  })
})
