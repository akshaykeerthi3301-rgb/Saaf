'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateSignInToken } from '@/lib/instant-signin'
import { REF_COOKIE } from '@/lib/credits'
import { claimReferral } from '@/lib/services/credits'

const schema = z.string().email('Enter a valid email address.')

export type InstantSignInResponse =
  | { ok: true; path: '/today' | '/start' }
  | { ok: false; error: string }

/**
 * Sign in immediately — no inbox round-trip.
 *
 * generateSignInToken does the one thing the service role is allowed to do
 * here (mint a token); this function consumes it through the normal,
 * RLS-respecting client, exactly like /auth/callback does for a real magic
 * link. Redirect logic (confirmed profile → /today, else /start) is
 * duplicated from that route rather than shared, since it's three lines and
 * the two call sites shouldn't have to import from each other to stay in
 * sync. Returns a result rather than calling redirect() itself, matching
 * confirmProfile's shape — the caller shows the error inline before deciding
 * to navigate.
 */
export async function instantSignIn(email: string): Promise<InstantSignInResponse> {
  const parsed = schema.safeParse(email)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' }
  }

  const token = await generateSignInToken(parsed.data)
  if ('error' in token) return { ok: false, error: 'Could not sign you in. Try again in a moment.' }

  // ⚠️ AN EMAIL ALONE MAY START AN ACCOUNT, NEVER OPEN ONE. With no inbox
  // round-trip there is no proof the typist owns the address, so an existing
  // account is refused before its token is used — Google, which does prove
  // ownership, is the way back in (it links to the same account by email).
  // See generateSignInToken for the measurement (QA-27, TASK-106).
  if (!token.isNewAccount) {
    return {
      ok: false,
      error:
        'That email already has a Jobinko account. To keep it yours, sign in with Google — ' +
        'anyone can type an email address, so we do not open an existing account on one alone.',
    }
  }

  // token_hash verification takes no email — it's a different overload from
  // the {email, token, type} form, and mixing them is rejected outright. The
  // type must match what GoTrue actually assigned the token (see
  // instant-signin.ts) — not always 'magiclink', even for this flow.
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token.tokenHash,
    type: token.type,
  })
  if (error) return { ok: false, error: 'Could not sign you in. Try again in a moment.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Could not sign you in. Try again in a moment.' }

  // An invite link (/r/<code>) left a cookie; only a brand-new account reaches here, which is what the database wants.
  const jar = await cookies()
  await claimReferral(jar.get(REF_COOKIE)?.value)
  jar.delete(REF_COOKIE)

  const { data: profile } = await supabase
    .from('profiles').select('confirmed_at').eq('id', user.id).single()

  return { ok: true, path: profile?.confirmed_at ? '/today' : '/start' }
}
