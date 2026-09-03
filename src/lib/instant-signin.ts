import { createServiceClient } from '@/lib/supabase/service'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Generate a valid sign-in token for an email, without sending anything.
 *
 * Isolated here for the same reason src/lib/delete-user.ts isolates its
 * service-role call — an ESLint rule forbids src/app from importing the
 * service-role client directly, and that rule is right. This is a deliberate,
 * documented trade: no inbox round-trip means no ownership check on the
 * address. src/app/actions/confirm-profile.ts never marks a profile reaching
 * this path as email_verified, which is what keeps an unverified address out
 * of the daily digest — see ingest/digest.ts.
 *
 * `generateLink({ type: 'magiclink' })` creates a first-time email as a side
 * effect, but GoTrue then labels the token's own `verification_type` as
 * 'signup', not 'magiclink' — verifyOtp rejects a mismatched type outright.
 * Verified empirically against this project's Supabase instance (the request
 * as `type: 'magiclink'`, the response as `verification_type: 'signup'`), so
 * the returned type is whatever GoTrue actually assigned, not the request type.
 */
export async function generateSignInToken(
  email: string
): Promise<{ tokenHash: string; type: EmailOtpType } | { error: string }> {
  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data.properties?.hashed_token) {
    return { error: error?.message ?? 'Could not generate a sign-in token.' }
  }
  return { tokenHash: data.properties.hashed_token, type: data.properties.verification_type }
}
