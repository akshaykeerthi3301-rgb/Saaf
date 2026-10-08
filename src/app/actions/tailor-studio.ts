'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getResume } from '@/lib/services/resume-documents'
import { getCookieContext } from '@/lib/services/cookie'
import { rewriteResume, rewriteOneBullet, RewriteError, type BulletChange } from '@/lib/resume-rewrite'
import { PROVIDER_LABEL, ModelBusyError } from '@/lib/parse/llm'
import { extractSkillPhrases } from '@/lib/taxonomy/skills'
import { extractFields } from '@/lib/parse/extract'
import { sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { checkResume } from '@/lib/ats-check'
import { sectionsSchema } from '@/lib/resume-schema'

/** Which parts of the résumé to change — the drawer's step 2. Absent means the whole document, as before. */
const scopeSchema = z.object({ summary: z.boolean(), experience: z.boolean(), skills: z.boolean() })
const schema = z.object({ roleId: z.string().uuid(), resumeId: z.string().uuid(), scope: scopeSchema.optional() })

/**
 * Five studio rewrites per ten minutes, per candidate — the same ceiling
 * reasoning as tailor.ts (Groq's free tier is shared site-wide), keyed on the
 * user because the caller is always signed in.
 */
const STUDIO_LIMIT = { scope: 'tailor-studio', limit: 5, windowMs: 10 * 60_000 }

export type TailorStudioResult =
  | {
      ok: true
      sections: ResumeSections
      changes: BulletChange[]
      reverted: BulletChange[]
      skillsReordered: boolean
      providerLabel: string
      /** Skill terms the posting names — the studio marks any a rewrite inserted. */
      keywords: string[]
      /**
       * The ATS check's readability score for THIS posting, on the saved résumé and on
       * the rewrite with every suggestion accepted. The same function on both, run on
       * the same posting text; null when a document is too short for the check to run.
       */
      scores: { before: number | null; after: number | null }
    }
  | { ok: false; error: string }

/**
 * Rewrite a SAVED résumé for one indexed role.
 *
 * ⚠️ BOTH DOCUMENTS ARE READ SERVER-SIDE FROM IDS. The browser names which
 * résumé and which role; it never supplies their contents. A client that could
 * send the "résumé" could push any claim through the grounding guard and get
 * it back looking verified — tailor.ts makes the same argument.
 *
 * ⚠️ THE FACTS COME FROM THE RÉSUMÉ BEING REWRITTEN, NOT FROM THE PROFILE, as
 * optimise-resume.ts does. Found in a browser on 2026-09-23: with profile facts
 * (2 years) the model rewrote a saved résumé's "6 years in payments" to "2
 * years", and the guard passed it — 2 is not more than 2. The guard's job is
 * to stop the rewrite claiming more than the DOCUMENT says; the document is
 * therefore the source of truth, and a profile that disagrees with it must
 * not be able to edit it.
 *
 * `skills: []` deliberately, also as optimise-resume.ts: the guard then checks
 * each bullet against the candidate's own original line, which is stricter
 * than checking it against a skills list.
 */
export async function tailorSavedResume(input: z.input<typeof schema>): Promise<TailorStudioResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Pick a résumé and a role first.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const [resume, ctx] = await Promise.all([
    getResume(user.id, parsed.data.resumeId).catch(() => null),
    getCookieContext(user.id, parsed.data.roleId),
  ])
  if (!resume) return { ok: false, error: 'That saved résumé could not be found.' }
  if (!ctx.ok) return { ok: false, error: ctx.error }

  const limit = checkRateLimit(user.id, STUDIO_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return { ok: false, error: `You have tailored a few résumés in a short while. Try again in ${mins === 1 ? 'a minute' : `${mins} minutes`}.` }
  }

  const { role } = ctx.context
  const read = extractFields(resume.body).fields
  try {
    const result = await rewriteResume({
      sections: resume.sections,
      facts: {
        currentTitle: read.currentTitle ?? null,
        employer: read.employer ?? null,
        yearsExperience: read.yearsExperience ?? null,
        skills: [],
        domain: null,
        credential: read.credential ?? null,
      },
      role,
      scope: parsed.data.scope ? { summary: parsed.data.scope.summary, experience: parsed.data.scope.experience } : undefined,
    })
    if (!result) return { ok: false, error: 'We could not tailor it just now. Your saved résumé is unchanged — try again in a moment.' }
    // "Skills" unticked: keep the candidate's own order, whatever the rewrite computed.
    if (parsed.data.scope && !parsed.data.scope.skills) {
      result.sections = { ...result.sections, skills: resume.sections.skills }
      result.skillsReordered = false
    }
    // Both measured the same way — sections rendered to text — so the only thing that differs is the edit.
    const posting = role.description ?? undefined
    return {
      ok: true,
      sections: result.sections,
      changes: result.changes,
      reverted: result.reverted,
      skillsReordered: result.skillsReordered,
      providerLabel: result.provider ? PROVIDER_LABEL[result.provider] : '',
      keywords: extractSkillPhrases(`${role.title}\n${role.description ?? ''}`),
      scores: {
        before: scoreSections(resume.sections, role.title, posting),
        after: scoreSections(result.sections, role.title, posting),
      },
    }
  } catch (e) {
    if (e instanceof RewriteError) return { ok: false, error: e.message }
    if (e instanceof ModelBusyError) return { ok: false, error: 'The writing model is busy right now. Try again in a minute.' }
    return { ok: false, error: 'We could not tailor it just now. Try again in a moment.' }
  }
}

