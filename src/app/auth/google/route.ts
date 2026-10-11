import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { NEXT_COOKIE, postSignInPath } from '@/lib/next-path'
import { REF_COOKIE } from '@/lib/credits'
import { claimReferral } from '@/lib/services/credits'

/**
 * Finish a Google sign-in that happened in the browser (Google Identity Services — see src/lib/google-signin.ts).
 *
 * The page posts the signed ID token and the raw nonce; Supabase verifies Google's signature, the audience (our client
 * id) and that the nonce matches the hash Google signed, then sets the session cookies on this response. Everything
 * after that is /auth/callback's own tail — referral claim, "where were they going", onboarding first when the profile
 * is unconfirmed — answered as JSON for the page to navigate to.
 *
 * It is not a CSRF risk: the token is the credential, it is single-use through the nonce, and a forged request cannot
 * produce one for a victim's account.
 */
const body = z.object({ credential: z.string().min(20).max(4096), nonce: z.string().min(8).max(128) })

export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: parsed.data.credential, nonce: parsed.data.nonce })
  if (error) return NextResponse.json({ ok: false, error: 'rejected' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  await claimReferral(request.cookies.get(REF_COOKIE)?.value)
  const { data: profile } = await supabase.from('profiles').select('confirmed_at').eq('id', user.id).single()
  const path = postSignInPath(Boolean(profile?.confirmed_at), request.cookies.get(NEXT_COOKIE)?.value)

  const response = NextResponse.json({ ok: true, path })
  response.cookies.delete(NEXT_COOKIE)
  response.cookies.delete(REF_COOKIE)
  return response
}
