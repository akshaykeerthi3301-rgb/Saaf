import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { ResumeEditor } from '@/components/features/resume-editor'
import { createClient } from '@/lib/supabase/server'
import { getResume, listResumes } from '@/lib/services/resume-documents'

/**
 * One saved résumé, open for editing. The id comes from the address, so the read is by id AND owner (the service and
 * the table's own row-level security both filter on the signed-in user) — someone else's id is a 404, not a page.
 */
export default async function EditResumePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ export?: string }> }) {
  const { id } = await params
  const { export: exp } = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [resume, all] = await Promise.all([getResume(user.id, id).catch(() => null), listResumes(user.id).catch(() => [])])
  if (!resume) notFound()

  return (
    <AppShell title="Résumé" eyebrow="Your résumés" initials={(user.email ?? 'you').slice(0, 2).toUpperCase()}>
      <div className="px-5 sm:px-8">
        <ResumeEditor
          id={resume.id}
          label={resume.label}
          targetRole={resume.targetRole}
          initial={resume.sections}
          primary={Boolean(all.find((r) => r.id === id)?.isPrimary)}
          openExport={exp === '1'}
        />
      </div>
    </AppShell>
  )
}
