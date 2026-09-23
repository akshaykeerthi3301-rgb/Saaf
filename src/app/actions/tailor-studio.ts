'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { getResume } from '@/lib/services/resume-documents'
import { getCookieContext } from '@/lib/services/cookie'
import { rewriteResume, RewriteError, type BulletChange } from '@/lib/resume-rewrite'
import { PROVIDER_LABEL, ModelBusyError } from '@/lib/parse/llm'
import { extractSkillPhrases } from '@/lib/taxonomy/skills'
import { extractFields } from '@/lib/parse/extract'
import type { ResumeSections } from '@/lib/parse/sections'

const schema = z.object({ roleId: z.string().uuid(), resumeId: z.string().uuid() })

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
    })
    if (!result) return { ok: false, error: 'We could not tailor it just now. Your saved résumé is unchanged — try again in a moment.' }
    return {
      ok: true,
      sections: result.sections,
      changes: result.changes,
      reverted: result.reverted,
      skillsReordered: result.skillsReordered,
      providerLabel: result.provider ? PROVIDER_LABEL[result.provider] : '',
      keywords: extractSkillPhrases(`${role.title}\n${role.description ?? ''}`),
    }
  } catch (e) {
    if (e instanceof RewriteError) return { ok: false, error: e.message }
    if (e instanceof ModelBusyError) return { ok: false, error: 'The writing model is busy right now. Try again in a minute.' }
    return { ok: false, error: 'We could not tailor it just now. Try again in a moment.' }
  }
}
