import { createClient } from '@/lib/supabase/server'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * The résumé tailored for one job, kept with that job (migration 0051). Not the ten-slot library.
 *
 * Runs as the signed-in candidate, never the service role: row-level security does the real work and the `user_id`
 * filters are belt and braces, exactly as in resume-documents.ts. Every function swallows a missing table (the update
 * is applied by hand) and answers "nothing saved" — the tailor result then simply starts fresh each time.
 */

export type TailoredResume = {
  roleId: string
  sections: ResumeSections
  /** The export drawer's choices as last left; null when none were saved. Validated by the caller before use. */
  style: unknown
  score: number | null
  baseResumeId: string | null
  updatedAt: string
}

type Row = {
  role_id: string
  sections: unknown
  style: unknown
  score: number | null
  base_resume_id: string | null
  updated_at: string
}

export async function getTailored(userId: string, roleId: string): Promise<TailoredResume | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tailored_resumes')
      .select('role_id, sections, style, score, base_resume_id, updated_at')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .maybeSingle()
    if (error || !data) return null
    const r = data as Row
    return { roleId: r.role_id, sections: r.sections as ResumeSections, style: r.style, score: r.score, baseResumeId: r.base_resume_id, updatedAt: r.updated_at }
  } catch {
    return null
  }
}

/** Insert or replace the one row for (person, job). False when the table is missing or the write failed. */
export async function saveTailored(input: {
  userId: string
  roleId: string
  roleTitle: string
  company: string
  baseResumeId: string | null
  sections: ResumeSections
  style: unknown
  score: number | null
}): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('tailored_resumes').upsert(
      {
        user_id: input.userId,
        role_id: input.roleId,
        role_title: input.roleTitle.slice(0, 200),
        company: input.company.slice(0, 200),
        base_resume_id: input.baseResumeId,
        sections: input.sections,
        style: input.style ?? null,
        score: input.score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,role_id' },
    )
    return !error
  } catch {
    return false
  }
}
