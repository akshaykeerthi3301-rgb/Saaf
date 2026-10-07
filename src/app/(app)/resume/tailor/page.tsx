import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { listResumes, getResume } from '@/lib/services/resume-documents'
import { resolveToolRole } from '@/lib/services/tools'
import { ParamSelect, RolePicker } from '@/components/features/role-picker'
import { TailorStudio } from '@/components/features/tailor-studio'
import { displayEmployer } from '@/lib/display-names'
import { ToolEmpty } from '@/components/features/tool-empty'

export const metadata = { title: 'Resume Tailoring Studio — Saaf' }

/**
 * Resume Tailoring Studio: a SAVED résumé beside a version rewritten for one
 * scored role. Reached from the job panel's Co-Pilot tab (`?role=`), or from
 * the nav with the best-scoring role preselected.
 *
 * ⚠️ IT WORKS ON A SAVED RÉSUMÉ, NOT THE UPLOADED FILE — we never keep the file
 * (src/app/(app)/resume/page.tsx). With nothing saved, the page sends the
 * candidate to build one rather than rendering an empty studio.
 */
export default async function TailorPage({
  searchParams,
}: { searchParams: Promise<{ role?: string; resume?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { role: roleParam, resume: resumeParam } = await searchParams
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  const [tool, saved] = await Promise.all([
    resolveToolRole(user.id, roleParam),
    listResumes(user.id).catch(() => []),
  ])
  const chosen = saved.find((r) => r.id === resumeParam) ?? saved.find((r) => r.isPrimary) ?? saved[0]
  const detail = chosen ? await getResume(user.id, chosen.id).catch(() => null) : null

  return (
    <AppShell title="Resume Tailoring Studio" eyebrow="AI Resume Builder" initials={initials}>
      <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
        {!tool.selected ? (
          <ToolEmpty
            icon={FileText}
            title="Nothing scored yet"
            body="Tailoring aims your résumé at a specific posting, so there has to be a scored role first."
            href="/today"
            cta="See your matches"
          />
        ) : !detail ? (
          <ToolEmpty
            icon={FileText}
            title="Save a résumé first"
            body="The studio rewrites a résumé you have built and saved in Saaf — we never keep the file you upload. Upload yours to the checker, press Save, and come back."
            href="/tools/ats-checker"
            cta="Build and save a résumé"
          />
        ) : (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-2 print:hidden">
              <RolePicker options={tool.options} selected={tool.selected.id} />
              <ParamSelect
                param="resume"
                label="Résumé to tailor"
                selected={detail.id}
                options={saved.map((r) => ({ value: r.id, label: r.label }))}
              />
            </div>
            {tool.error ? (
              <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{tool.error}</p>
            ) : (
              <TailorStudio
                key={`${tool.selected.id}:${detail.id}`}
                roleId={tool.selected.id}
                resumeId={detail.id}
                resumeLabel={detail.label}
                original={detail.sections}
                roleTitle={tool.selected.title}
                company={displayEmployer(tool.selected.company)}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

