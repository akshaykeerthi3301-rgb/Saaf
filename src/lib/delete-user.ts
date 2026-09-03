import { createServiceClient } from '@/lib/supabase/service'

/**
 * Delete an auth user and everything that cascades from it.
 *
 * Lives here rather than in the server action because an ESLint rule forbids
 * src/app from importing the service-role client — and that rule is right.
 * Deleting an auth user is the one operation with no user-facing API, so the
 * privilege is isolated to this file, and the CALLER is responsible for having
 * already established that `userId` is the signed-in user's own id.
 */
export async function deleteUserAndData(userId: string): Promise<{ ok: boolean }> {
  const admin = createServiceClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  return { ok: !error }
}
