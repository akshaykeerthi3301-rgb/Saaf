'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'closed'] as const
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
  applyUrl: z.string().url().max(2000).optional(),
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

  const { roleId, company, title, applyUrl } = parsed.data
  const row = {
    user_id: user.id,
    role_id: roleId ?? null,
    company, title,
    apply_url: applyUrl ?? null,
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

  const { error } = await supabase
    .from('applications')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id)

  return error ? failed('Could not move that.') : done()
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
