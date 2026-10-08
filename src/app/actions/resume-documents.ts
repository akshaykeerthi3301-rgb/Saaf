'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { saveResume, deleteResume, setPrimaryResume, type SavedResume } from '@/lib/services/resume-documents'
import { sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { checkResume } from '@/lib/ats-check'

/**
 * Save and delete a candidate's own résumés.
 *
 * ⚠️ EVERY EXPORT RE-AUTHENTICATES. An exported server action is its own entry
 * point, reachable without the page that renders it ever running — CLAUDE.md's
 * second architecture invariant. The user id comes from getUser() here and is
 * never accepted from the caller, which is the difference between a saved
 * document and somebody else's saved document.
 *
 * ⚠️ THE SIGN-IN WALL IS THE SAME ONE AS THE DOWNLOAD. Reading the checker,
 * fixing findings and reading the rewrite are all free and always will be.
 * Keeping the result is what an account is for.
 */

const sectionsSchema = z.object({
  contact: z.object({
    name: z.string().max(120).nullable(),
    email: z.string().max(200).nullable(),
    phone: z.string().max(60).nullable(),
    links: z.array(z.string().max(300)).max(6),
  }),
  summary: z.string().max(4000).nullable(),
  experience: z
    .array(
      z.object({
        title: z.string().max(200).nullable(),
        employer: z.string().max(200).nullable(),
        dates: z.string().max(80).nullable(),
        location: z.string().max(120).nullable(),
        bullets: z.array(z.string().max(600)).max(30),
        /** Set for an entry read from a Projects section. Dropped by this schema until 2026-10-09, which turned every saved project into a "job". */
        isProject: z.boolean().optional(),
      }),
    )
    .max(20),
  education: z
    .array(
      z.object({
        qualification: z.string().max(300),
        institution: z.string().max(200).nullable(),
        dates: z.string().max(80).nullable(),
      }),
    )
    .max(15),
  skills: z.array(z.string().max(80)).max(80),
  other: z.array(z.object({ heading: z.string().max(80), lines: z.array(z.string().max(600)).max(30) })).max(10),
  unplaced: z.number(),
  order: z.array(z.string().max(40)).max(20),
})

const saveSchema = z.object({
  sections: sectionsSchema,
  targetRole: z.string().trim().max(120).optional(),
  label: z.string().trim().min(1).max(120).optional(),
})

export type SaveResumeResponse =
  | { ok: true; saved: SavedResume }
  | { ok: false; error: string; needsSignIn?: boolean }

export async function saveResumeToAccount(
  input: z.input<typeof saveSchema>,
): Promise<SaveResumeResponse> {
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'There is nothing to save yet.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      needsSignIn: true,
      error: 'Sign in to keep this résumé. It stays on this page while you do.',
    }
  }

  const { targetRole, label } = parsed.data
  /**
   * `order` is display metadata the document never reads, and validating it as
   * an enum would reject a saved résumé for a heading name we later rename. It
   * is stored empty and the schema keeps it as plain strings for that reason.
   */
  const sections: ResumeSections = { ...parsed.data.sections, order: [] }
  const body = sectionsToText(sections)

  /**
   * ⚠️ THE SCORE IS RECOMPUTED SERVER-SIDE, NEVER TAKEN FROM THE CLIENT. It is
   * stored, so it will be shown back later as fact — "84 when you saved it" —
   * and a number the browser supplied is a number anybody can supply. The
   * document itself is client-supplied and that is fine (it is theirs, and it
   * is handed straight back); a SCORE is an assertion by us about it.
   */
  let score: number | null = null
  try {
    score = checkResume(body, targetRole || undefined).readability.score
  } catch {
    // Too short to assess. Saving is still the right outcome — the candidate
    // asked to keep their work, not to be graded on it.
  }

  try {
    const saved = await saveResume({
      userId: user.id,
      label: label?.trim() || defaultLabel(targetRole),
      targetRole: targetRole?.trim() || null,
      sections,
      body,
      score,
    })
    revalidatePath('/resume')
    return { ok: true, saved }
  } catch {
    return { ok: false, error: 'We could not save it just now. Your résumé is still on this page.' }
  }
}

export type DeleteResumeResponse = { ok: true } | { ok: false; error: string }

export async function deleteSavedResume(input: { id: string }): Promise<DeleteResumeResponse> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That résumé no longer exists.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to manage your saved résumés.' }

  try {
    await deleteResume(user.id, parsed.data.id)
    revalidatePath('/resume')
    return { ok: true }
  } catch {
    return { ok: false, error: 'We could not delete it just now. Try again in a moment.' }
  }
}

export type PrimaryResumeResponse = { ok: true } | { ok: false; error: string }

export async function makePrimaryResume(input: { id: string }): Promise<PrimaryResumeResponse> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That résumé no longer exists.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in to manage your saved résumés.' }

  if (!(await setPrimaryResume(user.id, parsed.data.id))) {
    return { ok: false, error: 'We could not set that just now. If it keeps failing, the primary-résumé update has not been applied yet.' }
  }
  revalidatePath('/resume')
  return { ok: true }
}

/** "Backend Engineer — 9 Sep", so a list of ten is readable at a glance. */
function defaultLabel(targetRole?: string): string {
  const when = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return `${targetRole?.trim() || 'Résumé'} — ${when}`
}
