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
): Promise<{ tokenHash: string; type: EmailOtpType; isNewAccount: boolean } | { error: string }> {
  const admin = createServiceClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data.properties?.hashed_token) {
    return { error: error?.message ?? 'Could not generate a sign-in token.' }
  }
  const type = data.properties.verification_type
  /**
   * ⚠️ WHETHER THIS CALL CREATED THE ACCOUNT — AND IT MUST, OR NOBODY SIGNS IN.
   * "Anyone can type anyone else's address" was weighed above only as a
   * digest risk. It was an account takeover: for an EXISTING address the same
   * token is a session for THAT account — its profile, phone, salary
   * expectation, saved résumés and the delete button. Measured 2026-09-23 with
   * a throwaway user: a new address comes back typed 'signup', aged 0 s; the
   * same address a second time comes back 'magiclink' and verifies into the
   * same user id. Both signals are required, so a change in GoTrue's typing
   * fails closed (docs/QA-AUDIT.md QA-27, TASK-106).
   */
  const createdAt = Date.parse(data.user?.created_at ?? '')
  const isNewAccount = type === 'signup' && Number.isFinite(createdAt) && Date.now() - createdAt < 60_000
  return { tokenHash: data.properties.hashed_token, type, isNewAccount }
}
