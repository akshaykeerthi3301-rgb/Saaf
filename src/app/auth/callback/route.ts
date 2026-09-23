import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NEXT_COOKIE, postSignInPath } from '@/lib/next-path'

/**
 * Magic-link exchange. Routes to /start when the profile is unconfirmed and
 * /today when it is — gates never run on an unconfirmed profile, so landing a
 * new user on the shortlist would show them an empty list they would reasonably
 * read as a verdict.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  if (!code) return NextResponse.redirect(`${origin}/signin?error=missing_code`)

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(`${origin}/signin?error=expired`)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/signin?error=no_session`)

  const { data: profile } = await supabase
    .from('profiles').select('confirmed_at').eq('id', user.id).single()

  // Back to the page they were trying to reach, when one was remembered and
  // is safe to return to; onboarding first for an unconfirmed profile.
  const target = postSignInPath(Boolean(profile?.confirmed_at), request.cookies.get(NEXT_COOKIE)?.value)
  const response = NextResponse.redirect(`${origin}${target}`)
  response.cookies.delete(NEXT_COOKIE)
  return response
}
