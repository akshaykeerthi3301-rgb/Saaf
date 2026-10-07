import { createClient } from '@/lib/supabase/server'
import { getResume, listResumes } from '@/lib/services/resume-documents'
import { countConnections } from '@/lib/services/network'

/**
 * "Download my data" (TASK-189) — everything Saaf holds about one candidate, as
 * one file they can keep. The right of access under India's DPDP Act, and the
 * honest answer to "what do you actually store?".
 *
 * ⚠️ RUNS AS THE CALLER, NEVER AS THE SERVICE ROLE. Every read is the signed-in
 * candidate's own client, so RLS is the security and a bug here cannot read
 * somebody else's rows; the `user_id` filters are correctness.
 *
 * ⚠️ WHAT IS LEFT OUT IS SAID, NOT HIDDEN. The scores are derived from the profile
 * and rebuilt on every save, so they are counted rather than dumped; the people in
 * the candidate's own LinkedIn export are other people's names, so only their
 * number is given here (they were the candidate's own upload and are deleted with
 * the account). A table that does not exist yet (its migration unapplied) is
 * reported as such rather than as empty.
 */

export type AccountExport = {
  exportedAt: string
  account: { email: string | null }
  profile: Record<string, unknown> | null
  applications: Record<string, unknown>[] | null
  savedResumes: { label: string; targetRole: string | null; updatedAt: string; sections: unknown }[] | null
  counts: { scoredRoles: number | null; connectionsUploaded: number | null }
  notes: string[]
}

export async function readAccountExport(userId: string, email: string | null): Promise<AccountExport> {
  const supabase = await createClient()
  const notes: string[] = []

  const [profile, apps, scored, connections, resumes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('applications').select('*').eq('user_id', userId),
    supabase.from('gate_results').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    countConnections(userId),
    listResumes(userId).then(
      (list) => Promise.all(list.map((r) => getResume(userId, r.id))),
      () => null,
    ),
  ])

  if (apps.error) notes.push('Your applications could not be read for this file.')
  if (resumes === null) notes.push('Your saved résumés could not be read for this file.')
  notes.push('Scores are derived from your profile and rebuilt every time you save, so they are counted here, not listed.')
  if (connections === null) notes.push('Connections need a database update that has not been applied yet.')
  else notes.push('The names in your uploaded LinkedIn export are other people’s, so only their number is given here. They are deleted with your account.')

  return {
    exportedAt: new Date().toISOString(),
    account: { email },
    profile: (profile.data as Record<string, unknown> | null) ?? null,
    applications: apps.error ? null : ((apps.data ?? []) as Record<string, unknown>[]),
    savedResumes:
      resumes === null
        ? null
        : resumes.flatMap((r) => (r ? [{ label: r.label, targetRole: r.targetRole, updatedAt: r.updatedAt, sections: r.sections }] : [])),
    counts: { scoredRoles: scored.error ? null : scored.count ?? 0, connectionsUploaded: connections },
    notes,
  }
}
