'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { moveApplications, quickApply, stampStage, writeApplicationRecord } from '@/lib/services/applications'

/**
 * The application tracker's writes.
 *
 * Unlike gate_results, which the ingest writes under the service role, this
 * table has a user-facing insert and update policy because the candidate is its
 * only author. Every action here therefore runs on the request client and leans
 * on RLS — `auth.uid() = user_id` — rather than filtering by user in the query
 * and hoping. The explicit user check is UX, so a signed-out click gets a
 * sentence instead of a silent no-op; the security is the policy.
 */

// 'applying' arrives with migration 0028. Until it is applied the database
// rejects it, the write returns { ok: false }, and the board rolls back.
const STATUSES = ['saved', 'applying', 'applied', 'interviewing', 'offer', 'closed'] as const
export type ApplicationStatus = (typeof STATUSES)[number]

const failed = (error: string) => ({ ok: false as const, error })
const done = () => {
  revalidatePath('/applications')
  return { ok: true as const }
}

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

const trackSchema = z.object({
  roleId: z.string().uuid().optional(),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  // http(s) only. z.string().url() accepts any scheme, so a "javascript:" link
  // was stored (QA-16). React refuses to render it today; the rule belongs at
  // the boundary so no later, non-React consumer inherits the row.
  applyUrl: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), 'The link needs to start with http:// or https://.').optional(),
  /**
   * Which column it lands in. Defaults to 'saved' at the database level.
   *
   * ⚠️ IT IS SET ON THE INSERT RATHER THAN BY A FOLLOW-UP UPDATE. The board's
   * add-by-hand form briefly did the latter — insert, then call
   * setApplicationStatus with the id it had optimistically generated — which
   * silently did nothing, because that id does not exist server-side and the
   * update matched zero rows. Only a row the database created has an id worth
   * writing against.
   */
  status: z.enum(STATUSES).optional(),
})

/**
 * Track a role. Idempotent for an indexed role, matching the report control:
 * a second tap is not a second row, because a candidate who taps twice means
 * "track this", not "track this twice".
 */
export async function trackRole(input: z.input<typeof trackSchema>) {
  const parsed = trackSchema.safeParse(input)
  if (!parsed.success) return failed('That role could not be tracked.')

  const { supabase, user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const { roleId, company, title, applyUrl, status } = parsed.data
  const row = {
    user_id: user.id,
    role_id: roleId ?? null,
    company, title,
    apply_url: applyUrl ?? null,
    // Omitted rather than defaulted here, so the column default in
    // migration 0015 stays the single source of truth for "where new work lands".
    ...(status ? { status } : {}),
  }

  // The unique index covers (user_id, role_id) only where role_id is not null,
  // so a hand-added job cannot collide and does not go through the upsert path.
  const { error } = roleId
    ? await supabase.from('applications').upsert(row, { onConflict: 'user_id,role_id', ignoreDuplicates: true })
    : await supabase.from('applications').insert(row)

  return error ? failed('Could not save that.') : done()
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
})

export async function setApplicationStatus(input: z.input<typeof statusSchema>) {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return failed('Unknown status.')

  const { supabase, user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('applications')
    .update({ status: parsed.data.status, updated_at: now })
    .eq('id', parsed.data.id)
  if (error) return failed(moveFailure(parsed.data.status))

  await stampStage([parsed.data.id], parsed.data.status, now)
  return done()
}

/** Named, so a refused move into the new column says what is missing. */
function moveFailure(status: ApplicationStatus): string {
  return status === 'applying'
    ? 'The Applying column needs a database update that has not been applied yet.'
    : 'Could not move that.'
}

const bulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(STATUSES),
})

/** Table view's bulk move. One write; RLS limits it to the caller's rows. */
export async function bulkSetApplicationStatus(input: z.input<typeof bulkSchema>) {
  const parsed = bulkSchema.safeParse(input)
  if (!parsed.success) return failed('Pick at least one application.')

  const { user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const now = new Date().toISOString()
  const { ok } = await moveApplications(parsed.data.ids, parsed.data.status, now)
  if (!ok) return failed(moveFailure(parsed.data.status))

  await stampStage(parsed.data.ids, parsed.data.status, now)
  return done()
}

const recordSchema = z.object({
  id: z.string().uuid(),
  appliedOn: z.union([z.string().date(), z.literal(''), z.null()]).optional(),
  resumeVersion: z.string().trim().max(120).nullable().optional(),
  salaryNote: z.string().trim().max(200).nullable().optional(),
  interviewOn: z.union([z.string().date(), z.literal(''), z.null()]).optional(),
})

/**
 * The application record's 0028 fields: date applied, résumé version, pay
 * discussed, interview date. Says so plainly when the migration is missing,
 * rather than returning a generic failure the candidate cannot act on.
 */
export async function setApplicationRecord(input: z.input<typeof recordSchema>) {
  const parsed = recordSchema.safeParse(input)
  if (!parsed.success) return failed('Some of those details could not be read.')

  const { user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const d = parsed.data
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (d.appliedOn !== undefined) patch.applied_on = d.appliedOn || null
  if (d.resumeVersion !== undefined) patch.resume_version = d.resumeVersion || null
  if (d.salaryNote !== undefined) patch.salary_note = d.salaryNote || null
  if (d.interviewOn !== undefined) patch.interview_on = d.interviewOn || null

  const { ok } = await writeApplicationRecord(d.id, patch)
  return !ok
    ? failed('Those fields need a database update that has not been applied yet — notes and follow-up dates still save.')
    : done()
}

const detailSchema = z.object({
  id: z.string().uuid(),
  note: z.string().max(2000).nullable().optional(),
  // A date, or cleared. Empty string comes off an <input type="date"> that the
  // candidate emptied, and means "no follow-up", not "invalid".
  followUpOn: z.union([z.string().date(), z.literal(''), z.null()]).optional(),
})

export async function setApplicationDetail(input: z.input<typeof detailSchema>) {
  const parsed = detailSchema.safeParse(input)
  if (!parsed.success) return failed('Could not save that.')

  const { supabase, user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.note !== undefined) patch.note = parsed.data.note || null
  if (parsed.data.followUpOn !== undefined) patch.follow_up_on = parsed.data.followUpOn || null

  const { error } = await supabase.from('applications').update(patch).eq('id', parsed.data.id)
  return error ? failed('Could not save that.') : done()
}

export async function removeApplication(input: { id: string }) {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return failed('Could not remove that.')

  const { supabase, user } = await currentUser()
  if (!user) return failed('Not signed in.')

  const { error } = await supabase.from('applications').delete().eq('id', parsed.data.id)
  return error ? failed('Could not remove that.') : done()
}

const quickSchema = z.object({
  roleId: z.string().uuid(),
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  applyUrl: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), 'The link needs to start with http:// or https://.'),
})

/**
 * Quick Apply's tracker write: file the role if it is not tracked, and move a
 * Saved one to Applying. Returns the stage it ended in, so the button can say
 * so. A role already past Saved is left where it is — Quick Apply must never
 * drag an Interviewing card backwards.
 *
 * ⚠️ Saaf does not submit the application (locked decision). This only files
 * it; the candidate submits on the employer's form.
 */
export async function quickApplyRole(input: z.input<typeof quickSchema>) {
  const parsed = quickSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That role could not be tracked.' }

  const { user } = await currentUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const res = await quickApply({ userId: user.id, ...parsed.data })
  if (!res.ok) return { ok: false as const, error: 'Could not save that.' }
  revalidatePath('/applications')
  return { ok: true as const, status: res.status }
}
