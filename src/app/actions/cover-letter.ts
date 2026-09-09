'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { ModelBusyError, PROVIDER_LABEL } from '@/lib/parse/llm'
import { extractFields } from '@/lib/parse/extract'
import { parseSections } from '@/lib/parse/sections'
import { draftCoverLetter } from '@/lib/cover-letter'
import { roleVocabulary, MAX_RESUME_CHARS } from '@/lib/ats-check'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'

/**
 * The covering email, from the résumé the candidate just fixed.
 *
 * Public, unauthenticated and stores nothing, like the rest of the funnel. The
 * letter is readable on screen; turning it into a file is what signing in buys,
 * same as the résumé.
 */

const schema = z.object({
  resumeText: z.string().trim().min(120).max(MAX_RESUME_CHARS),
  targetRole: z.string().trim().min(2).max(80),
  company: z.string().trim().max(200).optional(),
  jdText: z.string().trim().max(20_000).optional(),
})

export type CoverLetterResponse =
  | { ok: true; paragraphs: string[]; dropped: { text: string; reason: string }[]; providerLabel: string }
  | { ok: false; error: string }

/** Five per ten minutes — one letter per application, not one per edit. */
const LIMIT = { limit: 5, windowMs: 10 * 60_000 }

async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function writeCoverLetter(input: z.input<typeof schema>): Promise<CoverLetterResponse> {
  const limit = checkRateLimit(await callerKey(), LIMIT)
  if (!limit.ok) {
    return { ok: false, error: 'You have written a few letters in a short while. Try again in a few minutes.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'We could not read that.' }
  const { resumeText, targetRole, company, jdText } = parsed.data

  const sections = parseSections(resumeText)
  if (sections.experience.length === 0) {
    return {
      ok: false,
      error:
        'We could not find a work-experience section to write from. A letter built on nothing is the kind we refuse to write.',
    }
  }

  const d = extractFields(resumeText).fields
  const facts: CandidateFacts = {
    currentTitle: d.currentTitle ?? null,
    employer: d.employer ?? null,
    yearsExperience: d.yearsExperience ?? null,
    skills: sections.skills,
    domain: null,
    credential: d.credential ?? null,
  }
  const vocabulary = roleVocabulary(targetRole)
  const role: RoleFacts = {
    title: targetRole,
    company: company ?? '',
    description: jdText?.trim()
      ? jdText
      : vocabulary
        ? `Postings for this role commonly use: ${vocabulary.terms.join(', ')}.`
        : null,
  }

  try {
    const letter = await draftCoverLetter({ sections, facts, role })
    if (!letter) {
      return { ok: false, error: 'We could not draft it just now. Your résumé and its score are unaffected.' }
    }
    if (letter.paragraphs.length === 0) {
      /**
       * Every paragraph was refused. Saying so plainly beats returning an empty
       * letter — and the reasons are the evidence that the filter is real.
       */
      return {
        ok: false,
        error:
          `Our filter refused every paragraph it wrote — ${letter.dropped[0]?.reason ?? 'it could not ground them in your résumé'}. ` +
          'Rather than hand you a letter we cannot stand behind, we would rather write nothing. Try again, or add the detail it was reaching for to your résumé first.',
      }
    }
    return {
      ok: true,
      paragraphs: letter.paragraphs,
      dropped: letter.dropped,
      providerLabel: PROVIDER_LABEL[letter.provider],
    }
  } catch (e) {
    if (e instanceof ModelBusyError) {
      return { ok: false, error: 'We are at capacity right now. Try again in about a minute.' }
    }
    return { ok: false, error: 'We could not draft it just now. Your résumé and its score are unaffected.' }
  }
}
