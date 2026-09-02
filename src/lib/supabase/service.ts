import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. BYPASSES RLS ENTIRELY.
 *
 * For the GitHub Actions ingest job only. It must never be reachable from a
 * request handler, a server component, or anything under src/app/ — an ESLint
 * `no-restricted-imports` rule enforces that, and a reachable path here is a
 * defect, not a style problem.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'createServiceClient() requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
        'This client is for the ingest job only and must not run in the web app.'
    )
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
