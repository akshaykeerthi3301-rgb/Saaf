'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { PROVIDER_LABEL } from '@/lib/parse/llm'
import { draftApplication, type Draft } from '@/lib/tailor'
import {
  matchJdToResume,
  JdMatchError,
  MIN_JD_CHARS,
  MIN_RESUME_CHARS,
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
} from '@/lib/jd-match'

/**
 * Tailor a résumé to a pasted job description. TASK-064, public half.
 *
 * The conversion step behind the ATS hook: a candidate who has just been told
 * what is wrong with their résumé can rewrite it against a specific posting
 * without an account. Signing in is what turns the result into a file — see
 * src/app/actions/tailor-docx.ts.
 *
 * ⚠️ IT REUSES THE GROUNDING FILTER RATHER THAN TRUSTING THE MODEL, and that is
 * the entire product claim on this surface. draftApplication() generates, then
 * groundingFailure() drops any bullet stating a metric, naming a company the
 * candidate never worked for, claiming more years than their résumé shows, or
 * asserting a credential they do not hold. What it removed is returned in
 * `dropped` and shown — a badge over a black box is worth nothing.
 *
 * ⚠️ TWO MODEL CALLS, NOT ONE. matchJdToResume reads the résumé into facts;
 * draftApplication writes against those facts. The first is not optional: the
 * guard needs `employer` and `domain` to tell the candidate's own employer from
 * a stranger's, and without them it rejects nearly every bullet. That is why
 * the rate limit here is tighter than the scorer's.
 *
 * ⚠️ UNAUTHENTICATED, LIKE ITS SIBLING. Everything it returns was pasted in by
 * the caller a moment earlier; it reads no database and stores nothing.
 */

const schema = z.object({
  jdText: z
    .string()
    .trim()
    .min(MIN_JD_CHARS, 'Paste the full job description — this looks too short to read.')
    .max(MAX_JD_CHARS, 'That job description is longer than we can read. Paste the role and requirements.'),
  resumeText: z
    .string()
    .trim()
    .min(MIN_RESUME_CHARS, 'Paste your full résumé — this looks too short to read.')
    .max(MAX_RESUME_CHARS, 'That résumé is longer than we can read. Paste the most recent few roles.'),
  /**
   * ⚠️ THE COMPANY MATTERS TO THE GUARD, NOT JUST TO THE COPY. groundingFailure()
   * allows a capitalised word that appears in the posting's title or company —
   * naming the employer you are applying to is the point of a cover note, not a
   * fabrication. Without it, a note mentioning them is dropped.
   */
  company: z.string().trim().max(200).optional(),
  jdTitle: z.string().trim().max(200).optional(),
})

export type TailorJdResponse =
  | {
      ok: true
      draft: Draft
      providerLabel: string
      /** What we read out of the résumé, so the candidate can see the basis. */
      readAs: { currentTitle: string | null; employer: string | null; yearsExperience: number | null }
    }
  | { ok: false; error: string }

/**
 * Five per ten minutes, against the scorer's ten.
 *
 * Half the allowance because each call is twice the work — a résumé read plus a
 * draft. Sized from the honest session this surface is for: paste, read what
 * was dropped and why, correct the posting title, run it once more.
 */
const TAILOR_LIMIT = { limit: 5, windowMs: 10 * 60_000 }

/** Hashed immediately; nothing that outlives this function holds an address. */
async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function tailorFromPastedJd(input: z.input<typeof schema>): Promise<TailorJdResponse> {
  // Before validation, so a flood of malformed input is braked too.
  const limit = checkRateLimit(await callerKey(), TAILOR_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have tailored a few résumés in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`} — nothing you pasted was stored.`,
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that.' }
  }

  try {
    const { jdText, resumeText, company, jdTitle } = parsed.data

    // Reading the résumé is what gives the guard employer and domain.
    const match = await matchJdToResume({ jdText, resumeText, jdTitle })

    /**
     * ⚠️ REFUSE TO TAILOR WHEN THE RÉSUMÉ READ FAILED, RATHER THAN TAILORING
     * BADLY. Observed live on 2026-09-08.
     *
     * Skills come only from the model — the deterministic parser does not read
     * them. When the read fails, `facts.skills` is empty, but drafting carries
     * on: draftApplication receives the JOB DESCRIPTION as role.description, so
     * the model borrows terms from the posting and writes them as the
     * candidate's own. groundingFailure() then strips exactly those bullets,
     * correctly — and the candidate is shown `names "SQL", which is not on your
     * profile` about a résumé whose skills section says SQL.
     *
     * So the failure surfaces as a gutted draft with reasons that look like a
     * bug in the guard rather than a model outage. Every part of that chain
     * behaves correctly; the composition is what misleads. Better to say we
     * could not read it.
     *
     * `provider === null` is the precise signal: no model answered. With only
     * GROQ_API_KEY configured this is one Groq hiccup away, which is also the
     * argument for setting GEMINI_API_KEY — see providerChain() in
     * src/lib/parse/llm.ts.
     */
    if (match.provider === null) {
      return {
        ok: false,
        error:
          'We could not read your résumé closely enough to rewrite it safely just now. ' +
          'Rather than guess at your experience, we would rather not write anything — try again in a moment.',
      }
    }

    const draft = await draftApplication(match.facts, {
      title: jdTitle || 'this role',
      company: company ?? '',
      description: jdText,
    })

    if (!draft) {
      // Named honestly. A drafting failure is not an application failure — the
      // candidate still has their résumé and the ATS findings.
      return {
        ok: false,
        error: 'We could not draft anything just now. Your résumé and its check are unaffected — try again in a moment.',
      }
    }

    return {
      ok: true,
      draft,
      providerLabel: PROVIDER_LABEL[draft.provider],
      readAs: {
        currentTitle: match.facts.currentTitle,
        employer: match.facts.employer,
        yearsExperience: match.facts.yearsExperience,
      },
    }
  } catch (e) {
    if (e instanceof JdMatchError) return { ok: false, error: e.message }
    return { ok: false, error: 'We could not tailor that just now. Try again, or check what you pasted.' }
  }
}
