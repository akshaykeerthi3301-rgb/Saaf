/**
 * DEV ONLY. Mint a session for the test user and print the cookie
 * @supabase/ssr expects, so the signed-in app can be exercised in a browser
 * before Resend is configured.
 *
 * This is not the production path. Real sign-in uses signInWithOtp from the
 * browser, which is PKCE and lands on /auth/callback with ?code=. The admin
 * generateLink endpoint returns an implicit-flow fragment instead, which a
 * server route can never read — fragments are not sent to the server.
 */
import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ref = new URL(url).hostname.split('.')[0]
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data, error } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: 'test+rohan@saaf.local',
    options: { redirectTo: 'http://localhost:3000/auth/callback' },
  })
  if (error) { console.error(error.message); process.exit(1) }

  const res = await fetch(data.properties!.action_link, { redirect: 'manual' })
  const loc = res.headers.get('location') ?? ''
  const frag = new URLSearchParams(loc.split('#')[1] ?? '')

  const session = {
    access_token: frag.get('access_token'),
    refresh_token: frag.get('refresh_token'),
    expires_in: Number(frag.get('expires_in') ?? 3600),
    expires_at: Number(frag.get('expires_at') ?? Math.floor(Date.now() / 1000) + 3600),
    token_type: frag.get('token_type') ?? 'bearer',
    user: data.user,
  }

  console.log(`sb-${ref}-auth-token`)
  console.log('base64-' + Buffer.from(JSON.stringify(session)).toString('base64'))
}
main()
