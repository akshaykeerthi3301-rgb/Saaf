import { redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { ResumeLibrary } from '@/components/features/resume-library'
import { createClient } from '@/lib/supabase/server'
import { listResumes, type SavedResume } from '@/lib/services/resume-documents'

/**
 * Résumé — rebuilt on 2026-10-09 as the reference product's library: how many slots are used, Add résumé, and a table
 * of the saved résumés with a Primary badge, a row menu and an editor behind each row.
 *
 * It used to be a long explanation of what is and is not stored, two cards sending the person to the public ATS checker
 * and a tailoring page, a list, and a dump of the profile fields. Adding a résumé from there led away from the job and
 * never back (founder, 2026-10-09). Now: Add happens in a dialog on this page; the profile fields ("what we read") live
 * on /profile, where they are edited; "Tailor to a role" is the Customize tool on every job. The privacy promise moved
 * to where it is made — the upload dialog and /privacy: the file is read once and dropped, its text is kept, and the
 * person can delete it from this table.
 */
export default async function ResumePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (!profile) redirect('/start')

  let saved: SavedResume[] = []
  try {
    saved = await listResumes(user.id)
  } catch {
    // Migration 0023 is applied by hand; until it lands the table does not exist and the page shows the empty state.
  }

  return (
    <AppShell title="Résumé" eyebrow="Your résumés" initials={(user.email ?? 'you').slice(0, 2).toUpperCase()}>
      <div className="mx-auto max-w-5xl p-5 sm:p-8">
        <ResumeLibrary resumes={saved} />
      </div>
    </AppShell>
  )
}
