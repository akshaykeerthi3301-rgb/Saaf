import { createClient } from '@/lib/supabase/server'

/**
 * Tracker writes added by the 2026-09-23 parity pass. The five writes that
 * predate it stay in src/app/actions/applications.ts as legacy sites (CLAUDE.md
 * invariant 3: do not add a 25th, do not bulk-migrate unasked); these are new,
 * so they live here.
 *
 * All on the caller's client: the "own applications" policy (0015) is the
 * security. The actions re-authenticate before calling any of these.
 */

type Stage = 'saved' | 'applying' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'closed'

/** Move several rows at once (the table view's bulk action). */
export async function moveApplications(ids: string[], status: Stage, now: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').update({ status, updated_at: now }).in('id', ids)
  return { ok: !error }
}

/**
 * The 0028 bookkeeping for a move: when it changed stage, and the date it was
 * applied (first time into Applied only — a card dragged back and forth keeps
 * its real date).
 *
 * ⚠️ BEST-EFFORT, AND SEPARATE FROM THE STATUS WRITE, ON PURPOSE. Until
 * migration 0028 is applied these columns do not exist; folding them into the
 * status update would make every move fail. The move is what the candidate
 * asked for, so it lands first and this follows.
 */
export async function stampStage(ids: string[], status: Stage, now: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('applications').update({ status_changed_at: now }).in('id', ids)
  if (status === 'applied') {
    await supabase.from('applications').update({ applied_on: now.slice(0, 10) }).in('id', ids).is('applied_on', null)
  }
}

/** The record's 0028 fields. False when the migration is missing. */
export async function writeApplicationRecord(id: string, patch: Record<string, unknown>): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('applications').update(patch).eq('id', id)
  return { ok: !error }
}

/**
 * Quick Apply: file the role if untracked, move a Saved one to Applying, and
 * report the stage it ended in. A role already past Saved is left alone.
 */
export async function quickApply(input: {
  userId: string
  roleId: string
  company: string
  title: string
  applyUrl: string
}): Promise<{ ok: true; status: Stage } | { ok: false }> {
  const supabase = await createClient()
  const { userId, roleId, company, title, applyUrl } = input
  const { error } = await supabase
    .from('applications')
    .upsert(
      { user_id: userId, role_id: roleId, company, title, apply_url: applyUrl },
      { onConflict: 'user_id,role_id', ignoreDuplicates: true },
    )
  if (error) return { ok: false }

  const now = new Date().toISOString()
  const { data: moved } = await supabase
    .from('applications')
    .update({ status: 'applying', updated_at: now })
    .eq('role_id', roleId)
    .eq('status', 'saved')
    .select('id')
  if (moved?.length) await stampStage(moved.map((m) => m.id as string), 'applying', now)

  const { data: row } = await supabase.from('applications').select('status').eq('role_id', roleId).maybeSingle()
  return { ok: true, status: ((row as { status: Stage } | null)?.status ?? 'saved') }
}
