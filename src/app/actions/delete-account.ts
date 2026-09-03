'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteUserAndData } from '@/lib/delete-user'

/**
 * One click, no email, irreversible.
 *
 * Deleting the auth user cascades through profiles, gate_results and
 * refusal_reports — every table holding candidate data references auth.users
 * with ON DELETE CASCADE, so the guarantee is a database property rather than
 * application cleanup somebody can forget to write.
 */
export async function deleteAccount(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // The ownership check above is what makes this safe: we only ever pass the
  // caller's own id. The privileged call itself is isolated in src/lib.
  const { ok } = await deleteUserAndData(user.id)
  // Form actions must return void, so a failure redirects with a reason rather
  // than returning one — otherwise the error would vanish and the account would
  // look deleted when it is not.
  if (!ok) redirect('/profile?error=delete_failed')

  await supabase.auth.signOut()
  redirect('/?deleted=1')
}
