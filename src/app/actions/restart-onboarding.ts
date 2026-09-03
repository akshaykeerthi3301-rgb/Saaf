'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Re-run onboarding with a different résumé.
 *
 * Clearing `confirmed_at` is all it takes: gates refuse to run against an
 * unconfirmed profile, and `/today` sends an unconfirmed user back to the flow.
 * Existing gate results stay until the new profile is confirmed and recomputes
 * them, so the candidate is never staring at an empty list mid-way.
 *
 * Built for testing several résumés before showing anyone, but it is a real
 * feature: a candidate who changes jobs or finishes a qualification needs it too.
 */
export async function restartOnboarding(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { error } = await supabase
    .from('profiles')
    .update({ confirmed_at: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) redirect('/profile?error=restart_failed')
  redirect('/start')
}
