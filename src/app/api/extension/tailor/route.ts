import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { json, refuse, requireExtensionUser } from '@/lib/extension-session'
import { readPrimaryResume } from '@/lib/services/profile-cards'
import { saveResume } from '@/lib/services/resume-documents'
import { rewriteResume, RewriteError } from '@/lib/resume-rewrite'
import { ModelBusyError, PROVIDER_LABEL } from '@/lib/parse/llm'
import { extractFields } from '@/lib/parse/extract'
import { sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { checkResume } from '@/lib/ats-check'
import { MAX_JD_CHARS, MIN_JD_CHARS } from '@/lib/jd-match'

/**
 * "Tailor résumé" from the job page: rewrites the candidate's PRIMARY résumé against the posting on screen, keeps the
 * result as a saved résumé named for the role, and returns its id so the extension can attach exactly that file.
 *
 * ⚠️ THE SAME ENGINE AND THE SAME GUARD AS THE WEBSITE'S TAILORING (rewriteResume → groundingFailure): a rewritten
 * line is dropped if it states a metric, a company or a credential the original line does not support. The browser
 * names nothing but the posting; the résumé is read server-side from the account, so a page cannot push a claim
 * through and have it come back wearing our name. The facts come from the résumé being rewritten, not the profile
 * (the 2026-09-23 "6 years → 2 years" lesson in tailor-studio.ts).
 *
 * ⚠️ IT SAVES A NEW SAVED RÉSUMÉ, BY LABEL. Tailoring the same posting twice updates one document rather than piling
 * up; the saved-résumé cap (migration 0034) never deletes the primary one.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const body = z.object({
  jdText: z.string().trim().min(MIN_JD_CHARS, 'The posting is too short to tailor against.').max(MAX_JD_CHARS),
  jdTitle: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
})

const score = (s: ResumeSections, role: string, posting: string): number | null => {
  try { return checkResume(sectionsToText(s), role, undefined, posting).readability.score } catch { return null }
}

export async function POST(req: NextRequest) {
  // Five per ten minutes: a rewrite is a model call, and the free providers are shared site-wide.
  const gate = await requireExtensionUser(req, { scope: 'tailor', limit: 5, windowMs: 10 * 60_000 })
  if ('response' in gate) return gate.response
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return refuse(400, parsed.error.issues[0]?.message ?? 'bad-request')

  const base = (await readPrimaryResume(gate.user.userId))?.resume
  if (!base) return json({ ok: false, error: 'no-resume' }, { status: 404 })

  const title = parsed.data.jdTitle || 'this role'
  const company = parsed.data.company || ''
  const posting = parsed.data.jdText
  const read = extractFields(base.body).fields
  try {
    const result = await rewriteResume({
      sections: base.sections,
      facts: { currentTitle: read.currentTitle ?? null, employer: read.employer ?? null, yearsExperience: read.yearsExperience ?? null, skills: [], domain: null, credential: read.credential ?? null },
      role: { title, company, description: posting },
    })
    if (!result) return json({ ok: false, error: 'We could not tailor it just now. Your résumé is unchanged — try again in a moment.' }, { status: 502 })

    const before = score(base.sections, title, posting)
    const after = score(result.sections, title, posting)
    const label = `Tailored — ${title}${company ? ` at ${company}` : ''}`.slice(0, 120)
    const saved = await saveResume({
      userId: gate.user.userId, label, targetRole: title.slice(0, 120),
      sections: result.sections, body: sectionsToText(result.sections), score: after,
    })
    return json({
      ok: true, resumeId: saved.id, label: saved.label,
      scores: { before, after }, changed: result.changes.length,
      providerLabel: result.provider ? PROVIDER_LABEL[result.provider] : '',
    })
  } catch (e) {
    if (e instanceof RewriteError) return json({ ok: false, error: e.message }, { status: 422 })
    if (e instanceof ModelBusyError) return json({ ok: false, error: 'The writing model is busy right now. Try again in a minute.' }, { status: 503 })
    return json({ ok: false, error: 'We could not tailor it just now. Try again in a moment.' }, { status: 500 })
  }
}
