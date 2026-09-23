import { describe, it, expect, beforeEach, vi } from 'vitest'
import { __resetRateLimits } from '@/lib/rate-limit'

/**
 * "Review & Approve" was the one unmetered model call behind a button
 * (docs/QA-AUDIT.md QA-07). The database and the model are faked; the rate
 * limiter and the action are real.
 */
const state = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  role: { title: 'Customer Success Manager', company_name: 'Almabase', description: 'Own onboarding.' } as object | null,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === 'profiles'
              ? { current_title: 'Manager', employer: 'ICICI Bank', years_experience: 2, skills: ['Excel'], domain: null, credential: 'none' }
              : state.role,
          }),
        }),
      }),
    }),
  }),
}))

const draftApplication = vi.hoisted(() => vi.fn())
vi.mock('@/lib/tailor', async (original) => ({
  ...(await original<typeof import('@/lib/tailor')>()),
  draftApplication,
}))

const { tailorForRole } = await import('../tailor')

const ROLE_ID = '4ecf1411-77f9-4455-8f1b-4ea201ef16d0'

beforeEach(() => {
  __resetRateLimits()
  state.user = { id: 'user-1' }
  state.role = { title: 'Customer Success Manager', company_name: 'Almabase', description: 'Own onboarding.' }
  draftApplication.mockReset()
  draftApplication.mockResolvedValue({ bullets: ['b'], coverNote: 'n', matched: [], provider: 'groq', removed: [] })
})

describe('tailorForRole — metered', () => {
  it('refuses a caller with no session, without drafting', async () => {
    state.user = null
    const res = await tailorForRole({ roleId: ROLE_ID })
    expect(res).toEqual({ ok: false, error: 'Not signed in.' })
    expect(draftApplication).not.toHaveBeenCalled()
  })

  it('drafts ten in the window, refuses the eleventh, and never calls the model for it', async () => {
    for (let i = 0; i < 10; i++) expect((await tailorForRole({ roleId: ROLE_ID })).ok).toBe(true)
    const res = await tailorForRole({ roleId: ROLE_ID })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/Try again in/)
      // Never a dead end: the application is still theirs to send.
      expect(res.error).toMatch(/apply directly/)
    }
    expect(draftApplication).toHaveBeenCalledTimes(10)
  })

  it('does not charge the allowance when no model would run', async () => {
    state.role = null
    for (let i = 0; i < 12; i++) await tailorForRole({ roleId: ROLE_ID })
    state.role = { title: 'CSM', company_name: 'X', description: 'Y' }
    expect((await tailorForRole({ roleId: ROLE_ID })).ok).toBe(true)
  })

  it('meters each candidate separately', async () => {
    for (let i = 0; i < 10; i++) await tailorForRole({ roleId: ROLE_ID })
    state.user = { id: 'user-2' }
    expect((await tailorForRole({ roleId: ROLE_ID })).ok).toBe(true)
  })
})
