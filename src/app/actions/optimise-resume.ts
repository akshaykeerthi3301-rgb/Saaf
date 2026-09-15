'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractFields } from '@/lib/parse/extract'
import { PROVIDER_LABEL, ModelBusyError } from '@/lib/parse/llm'
import { parseSections, sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { rewriteResume, RewriteError, type BulletChange, type RewriteScope } from '@/lib/resume-rewrite'
import { checkResume, roleVocabulary, MIN_RESUME_CHARS, MAX_RESUME_CHARS, type AtsReport } from '@/lib/ats-check'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'

/**
 * "Improve my score" — the step after the check, on the public ATS surface.
 *
 * ⚠️ THIS IS THE FIRST MODEL CALL IN THE FLOW, AND THE PAGE SAYS SO. Everything
 * before it — the upload, the parse, the score, every finding — is
 * deterministic, and the checker's credibility rests on that. Blurring the line
 * would cost more than the feature is worth, so the boundary is drawn in the
 * copy at exactly the point it is drawn in the code: the check is rules, the
 * rewrite is a model, and what the model wrote is shown beside what it replaced.
 *
 * ⚠️ IT WORKS WITH OR WITHOUT A JOB DESCRIPTION, and the two are honestly
 * different. With a JD, the rewrite is tailored to that posting's own words.
 * Without one, it optimises against the vocabulary MEASURED across the postings
 * we index for that role — not a recommended-keywords list, and the surface
 * says which of the two it used. A generic "ATS-optimised résumé" with no
 * target is the thing every résumé tool sells and nobody can evaluate.
 *
 * UNAUTHENTICATED, and nothing is stored. Everything it returns was pasted or
 * uploaded by the caller a moment earlier; it reads no database and writes
 * nothing. Signing in buys the FILE, not the rewrite — see
 * src/app/actions/resume-download.ts.
 */

const schema = z.object({
  resumeText: z
    .string()
    .trim()
    .min(MIN_RESUME_CHARS, 'We need your full résumé to rewrite it.')
    .max(MAX_RESUME_CHARS, 'That résumé is longer than we can read.'),
  /** Required here, unlike the check — a rewrite needs something to aim at. */
  targetRole: z.string().trim().min(2).max(80),
  /** Optional. Present means "tailor to this posting" rather than to the role. */
  jdText: z.string().trim().max(20_000).optional(),
  company: z.string().trim().max(200).optional(),
  /**
   * Which sections the Résumé Studio's stage 3 selected.
   *
   * ⚠️ OMITTED MEANS THE WHOLE DOCUMENT, WHICH IS THE OLD BEHAVIOUR. Every
   * caller that predates the Studio keeps working. `skills` is accepted but
   * needs no model — `reorderSkills()` always runs — so a request naming only
   * skills reaches no provider at all.
   */
  sections: z.array(z.enum(['summary', 'skills', 'experience'])).optional(),
})

export type OptimiseResumeResponse =
  | {
      ok: true
      sections: ResumeSections
      /** The rewritten document as text, so the caller can show a diff. */
      text: string
      changes: BulletChange[]
      reverted: BulletChange[]
      /** The same check, re-run on the rewrite. Same rules, same arithmetic. */
      projected: AtsReport
      providerLabel: string
      /** What the rewrite was aimed at, named honestly on the surface. */
      target: 'job-description' | 'role-vocabulary'
      /** Null when no model ran — the skills-only path. The surface says so. */
      provider: 'model' | null
      /** Which sections were actually put through a model. */
      rewrote: ('summary' | 'experience')[]
    }
  | { ok: false; error: string }

/**
 * Three per ten minutes.
 *
 * The most expensive call in the product: a résumé read plus a whole-document
 * rewrite, both against a paid model. Tighter than the tailor's five because
 * this one processes every bullet rather than three. The honest loop here is
 * one rewrite per role, not one per edit — the CHECK is the thing you re-run,
 * and it is limited at thirty.
 */
const OPTIMISE_LIMIT = { limit: 3, windowMs: 10 * 60_000 }

/** Hashed immediately; nothing outliving this function holds an address. */
async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function optimiseResume(
  input: z.input<typeof schema>,
): Promise<OptimiseResumeResponse> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that.' }
  }

  const { resumeText, targetRole, jdText, company, sections: chosen } = parsed.data

  /**
   * ⚠️ THE SCOPE IS WHAT MAKES THE RATE LIMIT FAIR. Three rewrites per ten
   * minutes was sized against a whole-document pass; a candidate who only wants
   * their summary sharpened was paying the same allowance for a tenth of the
   * work. Narrowing the scope narrows the spend — see the measured figures in
   * PROJECT-STATE Stage Z.
   */
  const scope: RewriteScope | undefined = chosen
    ? { summary: chosen.includes('summary'), experience: chosen.includes('experience') }
    : undefined

  /**
   * ⚠️ THE LIMIT IS CHARGED ONLY WHEN A MODEL WILL ACTUALLY RUN, AND THE
   * ORDERING HERE IS THE FIX. This check used to be the first statement in the
   * function, before the input was even parsed — correct when every call was a
   * whole-document rewrite. TASK-085 made "Skills only" a thing a candidate can
   * pick, and that path reaches no provider and spends no tokens, so charging
   * it locked people out of a free feature: found in a browser on 2026-09-15
   * after three skills reorders returned "try again in 7 minutes".
   *
   * The allowance exists to protect an 8,000 tokens/minute ceiling. Something
   * that consumes none of it has nothing to protect against.
   */
  const usesModel = !scope || scope.summary || scope.experience
  if (usesModel) {
    const limit = checkRateLimit(await callerKey(), OPTIMISE_LIMIT)
    if (!limit.ok) {
      const mins = Math.ceil(limit.retryAfterSeconds / 60)
      return {
        ok: false,
        error:
          `You have rewritten a few résumés in a short while. Try again in ` +
          `${mins === 1 ? 'a minute' : `${mins} minutes`}. The check itself is not limited — ` +
          `re-run that as often as you like while you edit, and reordering your skills is always free.`,
      }
    }
  }

  try {
    const sections = parseSections(resumeText)
    const deterministic = extractFields(resumeText).fields

    /**
     * ⚠️ THE SEPARATE RÉSUMÉ-READ CALL WAS REMOVED ON 2026-09-08, AND THE
     * REASONING THAT PUT IT HERE NO LONGER HOLDS.
     *
     * It existed because groundingFailure() needs `skills`, `employer` and
     * `domain` to tell the candidate's own work from a stranger's, and without
     * them it rejected nearly every rewritten line. That was true when this was
     * written. It stopped being true when ownVocabulary() landed in
     * src/lib/resume-rewrite.ts: the guard now grounds each rewrite against THE
     * LINE IT CAME FROM, which is a better source for this job than a model's
     * summary of the whole document.
     *
     * Measured before removing it, on the same résumé: with skills and domain
     * supplied, 6 kept / 1 reverted. With both empty, 6 kept / 1 reverted — the
     * same genuine fabrication caught, nothing else lost.
     *
     * What it cost is the point. Groq's free tier is 8,000 tokens per MINUTE
     * across every environment on the key, this call was ~996 of the ~2,360 a
     * rewrite consumed, and it was a second independent point of failure: in a
     * 5-run sample, 2 failures were this call and 1 was the rewrite. Dropping it
     * cuts token cost by ~42%, removes a round trip, and removes the failure
     * mode that produced the worst message in the product — "we could not read
     * your résumé closely enough", which blamed the candidate's file for our
     * quota.
     */
    const facts: CandidateFacts = {
      currentTitle: deterministic.currentTitle ?? null,
      employer: deterministic.employer ?? null,
      yearsExperience: deterministic.yearsExperience ?? null,
      // Empty by design now — see the note above. The guard reads the
      // candidate's own line instead, which is stricter and costs nothing.
      skills: [],
      domain: null,
      credential: deterministic.credential ?? null,
    }

    /**
     * With no posting, the "description" is the vocabulary measured across our
     * own index for this role. That is a real target rather than a generic one,
     * and it is the same measurement the checker's tailoring finding uses — so
     * the rewrite aims at exactly what the report told the candidate was missing.
     */
    const vocabulary = roleVocabulary(targetRole)
    const role: RoleFacts = {
      title: targetRole,
      company: company ?? '',
      description: jdText?.trim()
        ? jdText
        : vocabulary
          ? `Postings for this role commonly use these terms: ${vocabulary.terms.join(', ')}.`
          : null,
    }

    const result = await rewriteResume({ sections, facts, role, scope })
    if (!result) {
      return {
        ok: false,
        error:
          'We could not rewrite it just now. Your résumé and its check are unaffected — try again in a moment.',
      }
    }

    /**
     * The projected score is the SAME function on the rewritten text. Computing
     * it any other way — estimating the lift, or subtracting the findings we
     * think we fixed — would be a different measurement wearing the same label,
     * and the number would drift from the one the candidate can reproduce by
     * pasting the result back into the checker.
     *
     * ⚠️ `jdText` WAS MISSING HERE UNTIL 2026-09-15, AND THE COMMENT ABOVE WAS
     * THEREFORE FALSE. The baseline check passes it (actions/ats-check.ts:109)
     * and this one did not, so `jd-missing-standard` could never be raised
     * against a rewrite. A candidate who pasted a posting was shown an "after"
     * score computed by a check that skipped one of the rules their "before"
     * was measured with. Worth 0-1 points — measured — but the point was never
     * the points: the finding disappeared, so the one question they came with,
     * *did the rewrite close the gap to THIS posting*, had no answer on screen.
     *
     * ⚠️ `layout` IS STILL DELIBERATELY NOT PASSED, AND THAT IS NOT THE SAME
     * OMISSION. Layout describes the geometry of the FILE THEY UPLOADED. The
     * rewrite replaces it with a single-column document built from sections, so
     * charging it the two-column penalty would understate a real improvement —
     * see the LAYOUT_DRIVEN note in ats-check.ts, which drops the same penalty
     * when reporting what fixing that finding is worth.
     */
    const text = sectionsToText(result.sections)
    const projected = checkResume(text, targetRole, undefined, jdText)

    return {
      ok: true,
      sections: result.sections,
      text,
      changes: result.changes,
      reverted: result.reverted,
      projected,
      /**
       * ⚠️ EMPTY STRING WHEN NOTHING RAN, NOT A PROVIDER NAME. `result.provider`
       * is null on the skills-only path; indexing PROVIDER_LABEL with it would
       * have thrown, and defaulting to a name would have printed "rewritten by
       * Groq" over a stable sort that touched no model.
       */
      providerLabel: result.provider ? PROVIDER_LABEL[result.provider] : '',
      provider: result.provider ? 'model' : null,
      rewrote: [
        ...(scope?.summary ?? true ? (['summary'] as const) : []),
        ...(scope?.experience ?? true ? (['experience'] as const) : []),
      ],
      target: jdText?.trim() ? 'job-description' : 'role-vocabulary',
    }
  } catch (e) {
    if (e instanceof RewriteError) return { ok: false, error: e.message }
    /**
     * ⚠️ CAPACITY IS OUR PROBLEM AND HAS TO READ LIKE ONE. Every provider is
     * over quota; nothing is wrong with their résumé, and the previous copy
     * ("we could not read your résumé closely enough") told them otherwise.
     */
    if (e instanceof ModelBusyError) {
      const mins = Math.ceil(e.retryAfterSeconds / 60)
      return {
        ok: false,
        error:
          'We are at capacity right now — too many résumés being rewritten at once. ' +
          `Try again in ${e.retryAfterSeconds < 90 ? 'about a minute' : `${mins} minutes`}. ` +
          'Nothing is wrong with your file, and your check and its findings are unaffected.',
      }
    }
    return {
      ok: false,
      error: 'We could not rewrite that just now. Your résumé and its check are unaffected.',
    }
  }
}
