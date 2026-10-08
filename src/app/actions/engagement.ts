'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { surveyById, validAnswer } from '@/lib/surveys'
import { markRead, readInbox, writeFeedback, writeSurveyAnswer } from '@/lib/services/engagement'

/**
 * Send feedback, read the inbox, answer a survey. Each re-authenticates; the user comes
 * from the session, never from the caller.
 */
const MISSING = 'This needs a database update (0044) that has not been applied yet.'

async function sessionUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const feedbackSchema = z.object({
  kind: z.enum(['idea', 'problem', 'praise', 'other']),
  message: z.string().trim().min(3, 'Say a little more — a few words at least.').max(2000),
  page: z.string().max(200).regex(/^\//).optional(),
})

export async function sendFeedback(input: z.input<typeof feedbackSchema>) {
  const parsed = feedbackSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'That could not be sent.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Sign in to send feedback.' }
  if (!checkRateLimit(user.id, { scope: 'feedback', limit: 10, windowMs: 60 * 60 * 1000 }).ok) return { ok: false as const, error: 'That is a lot in an hour — try again later.' }
  const r = await writeFeedback(user.id, parsed.data.kind, parsed.data.message, parsed.data.page ?? null)
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.reason === 'missing-update' ? MISSING : 'That did not send. Try again in a moment.' }
}

export async function loadInbox() {
  const user = await sessionUser()
  if (!user) return { ok: false as const }
  return { ok: true as const, ...(await readInbox(user.id)) }
}

const idsSchema = z.array(z.string().uuid()).max(50)

export async function markInboxRead(ids: z.input<typeof idsSchema>) {
  const parsed = idsSchema.safeParse(ids)
  const user = await sessionUser()
  if (!parsed.success || !user) return { ok: false as const }
  await markRead(user.id, parsed.data)
  return { ok: true as const }
}

const answerSchema = z.object({ surveyId: z.string().max(60), answer: z.string().max(40), note: z.string().trim().max(500).optional() })

export async function answerSurvey(input: z.input<typeof answerSchema>) {
  const parsed = answerSchema.safeParse(input)
  const survey = parsed.success ? surveyById(parsed.data.surveyId) : null
  if (!parsed.success || !survey || !validAnswer(survey, parsed.data.answer)) return { ok: false as const, error: 'That answer could not be read.' }
  const user = await sessionUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const r = await writeSurveyAnswer(user.id, survey.id, parsed.data.answer, parsed.data.note || null)
  // Already answered is fine — the card is simply done.
  if (r.ok || r.reason === 'duplicate') return { ok: true as const }
  return { ok: false as const, error: r.reason === 'missing-update' ? MISSING : 'That did not send. Try again in a moment.' }
}
