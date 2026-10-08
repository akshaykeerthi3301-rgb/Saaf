import { createClient } from '@/lib/supabase/server'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * Saved résumés — the candidate's own, and nobody else's.
 *
 * ⚠️ THIS IS THE FIRST TABLE THE PRODUCT STORES A DOCUMENT IN, reversing a
 * promise made on three screens. Founder decision, 2026-09-09, taken twice in
 * writing. supabase/migrations/0023_resume_documents.sql carries the reasoning;
 * this file carries the access rules.
 *
 * ⚠️ IT USES THE ORDINARY CLIENT, NOT THE SERVICE ROLE. Every query here runs
 * as the signed-in candidate, so RLS is doing the real work and a bug in this
 * module cannot read somebody else's résumé — the database refuses before the
 * code gets a chance to be wrong. `src/lib/services/index-match.ts` needs the
 * service role because it reads an authenticated-only table for an anonymous
 * caller; this is the opposite case and must never acquire that privilege.
 *
 * ⚠️ THE `user_id` FILTERS ARE BELT AND BRACES, NOT THE SECURITY. RLS already
 * scopes every row. They are written anyway because an RLS policy is one
 * migration away from being changed by somebody who does not read this file,
 * and a query that names its owner keeps working when that happens.
 */

export type SavedResume = {
  id: string
  label: string
  targetRole: string | null
  score: number | null
  updatedAt: string
  createdAt: string
  /** True for the candidate's main résumé. Undefined when migration 0034 is not applied. */
  isPrimary?: boolean
}

export type SavedResumeDetail = SavedResume & {
  sections: ResumeSections
  body: string
}

/** Row shape, named because Supabase cannot infer jsonb into ResumeSections. */
type Row = {
  id: string
  label: string
  target_role: string | null
  score: number | null
  updated_at: string
  created_at: string
  is_primary?: boolean
  sections?: unknown
  body?: string
}

const LIST_COLUMNS = 'id, label, target_role, score, updated_at, created_at'

export async function listResumes(userId: string): Promise<SavedResume[]> {
  const supabase = await createClient()
  const read = (columns: string) =>
    supabase.from('resume_documents').select(columns).eq('user_id', userId).order('updated_at', { ascending: false }).limit(10)

  // is_primary arrives with migration 0034. An unknown column fails the whole
  // select, so a database without it falls back to the columns it always had.
  const withPrimary = await read(`${LIST_COLUMNS}, is_primary`)
  if (!withPrimary.error) {
    return ((withPrimary.data ?? []) as unknown as Row[]).map((r) => ({ ...toSaved(r), isPrimary: Boolean(r.is_primary) }))
  }
  const { data, error } = await read(LIST_COLUMNS)
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toSaved)
}

/**
 * Make one saved résumé the primary, clearing any other first (the partial
 * unique index would refuse two). False when the row is not the caller's or the
 * update (0034) is missing. Not atomic: a failure between the two writes leaves
 * no primary, which the screens treat as "none chosen" and is safe.
 */
export async function setPrimaryResume(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: mine } = await supabase.from('resume_documents').select('id').eq('user_id', userId).eq('id', id).maybeSingle()
  if (!mine) return false
  const cleared = await supabase.from('resume_documents').update({ is_primary: false }).eq('user_id', userId).eq('is_primary', true)
  if (cleared.error) return false
  const { error } = await supabase.from('resume_documents').update({ is_primary: true }).eq('user_id', userId).eq('id', id)
  return !error
}

export async function getResume(userId: string, id: string): Promise<SavedResumeDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resume_documents')
    .select(`${LIST_COLUMNS}, sections, body`)
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const row = data as Row
  return {
    ...toSaved(row),
    sections: row.sections as ResumeSections,
    body: row.body ?? '',
  }
}

/**
 * Save a résumé, replacing the one with the same label rather than piling up.
 *
 * ⚠️ REPLACE-BY-LABEL IS THE POINT. A candidate who fixes three findings and
 * saves after each one wants one document, not three. The migration also caps
 * the table at ten per user and deletes the oldest beyond that — a cap that
 * silently refuses is a cap that loses somebody's work.
 */
export async function saveResume(input: {
  userId: string
  label: string
  targetRole: string | null
  sections: ResumeSections
  body: string
  score: number | null
}): Promise<SavedResume> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('resume_documents')
    .select('id')
    .eq('user_id', input.userId)
    .eq('label', input.label)
    .maybeSingle()

  const payload = {
    user_id: input.userId,
    label: input.label,
    target_role: input.targetRole,
    sections: input.sections,
    body: input.body,
    score: input.score,
    /**
     * ⚠️ STAMPED ON EVERY WRITE, INCLUDING UPDATES. The column defaults to 'v1'
     * because a row arriving without one predates the model change by
     * definition — which makes it the wrong default for anything we write now.
     * An updated row is rescored above by the same code path as a new one, so
     * it is a v2 score and has to say so, or the backfill will keep finding it.
     * See migration 0024 and scripts/rescore-saved.ts.
     */
    score_model: 'v2' as const,
    updated_at: new Date().toISOString(),
  }

  const query = existing?.id
    ? supabase.from('resume_documents').update(payload).eq('id', existing.id).eq('user_id', input.userId)
    : supabase.from('resume_documents').insert(payload)

  const { data, error } = await query.select(LIST_COLUMNS).single()
  if (error) throw error
  return toSaved(data as Row)
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('resume_documents')
    .delete()
    .eq('user_id', userId)
    .eq('id', id)
  if (error) throw error
}

function toSaved(row: Row): SavedResume {
  return {
    id: row.id,
    label: row.label,
    targetRole: row.target_role,
    score: row.score,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

/**
 * Change one saved résumé in place — its sections, and optionally its name.
 *
 * ⚠️ BY ID, NOT BY LABEL. saveResume() replaces by label so a person who fixes and saves again gets one document; the
 * editor needs the opposite — renaming a résumé must not leave the old one behind and create a second. Returns false
 * when the row is not the caller's (RLS and the user_id filter agree) or the write failed.
 */
export async function updateResume(input: {
  userId: string
  id: string
  label?: string
  sections: ResumeSections
  body: string
  score: number | null
}): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resume_documents')
    .update({
      ...(input.label ? { label: input.label } : {}),
      sections: input.sections,
      body: input.body,
      score: input.score,
      score_model: 'v2' as const,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId)
    .eq('id', input.id)
    .select('id')
    .maybeSingle()
  return !error && Boolean(data)
}
