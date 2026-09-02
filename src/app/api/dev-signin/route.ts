import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * DEV ONLY — sign in as the seeded test user without sending email.
 *
 * Exists so the signed-in app can be exercised before Resend is configured.
 * Refuses to run outside development and only ever signs in the one fixture
 * account. Delete once magic-link sign-in works end to end (TASK-007).
 *
 * Cookie note worth keeping: writing cookies through the request-scoped
 * `cookies()` store and then returning a fresh NextResponse.redirect() loses
 * them — the new response carries none of them. The session must be written
 * onto the response object that is actually returned, which is why the client
 * below is constructed around `response` rather than `cookies()`.
 */
const TEST_EMAIL = 'test+rohan@saaf.local'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !serviceKey || !anonKey) {
    return NextResponse.json({ error: 'Credentials missing' }, { status: 500 })
  }

  const { createClient: createAdmin } = await import('@supabase/supabase-js')
  const admin = createAdmin(url, serviceKey, { auth: { persistSession: false } })

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
    options: { redirectTo: 'http://localhost:3000/auth/callback' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const linkRes = await fetch(data.properties!.action_link, { redirect: 'manual' })
  const frag = new URLSearchParams((linkRes.headers.get('location') ?? '').split('#')[1] ?? '')
  const access_token = frag.get('access_token')
  const refresh_token = frag.get('refresh_token')
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'No tokens in redirect' }, { status: 500 })
  }

  const response = NextResponse.redirect('http://localhost:3000/today')

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) =>
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  })
  const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token })
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  return response
}
