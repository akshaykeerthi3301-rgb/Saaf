import { createClient } from '@/lib/supabase/server'
import { sanitizeSelfId, type SelfIdAnswers } from '@/lib/self-id'

/**
 * The candidate's own typed answers to demographic questions (migration 0038).
 * Special-category personal data: the caller's client only (owner-only RLS), read
 * for the profile form, the extension sync and the data export — nothing else.
 */
export async function readSelfId(userId: string): Promise<{ answers: SelfIdAnswers; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('self_id').eq('id', userId).maybeSingle()
  if (error) return { answers: {}, stored: false }
  return { answers: sanitizeSelfId((data as { self_id: unknown } | null)?.self_id), stored: true }
}

/** Replace the whole set; an omitted question means "prefer not to say". */
export async function writeSelfId(userId: string, answers: SelfIdAnswers): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ self_id: sanitizeSelfId(answers) }).eq('id', userId)
  return { ok: !error }
}
