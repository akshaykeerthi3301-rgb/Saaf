'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, type RateLimitOptions } from '@/lib/rate-limit'
import { getCookieContext, type CookieContext } from '@/lib/services/cookie'
import { matchedSkills } from '@/lib/tailor'
import { PROVIDER_LABEL } from '@/lib/parse/llm'
import { extractSkillPhrases } from '@/lib/taxonomy/skills'
import { draftCoverLetter, draftOutreach, scoreAnswer } from '@/lib/copilot-writer'
import { TONES, type AnswerFeedback, type OutreachMessage } from '@/lib/copilot-templates'

/**
 * The Co-Pilot tools' model calls: cover letter, outreach, mock-interview
 * scoring.
 *
 * Each follows tailor.ts exactly: the browser names a ROLE, never the text of
 * the posting or the profile (both are read here, under RLS); each
 * re-authenticates; each is metered per USER with its own scope, charged only
 * once a model will actually run. Every one degrades to a template rather than
 * failing, so "the model is busy" is never an empty screen.
 */

async function context(roleId: string): Promise<{ ok: true; userId: string; ctx: CookieContext } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const res = await getCookieContext(user.id, roleId)
  return res.ok ? { ok: true, userId: user.id, ctx: res.context } : { ok: false, error: res.error }
}

function limited(userId: string, opts: RateLimitOptions): string | null {
  const r = checkRateLimit(userId, opts)
  if (r.ok) return null
  const mins = Math.ceil(r.retryAfterSeconds / 60)
  return `You have used this a lot in a short while. Try again in ${mins === 1 ? 'a minute' : `${mins} minutes`}.`
}

// ------------------------------------------------------------------ letter

const letterSchema = z.object({ roleId: z.string().uuid(), tone: z.enum(TONES) })
const LETTER_LIMIT = { scope: 'cover-letter', limit: 8, windowMs: 10 * 60_000 }

export type CoverLetterResult =
  | { ok: true; text: string; providerLabel: string | null; dropped: { text: string; reason: string }[]; matched: string[] }
  | { ok: false; error: string }

export async function writeCoverLetter(input: z.input<typeof letterSchema>): Promise<CoverLetterResult> {
  const parsed = letterSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Pick a role and a tone.' }
  const c = await context(parsed.data.roleId)
  if (!c.ok) return c
  const busy = limited(c.userId, LETTER_LIMIT)
  if (busy) return { ok: false, error: busy }

  const matched = matchedSkills(c.ctx.me, c.ctx.role)
  const draft = await draftCoverLetter(c.ctx.me, c.ctx.role, parsed.data.tone, matched)
  return {
    ok: true,
    text: draft.text,
    providerLabel: draft.provider ? PROVIDER_LABEL[draft.provider] : null,
    dropped: draft.dropped,
    matched,
  }
}

// ---------------------------------------------------------------- outreach

const outreachSchema = z.object({ roleId: z.string().uuid() })
const OUTREACH_LIMIT = { scope: 'outreach', limit: 6, windowMs: 10 * 60_000 }

export type OutreachResult =
  | { ok: true; messages: OutreachMessage[]; providerLabel: string | null; dropped: number }
  | { ok: false; error: string }

export async function writeOutreach(input: z.input<typeof outreachSchema>): Promise<OutreachResult> {
  const parsed = outreachSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Pick a role first.' }
  const c = await context(parsed.data.roleId)
  if (!c.ok) return c
  const busy = limited(c.userId, OUTREACH_LIMIT)
  if (busy) return { ok: false, error: busy }

  const res = await draftOutreach(c.ctx.me, c.ctx.role)
  return { ok: true, messages: res.messages, providerLabel: res.provider ? PROVIDER_LABEL[res.provider] : null, dropped: res.dropped }
}

// --------------------------------------------------------------- interview

const answerSchema = z.object({
  roleId: z.string().uuid(),
  question: z.string().trim().min(5).max(500),
  answer: z.string().trim().min(1, 'Write an answer first.').max(4000),
})
const ANSWER_LIMIT = { scope: 'mock-interview', limit: 15, windowMs: 10 * 60_000 }

export type ScoreAnswerResult = { ok: true; feedback: AnswerFeedback; providerLabel: string | null } | { ok: false; error: string }

/**
 * ⚠️ THE QUESTION IS CALLER-SUPPLIED, AND THAT IS ACCEPTABLE HERE: it only
 * steers feedback on the candidate's own answer, and the sample answer it
 * returns is grounded against the profile read server-side, so a crafted
 * question cannot put an unsupported claim in front of anyone but its author.
 */
export async function scorePracticeAnswer(input: z.input<typeof answerSchema>): Promise<ScoreAnswerResult> {
  const parsed = answerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Write an answer first.' }
  const c = await context(parsed.data.roleId)
  if (!c.ok) return c
  const busy = limited(c.userId, ANSWER_LIMIT)
  if (busy) return { ok: false, error: busy }

  const keywords = extractSkillPhrases(`${c.ctx.role.title}\n${c.ctx.role.description ?? ''}`).slice(0, 12)
  const feedback = await scoreAnswer(c.ctx.me, c.ctx.role, parsed.data.question, parsed.data.answer, keywords)
  return { ok: true, feedback, providerLabel: feedback.provider ? PROVIDER_LABEL[feedback.provider] : null }
}
