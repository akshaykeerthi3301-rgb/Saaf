import { createClient } from '@/lib/supabase/server'

/**
 * Feedback, the inbox and survey answers (migration 0044). The caller's client throughout:
 * the owner-only / founder-written policies are the security; user_id filters are for
 * correctness. A missing table surfaces as 'missing-update', never as a failure the
 * candidate is blamed for.
 */
export type WriteResult = { ok: true } | { ok: false; reason: 'missing-update' | 'failed' | 'duplicate' }

const missing = (e: { code?: string } | null) => e?.code === '42P01' || e?.code === 'PGRST205'

export async function writeFeedback(userId: string, kind: string, message: string, page: string | null): Promise<WriteResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('feedback').insert({ user_id: userId, kind, message, page })
  return error ? { ok: false, reason: missing(error) ? 'missing-update' : 'failed' } : { ok: true }
}

export type InboxItem = { id: string; title: string; body: string; href: string | null; at: string; read: boolean }

export async function readInbox(userId: string): Promise<{ items: InboxItem[]; stored: boolean }> {
  const supabase = await createClient()
  const [msgs, reads] = await Promise.all([
    supabase.from('inbox_messages').select('id, title, body, href, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('inbox_reads').select('message_id').eq('user_id', userId),
  ])
  if (msgs.error) return { items: [], stored: false }
  const seen = new Set(((reads.data ?? []) as { message_id: string }[]).map((r) => r.message_id))
  return {
    stored: true,
    items: ((msgs.data ?? []) as { id: string; title: string; body: string; href: string | null; created_at: string }[])
      .map((m) => ({ id: m.id, title: m.title, body: m.body, href: m.href, at: m.created_at, read: seen.has(m.id) })),
  }
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const supabase = await createClient()
  await supabase.from('inbox_reads').upsert(ids.slice(0, 50).map((message_id) => ({ user_id: userId, message_id })), { onConflict: 'user_id,message_id', ignoreDuplicates: true })
}

export async function writeSurveyAnswer(userId: string, surveyId: string, answer: string, note: string | null): Promise<WriteResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('survey_answers').insert({ user_id: userId, survey_id: surveyId, answer, note })
  if (!error) return { ok: true }
  if (error.code === '23505') return { ok: false, reason: 'duplicate' }
  return { ok: false, reason: missing(error) ? 'missing-update' : 'failed' }
}
