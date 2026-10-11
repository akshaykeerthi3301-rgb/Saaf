import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { readAnswerBank, writeAnswerBank } from '@/lib/services/answer-bank'
import { MAX_ANSWER, MAX_QUESTION, upsertAnswer } from '@/lib/answer-bank'

/**
 * An answer the candidate just gave in the panel to a question an application form asked — kept in their own answer bank
 * (Profile → Templates), so the next form that asks the same question is filled. Signed-in only.
 *
 * Not for demographic or credential questions: the extension never asks those (autofill.js `neverFromBank`), and this
 * route stores only what it is given for the candidate's own account.
 */
export const dynamic = 'force-dynamic'

const body = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION),
  answer: z.string().trim().min(1).max(MAX_ANSWER),
})

export async function POST(req: NextRequest) {
  const gate = await requireExtensionUser(req, { scope: 'answer' })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, 'bad-request')
  const { bank, stored } = await readAnswerBank(gate.user.userId)
  if (!stored) return json({ ok: false, error: 'not-stored' }, { status: 503 })
  const next = upsertAnswer(bank, parsed.data.question, parsed.data.answer)
  if (next === bank) return json({ ok: false, error: 'full' }, { status: 409 })
  const res = await writeAnswerBank(gate.user.userId, next)
  return json({ ok: res.ok })
}
