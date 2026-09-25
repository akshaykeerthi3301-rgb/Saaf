'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { readJobFromLink } from '@/lib/services/job-link'

/**
 * "Paste a link" for the tracker's add-a-job form: returns the posting's title
 * and company so the candidate does not retype them. Signed-in only — it makes
 * the server fetch a URL, which is not something to offer the open internet —
 * and limited per user, not per IP (Indian candidates routinely share one).
 */
const LINK_LIMIT = { scope: 'job-link', limit: 20, windowMs: 10 * 60 * 1000 }

const schema = z.string().trim().url().max(2000)

export async function readJobLink(input: string) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, reason: 'That is not a link we can read.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, reason: 'Not signed in.' }

  const limit = checkRateLimit(user.id, LINK_LIMIT)
  if (!limit.ok) return { ok: false as const, reason: `Too many links in a row — try again in ${limit.retryAfterSeconds} s, or type it in.` }

  return readJobFromLink(parsed.data)
}
