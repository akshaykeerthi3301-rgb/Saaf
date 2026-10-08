'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { classify, helpCard, type Answer } from '@/lib/assistant'
import { answerFor } from '@/lib/services/assistant'

/**
 * "Ask Jobinko". Re-authenticates (an exported action is its own entry point); the user
 * comes from the session. Limited per user — each question is a handful of reads, but
 * "reads" is still what a loop would spend.
 */
const schema = z.object({ question: z.string().trim().min(1).max(300) })
const LIMIT = { scope: 'ask-saaf', limit: 40, windowMs: 10 * 60 * 1000 }

export async function askSaaf(input: z.input<typeof schema>): Promise<{ ok: true; answer: Answer } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: true, answer: { intent: 'help', cards: [{ type: 'text', text: 'Ask me something about your shortlist or your tracker.' }, helpCard()] } }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to ask.' }
  const limit = checkRateLimit(user.id, LIMIT)
  if (!limit.ok) return { ok: false, error: `That is a lot of questions in a row — try again in ${limit.retryAfterSeconds} s.` }
  try {
    return { ok: true, answer: await answerFor(user.id, classify(parsed.data.question)) }
  } catch {
    return { ok: false, error: 'I could not read your data just now. That is on our side — try again in a moment.' }
  }
}