/** The readability score of a document against one posting, or null when it is too short to check. */
function scoreSections(sections: ResumeSections, role: string, posting: string | undefined): number | null {
  try {
    return checkResume(sectionsToText(sections), role, undefined, posting).readability.score
  } catch {
    return null
  }
}

const draftSchema = z.object({ roleId: z.string().uuid(), sections: sectionsSchema })

/** Sixty live scores per ten minutes: no model runs, but the check is not free. */
const DRAFT_LIMIT = { scope: 'score-draft', limit: 60, windowMs: 10 * 60_000 }

export type DraftScoreResult = { ok: true; score: number | null } | { ok: false; error: string }

/**
 * The score of the tailored draft AS IT IS NOW — after each accept, dismiss or hand
 * edit — against the posting it is being tailored for.
 *
 * ⚠️ THE CLIENT SUPPLIES THE SECTIONS and that is safe here for the reason
 * resume-download.ts documents: the text goes into a score and returns to the same
 * person; nothing is stored and nothing claims to be verified. The POSTING is read
 * server-side from the role id, so a client cannot pick the text it is scored against.
 * No model runs.
 */
export async function scoreDraft(input: z.input<typeof draftSchema>): Promise<DraftScoreResult> {
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That draft could not be scored.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const limit = checkRateLimit(user.id, DRAFT_LIMIT)
  if (!limit.ok) return { ok: false, error: 'Scoring is paused for a moment — your edits are kept.' }

  const ctx = await getCookieContext(user.id, parsed.data.roleId)
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { role } = ctx.context
  return { ok: true, score: scoreSections(parsed.data.sections as unknown as ResumeSections, role.title, role.description ?? undefined) }
}

const lineSchema = z.object({ roleId: z.string().uuid(), line: z.string().trim().min(8).max(600) })

/** Twenty single-line rewrites per ten minutes per candidate — one line is ~200 tokens, so this is for working through a page. */
const LINE_LIMIT = { scope: 'studio-line', limit: 20, windowMs: 10 * 60_000 }

export type StudioLineResult = { ok: true; line: string; providerLabel: string } | { ok: false; error: string; refused?: boolean }

/**
 * "Edit with AI" on one line the candidate is looking at (F-410, TASK-188). Returns a
 * suggestion for the box they are already editing — nothing is applied until they press Done.
 *
 * ⚠️ THE FABRICATION GUARD IS THE SAME ONE. rewriteOneBullet refuses a line that adds a
 * number, a name or a word the original did not have, and the refusal is shown, not hidden.
 * The line is supplied by the browser (it is the candidate's own text going back to them,
 * as in scoreDraft); the POSTING it is sharpened for is read server-side from the role id.
 */
