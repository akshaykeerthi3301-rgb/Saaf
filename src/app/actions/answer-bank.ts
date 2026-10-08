'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { MAX_ANSWER, MAX_ENTRIES, MAX_QUESTION, sanitizeAnswerBank } from '@/lib/answer-bank'
import { fileAskedQuestions as fileAsked, writeAnswerBank } from '@/lib/services/answer-bank'

/**
 * Both re-authenticate: an exported action is its own entry point. The whole list is
 * replaced on save, so removing a row or clearing an answer takes it away from the
 * extension at its next sync.
 */
const saveSchema = z.array(z.object({
  q: z.string().max(MAX_QUESTION), a: z.string().max(MAX_ANSWER), auto: z.boolean(),
})).max(MAX_ENTRIES)

export async function saveAnswerBank(input: z.input<typeof saveSchema>) {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Those answers could not be read.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await writeAnswerBank(user.id, sanitizeAnswerBank(parsed.data))
  return res.ok ? { ok: true as const } : { ok: false as const, error: 'This needs a database update (0046) that has not been applied yet.' }
}

/** Questions the extension queued from forms. Untrusted input from the candidate's browser: shape and sizes are checked here. */
const askedSchema = z.array(z.object({ key: z.string().min(1).max(MAX_QUESTION), question: z.string().min(1).max(MAX_QUESTION) })).max(50)

export async function fileAskedQuestions(input: z.input<typeof askedSchema>) {
  const parsed = askedSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, handled: [] as string[], added: 0 }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, handled: [] as string[], added: 0 }
  return { ok: true as const, ...(await fileAsked(user.id, parsed.data)) }
}
