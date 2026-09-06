import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * DEVELOPMENT ONLY — sign in as the founder without sending an email.
 *
 * Restored 2026-09-06 at the founder's request. An earlier version of this
 * route existed for the fixture account and was deleted when magic-link
 * sign-in started working; deleting it also removed the only way to see any
 * signed-in screen locally, which meant the shortlist, the tracker and the
 * profile could be rewritten but never looked at. Every screen ported without
 * it is a screen shipped unseen.
 *
 * Three things keep this from being a back door:
 *
 *  1. It refuses outside development. `NODE_ENV` is 'production' on every
 *     Vercel deployment, so this route 404s there — including on preview
 *     deployments, which are also built in production mode.
 *  2. It signs in exactly ONE hard-coded address. There is no email parameter,
 *     so it cannot be pointed at another account by editing the URL.
 *  3. It mints a real Supabase session through the admin API rather than
 *     faking one. Nothing about auth is bypassed or weakened — the same
 *     session a magic link would produce, without the email round trip.
 *
 * Google OAuth is deliberately NOT wired up yet; that lands after the build.
 *
 * Cookie note worth keeping: writing cookies through the request-scoped
 * `cookies()` store and then returning a fresh NextResponse.redirect() loses
 * them, because the new response carries none of them. The session has to be
 * written onto the response object that is actually returned, which is why the
 * client below is built around `response` rather than `cookies()`.
 */
const DEV_EMAIL = 'akshaykeerthi3301@gmail.com'

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

  // Create the account on first use so this works against a fresh database.
  // Already-registered is the expected case and is not an error.
  const { error: cErr } = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    email_confirm: true,
  })
  if (cErr && !/already/i.test(cErr.message)) {
    return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: DEV_EMAIL,
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
