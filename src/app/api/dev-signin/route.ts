import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { createDevSessionTokens } from '@/lib/services/auth'

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
 *     deployments, which are also built in production mode. The service in
 *     @/lib/services/auth repeats the check, so the privilege is not guarded
 *     by this file alone.
 *  2. It signs in exactly ONE hard-coded address. There is no email parameter,
 *     so it cannot be pointed at another account by editing the URL. That
 *     policy lives HERE, next to the thing it protects, rather than inside the
 *     service — which deliberately does not decide who may sign in.
 *  3. It mints a real Supabase session through the admin API rather than
 *     faking one. Nothing about auth is bypassed or weakened — the same
 *     session a magic link would produce, without the email round trip.
 *
 * ⚠️ THE ADMIN CALLS MOVED TO @/lib/services/auth ON 2026-09-08, AND THAT WAS
 * A SECURITY FIX, NOT TIDYING. This route used to reach the service-role
 * client by importing `@supabase/supabase-js` directly — which sidestepped the
 * `no-restricted-imports` rule that forbids `src/app/` from importing
 * `@/lib/supabase/service`. The guarantee had quietly become procedural (a
 * runtime check inside one file) instead of structural (a lint rule that
 * cannot be forgotten). `eslint.config.mjs` now restricts the upstream package
 * in `src/app/**` and `src/components/**` as well, so no route can hand-roll
 * an admin client again.
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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Credentials missing' }, { status: 500 })
  }

  const tokens = await createDevSessionTokens(DEV_EMAIL, 'http://localhost:3000/auth/callback')
  if ('error' in tokens) {
    return NextResponse.json({ error: tokens.error }, { status: 500 })
  }

  const response = NextResponse.redirect('http://localhost:3000/today')

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [],
      setAll: (toSet) =>
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  })
  const { error: sErr } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  })
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  return response
}
