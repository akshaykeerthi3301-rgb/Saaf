'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { ModelBusyError, PROVIDER_LABEL } from '@/lib/parse/llm'
import { extractFields } from '@/lib/parse/extract'
import { parseSections } from '@/lib/parse/sections'
import { rewriteOneBullet } from '@/lib/resume-rewrite'
import { roleVocabulary, MAX_RESUME_CHARS } from '@/lib/ats-check'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'

/**
 * Sharpen one line, when the candidate asks for that line.
 *
 * ⚠️ IT EXISTS BECAUSE THE WHOLE-DOCUMENT REWRITE IS THE WRONG UNIT for most
 * of the work. The deterministic fix table handles the common cases for free
 * and instantly; this is the escape hatch for a line the candidate looks at and
 * thinks "that is still not right". One line, one model call, ~200 tokens
 * against the 1,360 a full rewrite costs.
 *
 * Public and unauthenticated like its siblings; reads no database, stores
 * nothing.
 */

const schema = z.object({
  resumeText: z.string().trim().min(50).max(MAX_RESUME_CHARS),
  entry: z.number().int().min(0).max(30),
  bullet: z.number().int().min(0).max(60),
  targetRole: z.string().trim().min(2).max(80),
  jdText: z.string().trim().max(20_000).optional(),
})

export type RewriteBulletResponse =
  | { ok: true; line: string; providerLabel: string }
  | { ok: false; error: string; refused?: boolean }

/** Twenty a ten-minute window — this is meant to be used line by line. */
const LIMIT = { limit: 20, windowMs: 10 * 60_000 }

async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function rewriteBullet(input: z.input<typeof schema>): Promise<RewriteBulletResponse> {
  const limit = checkRateLimit(await callerKey(), LIMIT)
  if (!limit.ok) {
    return { ok: false, error: 'You have rewritten a lot of lines in a short while. Try again in a few minutes.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'We could not read that line.' }
  const { resumeText, entry, bullet, targetRole, jdText } = parsed.data

  const sections = parseSections(resumeText)
  const original = sections.experience[entry]?.bullets[bullet]
  if (!original) return { ok: false, error: 'That line is no longer in the document.' }

  const d = extractFields(resumeText).fields
  const facts: CandidateFacts = {
    currentTitle: d.currentTitle ?? null,
    employer: d.employer ?? null,
    yearsExperience: d.yearsExperience ?? null,
    skills: [],
    domain: null,
    credential: d.credential ?? null,
  }
  const vocabulary = roleVocabulary(targetRole)
  const role: RoleFacts = {
    title: targetRole,
    company: '',
    description: jdText?.trim()
      ? jdText
      : vocabulary
        ? `Postings for this role commonly use: ${vocabulary.terms.join(', ')}.`
        : null,
  }

  try {
    const out = await rewriteOneBullet(original, facts, role)
    if (!out) return { ok: false, error: 'We could not rewrite that line just now. Yours is unchanged.' }
    if ('refused' in out) {
      return {
        ok: false,
        refused: true,
        error: `Our filter refused the rewrite — it ${out.refused}. Your line is unchanged.`,
      }
    }
    return { ok: true, line: out.text, providerLabel: PROVIDER_LABEL[out.provider] }
  } catch (e) {
    if (e instanceof ModelBusyError) {
      return { ok: false, error: 'We are at capacity right now. Try that line again in about a minute.' }
    }
    return { ok: false, error: 'We could not rewrite that line just now. Yours is unchanged.' }
  }
}
