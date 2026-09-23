import { createClient } from '@/lib/supabase/server'

/**
 * A candidate taking back their own "this score looks wrong" report.
 *
 * Added 2026-09-23 with the report popover (TASK-100, docs/QA-AUDIT.md QA-14):
 * reporting used to fire on the first tap with no reason and no way back. Runs
 * on the caller's client — the "own reports" policy (migration 0002) already
 * allows a candidate to delete their own rows and nobody else's; the user_id
 * filter is for correctness, the policy is the security.
 */
export async function deleteOwnReport(userId: string, gateResultId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('refusal_reports')
    .delete()
    .eq('user_id', userId)
    .eq('gate_result_id', gateResultId)
  return !error
}
