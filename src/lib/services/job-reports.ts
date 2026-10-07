import { createClient } from '@/lib/supabase/server'
import type { JobReportKind } from '@/lib/job-share'

/**
 * A candidate's report about a posting (migration 0036). Runs on the caller's
 * client: RLS lets a candidate insert and read only their own rows; the
 * user_id filters are for correctness.
 */
export type FileReportResult = { ok: true } | { ok: false; reason: 'missing-update' | 'failed' }

export async function fileJobReport(userId: string, roleId: string, kind: JobReportKind, note: string | null): Promise<FileReportResult> {
  const supabase = await createClient()
  // Denormalised onto the report so it outlives the posting (the prune deletes roles).
  const { data: role } = await supabase.from('roles').select('title, company_name').eq('id', roleId).maybeSingle()
  const { error } = await supabase.from('job_reports').upsert(
    { user_id: userId, role_id: roleId, kind, note, title: role?.title ?? null, company: role?.company_name ?? null },
    { onConflict: 'user_id,role_id,kind' },
  )
  if (!error) return { ok: true }
  // 42P01 undefined_table / PGRST205 table not in the schema cache: 0036 is not applied.
  return { ok: false, reason: error.code === '42P01' || error.code === 'PGRST205' ? 'missing-update' : 'failed' }
}
