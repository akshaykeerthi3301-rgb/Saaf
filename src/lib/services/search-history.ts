import { createClient } from '@/lib/supabase/server'
import type { FeedView } from '@/lib/feed-query'
import { MAX_HISTORY, sanitizeHistory, type HistoryEntry } from '@/lib/search-history'

/**
 * The candidate's own search history (migration 0040). The caller's client
 * throughout: the owner-only policies are the security, the user_id filters are
 * correctness. Reads are tolerant — `stored: false` when 0040 is not applied.
 */
export async function readSearchHistory(userId: string): Promise<{ entries: HistoryEntry[]; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('search_history').select('id, text, view, rating, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(MAX_HISTORY)
  if (error) return { entries: [], stored: false }
  return { entries: sanitizeHistory(data), stored: true }
}

/** Keep a search; the same words again move it to the top and replace what it was read as. */
export async function recordSearch(userId: string, text: string, view: FeedView): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('search_history').upsert(
    { user_id: userId, text: text.trim().slice(0, 300), view, rating: null, created_at: new Date().toISOString() },
    { onConflict: 'user_id,text' },
  )
  return { ok: !error }
}

export async function rateSearch(userId: string, id: string, rating: 'up' | 'down' | null): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('search_history').update({ rating }).eq('user_id', userId).eq('id', id)
  return { ok: !error }
}

export async function clearSearchHistory(userId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('search_history').delete().eq('user_id', userId)
  return { ok: !error }
}
