import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * QA-27: typing an existing account's email signed the typist in as that
 * account. The token minting and the session exchange are faked; the rule
 * under test is the action's.
 */
const state = vi.hoisted(() => ({
  token: { tokenHash: 'h', type: 'signup', isNewAccount: true } as object,
  verified: 0,
}))

vi.mock('@/lib/instant-signin', () => ({ generateSignInToken: async () => state.token }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: async () => { state.verified++; return { error: null } },
      getUser: async () => ({ data: { user: { id: 'u1' } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { confirmed_at: null } }) }) }) }),
  }),
}))

const { instantSignIn } = await import('../instant-signin')

beforeEach(() => { state.verified = 0 })

describe('instantSignIn — an email may start an account, never open one', () => {
  it('refuses an existing account without using its token', async () => {
    state.token = { tokenHash: 'h', type: 'magiclink', isNewAccount: false }
    const res = await instantSignIn('someone@example.com')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/sign in with Google/)
    expect(state.verified).toBe(0)
  })

  it('starts a brand-new account as before', async () => {
    state.token = { tokenHash: 'h', type: 'signup', isNewAccount: true }
    const res = await instantSignIn('new@example.com')
    expect(res).toEqual({ ok: true, path: '/start' })
    expect(state.verified).toBe(1)
  })
})
