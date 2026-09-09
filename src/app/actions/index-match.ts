'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractFields } from '@/lib/parse/extract'
import { parseSections } from '@/lib/parse/sections'
import { countIndexMatches, type IndexMatchCount } from '@/lib/services/index-match'
import { MAX_RESUME_CHARS } from '@/lib/ats-check'
import type { CandidateProfile } from '@/gates/types'

/**
 * "What did that actually buy me?" — the score, converted into jobs.
 *
 * ⚠️ THE ONLY NUMBER ON THIS SURFACE THAT IS NOT ABOUT THE DOCUMENT. Everything
 * else the checker reports is a property of the file: how it parses, what a
 * recruiter will think, which words it uses. This one is a property of the
 * MARKET — how many live postings the résumé now stands a real chance against —
 * and it is the reason a résumé tool sitting on top of a job index is a
 * different product from a résumé tool that is not.
 *
 * Public and unauthenticated like the rest of the funnel, and deliberately
 * count-only: the roles behind the number are what signing in is for. That is
 * not a growth trick bolted on, it is the same rule the whole product runs on —
 * the registry is the moat, and a public endpoint that enumerated it would give
 * it away one request at a time.
 */

const schema = z.object({
  resumeText: z.string().trim().min(120).max(MAX_RESUME_CHARS),
  targetRole: z.string().trim().min(2).max(80),
  /** The candidate's own words, when they gave us skills on the way in. */
  skills: z.array(z.string().max(60)).max(60).optional(),
})

export type IndexMatchResponse =
  | ({ ok: true } & IndexMatchCount)
  | { ok: false; error: string }

/**
 * Six per ten minutes. Each call scores up to 150 postings with their
 * requirements, which is the heaviest database read on any public surface here
 * — heavier per call than the model work, and unlike the model work it cannot
 * fail over to a second provider.
 */
const LIMIT = { limit: 6, windowMs: 10 * 60_000 }

async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function matchesInIndex(input: z.input<typeof schema>): Promise<IndexMatchResponse> {
  const limit = checkRateLimit(await callerKey(), LIMIT)
  if (!limit.ok) {
    return {
      ok: false,
      error: 'You have checked this against the index a few times just now. Try again in a few minutes.',
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'We could not read that.' }
  const { resumeText, targetRole, skills } = parsed.data

  try {
    const fields = extractFields(resumeText).fields
    const sections = parseSections(resumeText)

    /**
     * The profile is built from the document in front of us, not from a stored
     * one — this surface has no account. `skills` comes from the résumé's own
     * skills section, so a rewrite that adds a term the candidate genuinely
     * holds moves the number, and one that invents a term never gets that far:
     * the guard removed it before this ran.
     */
    const candidate: CandidateProfile = {
      yearsExperience: Number(fields.yearsExperience ?? 0),
      currentTitle: fields.currentTitle,
      city: fields.city,
      credential: fields.credential ?? 'none',
      preferredRole: targetRole,
      skills: skills?.length ? skills : sections.skills,
    }

    return { ok: true, ...(await countIndexMatches(candidate)) }
  } catch {
    return {
      ok: false,
      error: 'We could not reach the index just now. Your résumé and its score are unaffected.',
    }
  }
}
