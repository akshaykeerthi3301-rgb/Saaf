'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractFields } from '@/lib/parse/extract'
import { readResumeWithModel, PROVIDER_LABEL } from '@/lib/parse/llm'
import { parseSections, sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { rewriteResume, RewriteError, type BulletChange } from '@/lib/resume-rewrite'
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
  const limit = checkRateLimit(await callerKey(), OPTIMISE_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have rewritten a few résumés in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`}. The check itself is not limited — ` +
        `re-run that as often as you like while you edit.`,
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that.' }
  }

  const { resumeText, targetRole, jdText, company } = parsed.data

  try {
    const sections = parseSections(resumeText)
    const deterministic = extractFields(resumeText).fields

    /**
     * ⚠️ REFUSE RATHER THAN REWRITE BADLY WHEN THE RÉSUMÉ READ FAILS.
     *
     * Skills and domain come only from the model. Without them the guard cannot
     * tell the candidate's own employer from a stranger's, so it rejects almost
     * every rewritten line — and the candidate is shown a document that is
     * identical to the one they uploaded, with a list of reasons that read like
     * a bug in our filter rather than a model outage. src/app/actions/tailor-jd.ts
     * hit exactly this and documents it; the same refusal belongs here.
     */
    const model = await readResumeWithModel(resumeText)
    if (!model) {
      return {
        ok: false,
        error:
          'We could not read your résumé closely enough to rewrite it safely just now. ' +
          'Rather than guess at your experience, we would rather not write anything — try again in a moment. ' +
          'Your check and its findings are unaffected.',
      }
    }

    const facts: CandidateFacts = {
      currentTitle: model.currentTitle ?? deterministic.currentTitle ?? null,
      employer: model.employer ?? deterministic.employer ?? null,
      yearsExperience: model.yearsExperience ?? deterministic.yearsExperience ?? null,
      skills: model.skills ?? [],
      domain: model.domain ?? null,
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

    const result = await rewriteResume({ sections, facts, role })
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
     */
    const text = sectionsToText(result.sections)
    const projected = checkResume(text, targetRole)

    return {
      ok: true,
      sections: result.sections,
      text,
      changes: result.changes,
      reverted: result.reverted,
      projected,
      providerLabel: PROVIDER_LABEL[result.provider],
      target: jdText?.trim() ? 'job-description' : 'role-vocabulary',
    }
  } catch (e) {
    if (e instanceof RewriteError) return { ok: false, error: e.message }
    return {
      ok: false,
      error: 'We could not rewrite that just now. Your résumé and its check are unaffected.',
    }
  }
}
