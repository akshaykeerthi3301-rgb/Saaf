'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { feedViewSchema } from '@/lib/feed-query'
import { clearSearchHistory, rateSearch, recordSearch } from '@/lib/services/search-history'
import { worthRecording } from '@/lib/search-history'

/**
 * Search history (TASK-172). Each export re-authenticates; the user comes from the
 * session. A failure here must never get in the way of the search itself, so the
 * box calls these without waiting on the outcome for anything but the strip.
 */
async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const recordSchema = z.object({ text: z.string().trim().min(1).max(300), view: feedViewSchema })
const LIMIT = { scope: 'search-history', limit: 60, windowMs: 10 * 60 * 1000 }

export async function recordSearchAction(input: z.input<typeof recordSchema>) {
  const parsed = recordSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const }
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  if (!checkRateLimit(user.id, LIMIT).ok) return { ok: false as const }
  // A sentence that read as no filter at all is not worth keeping.
  if (!worthRecording(parsed.data.text, parsed.data.view)) return { ok: true as const, kept: false }
  const res = await recordSearch(user.id, parsed.data.text, parsed.data.view)
  return { ok: res.ok, kept: res.ok }
}

const rateSchema = z.object({ id: z.string().uuid(), rating: z.enum(['up', 'down']).nullable() })

export async function rateSearchAction(input: z.input<typeof rateSchema>) {
  const parsed = rateSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const }
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  return { ok: (await rateSearch(user.id, parsed.data.id, parsed.data.rating)).ok }
}

export async function clearSearchHistoryAction() {
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  return { ok: (await clearSearchHistory(user.id)).ok }
}
