'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Leave the account, keeping it.
 *
 * There was no way to do this until 2026-09-07. The only `signOut()` in the
 * codebase sat inside `deleteAccount()`, so the sole route out of a session was
 * to destroy the account — which surfaced the moment a second person tried the
 * product on a machine already signed in as someone else.
 *
 * Nothing privileged happens here. It clears the session cookies and sends the
 * visitor to the landing page; every row they own is untouched and signing back
 * in returns them to the same shortlist.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
