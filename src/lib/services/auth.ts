import { createServiceClient } from '@/lib/supabase/service'

/**
 * Privileged auth operations, isolated so `src/app/` never holds admin rights.
 *
 * ⚠️ THIS FILE EXISTS TO CLOSE A HOLE, AND THE HOLE IS WORTH NAMING.
 *
 * `eslint.config.mjs` forbids `src/app/**` from importing
 * `@/lib/supabase/service`. That rule is the codebase's structural guarantee:
 * nothing reachable from a request handler can bypass RLS. But the rule is
 * pattern-based, and `src/app/api/dev-signin/route.ts` used to reach the same
 * privilege by importing the UPSTREAM package instead —
 * `await import('@supabase/supabase-js')` with SUPABASE_SERVICE_ROLE_KEY — so
 * the rule reported clean on the one file doing exactly the thing it forbids.
 *
 * The fix is NOT to re-export an admin client from a path the guard does not
 * recognise. That would launder the privilege: `src/app/` would still hold it,
 * and it would now look blessed. So this module exports OPERATIONS, never a
 * client. The privilege stays here; the caller gets a result.
 *
 * That is the same shape as `@/lib/delete-user.ts` and
 * `@/lib/instant-signin.ts`, which exist for this exact reason and say so in
 * their own comments. The companion change is in `eslint.config.mjs`:
 * `@supabase/supabase-js` is now restricted in `src/app/**` and
 * `src/components/**` too, so the upstream route out is closed rather than
 * merely unused.
 */

/**
 * Mint a real Supabase session for one email, with no inbox round-trip.
 * DEVELOPMENT ONLY.
 *
 * Nothing about auth is bypassed or weakened — this produces the same session
 * a magic link would, by driving the admin API and following the link itself.
 * What it skips is the email, not the verification.
 *
 * ⚠️ THE PRODUCTION GUARD IS REPEATED HERE RATHER THAN TRUSTED TO THE CALLER.
 * `src/app/actions/bench.ts` makes the same argument and it holds here more
 * strongly: an exported function is its own entry point, and the next caller
 * of this one has not been written yet. NODE_ENV is 'production' on every
 * Vercel deployment — preview deployments included, since those also build in
 * production mode — so this cannot mint a session on any deployed environment.
 *
 * The caller is responsible for deciding WHICH email is allowed. This function
 * deliberately does not know: the policy ("one hard-coded founder address, no
 * parameter from the URL") belongs at the route, where it is visible next to
 * the thing it protects.
 */
export async function createDevSessionTokens(
  email: string,
  redirectTo: string
): Promise<{ accessToken: string; refreshToken: string } | { error: string }> {
  if (process.env.NODE_ENV === 'production') {
    return { error: 'Dev sign-in is not available outside development.' }
  }

  // createServiceClient() THROWS when the key is absent. The route this
  // replaced checked for the key itself and returned a JSON 500, so catching
  // here keeps that response shape rather than turning a missing env var into
  // an unhandled exception — the message is the helpful one from
  // @/lib/supabase/service, which the route's own check never produced.
  let admin: ReturnType<typeof createServiceClient>
  try {
    admin = createServiceClient()
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Create the account on first use so this works against a fresh database.
  // Already-registered is the expected case and is not an error.
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createError && !/already/i.test(createError.message)) {
    return { error: createError.message }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })
  if (error || !data.properties?.action_link) {
    return { error: error?.message ?? 'Could not generate a sign-in link.' }
  }

  // Follow the link ourselves rather than emailing it. `redirect: 'manual'`
  // stops fetch from consuming the redirect, because the tokens are in the
  // Location header's FRAGMENT — which a followed redirect would discard.
  const linkResponse = await fetch(data.properties.action_link, { redirect: 'manual' })
  const fragment = new URLSearchParams(
    (linkResponse.headers.get('location') ?? '').split('#')[1] ?? ''
  )
  const accessToken = fragment.get('access_token')
  const refreshToken = fragment.get('refresh_token')
  if (!accessToken || !refreshToken) {
    return { error: 'No tokens in redirect' }
  }

  return { accessToken, refreshToken }
}