export async function rewriteStudioLine(input: z.input<typeof lineSchema>): Promise<StudioLineResult> {
  const parsed = lineSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That line is too short to rewrite.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const limit = checkRateLimit(user.id, LINE_LIMIT)
  if (!limit.ok) return { ok: false, error: 'You have rewritten a lot of lines in a short while. Try again in a few minutes.' }

  const ctx = await getCookieContext(user.id, parsed.data.roleId)
  if (!ctx.ok) return { ok: false, error: ctx.error }
  try {
    const out = await rewriteOneBullet(
      parsed.data.line,
      { currentTitle: null, employer: null, yearsExperience: null, skills: [], domain: null, credential: null },
      ctx.context.role,
    )
    if (!out) return { ok: false, error: 'We could not rewrite that line just now. Yours is unchanged.' }
    if ('refused' in out) return { ok: false, refused: true, error: `Our filter refused the rewrite — it ${out.refused}. Your line is unchanged.` }
    return { ok: true, line: out.text, providerLabel: PROVIDER_LABEL[out.provider] }
  } catch (e) {
    if (e instanceof ModelBusyError) return { ok: false, error: 'The writing model is busy right now. Try that line again in about a minute.' }
    return { ok: false, error: 'We could not rewrite that line just now. Yours is unchanged.' }
  }
}

const instructionSchema = z.object({
  roleId: z.string().uuid(),
  instruction: z.string().trim().min(3).max(160),
  lines: z.array(z.object({ key: z.string().max(20), text: z.string().trim().min(8).max(900), summary: z.boolean().optional() })).min(1).max(8),
})

/** Six instruction-driven passes per ten minutes: each runs up to eight lines through the model. */
const INSTRUCTION_LIMIT = { scope: 'studio-instruction', limit: 6, windowMs: 10 * 60_000 }

export type StudioInstructionResult =
  | { ok: true; results: { key: string; line?: string; reason?: string }[]; providerLabel: string }
  | { ok: false; error: string }

/**
 * "AI Rewrite" in the tailor result: the candidate says what they want ("use stronger action verbs", "shorten my
 * summary") and up to eight of THEIR OWN lines are rewritten that way for this posting.
 *
 * ⚠️ THE FABRICATION GUARD IS THE SAME ONE, PER LINE. Each line goes through rewriteOneBullet, which refuses any
 * rewrite that adds a number, a name or a word the original did not have; a refused line comes back with its reason
 * and is left as written. The instruction is the candidate's words — it can steer the style, never the facts.
 * Lines arrive from the browser (it is their own text going back to them, as in scoreDraft); the POSTING is read
 * server-side from the role id.
 */
export async function rewriteStudioLines(input: z.input<typeof instructionSchema>): Promise<StudioInstructionResult> {
  const parsed = instructionSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Tell the AI what to change, in a few words.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const limit = checkRateLimit(user.id, INSTRUCTION_LIMIT)
  if (!limit.ok) return { ok: false, error: 'You have asked for a lot of rewrites in a short while. Try again in a few minutes.' }

  const ctx = await getCookieContext(user.id, parsed.data.roleId)
  if (!ctx.ok) return { ok: false, error: ctx.error }

  const facts = { currentTitle: null, employer: null, yearsExperience: null, skills: [], domain: null, credential: null }
  let providerLabel = ''
  try {
    const results = await Promise.all(
      parsed.data.lines.map(async (l) => {
        const out = await rewriteOneBullet(l.text, facts, ctx.context.role, { instruction: parsed.data.instruction, summary: l.summary })
        if (!out) return { key: l.key, reason: 'The writing model did not answer for this line — it is unchanged.' }
        if ('refused' in out) return { key: l.key, reason: `Left as written: the rewrite ${out.refused}.` }
        providerLabel = PROVIDER_LABEL[out.provider]
        return { key: l.key, line: out.text }
      }),
    )
    return { ok: true, results, providerLabel }
  } catch (e) {
    if (e instanceof ModelBusyError) return { ok: false, error: 'The writing model is busy right now. Try again in about a minute.' }
    return { ok: false, error: 'We could not rewrite those lines just now. Yours are unchanged.' }
  }
}
