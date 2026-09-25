'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { QUESTION_KINDS, deleteOwnQuestion, reportQuestion } from '@/lib/services/question-bank'

/** Report a question you were asked; delete your own. Signed in, limited per user. */
const schema = z.object({
  company: z.string().trim().min(1).max(200),
  roleTitle: z.string().trim().max(200),
  kind: z.enum(QUESTION_KINDS),
  question: z.string().trim().min(10, 'Write the question out — at least 10 characters.').max(600),
  askedIn: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
})

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function addInterviewQuestion(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Check the question.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  if (!checkRateLimit(user.id, { scope: 'question-report', limit: 20, windowMs: 60 * 60 * 1000 }).ok) {
    return { ok: false as const, error: 'That is a lot of questions in an hour — try again later.' }
  }
  const { askedIn, ...rest } = parsed.data
  const ok = await reportQuestion(user.id, { ...rest, askedIn: askedIn ? `${askedIn}-01` : null })
  if (!ok) return { ok: false as const, error: 'This needs a database update (0031) that has not been applied yet.' }
  revalidatePath('/interview-prep')
  return { ok: true as const }
}

export async function removeInterviewQuestion(input: { id: string }) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false as const }
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  const ok = await deleteOwnQuestion(user.id, parsed.data.id)
  if (ok) revalidatePath('/interview-prep')
  return { ok }
}
