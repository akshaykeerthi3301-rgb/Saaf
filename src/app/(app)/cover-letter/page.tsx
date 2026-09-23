import { redirect } from 'next/navigation'
import { PenLine } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { resolveToolRole } from '@/lib/services/tools'
import { readAccountSummary } from '@/lib/services/workspace'
import { RolePicker } from '@/components/features/role-picker'
import { CoverLetterStudio } from '@/components/features/cover-letter-studio'
import { ToolEmpty } from '@/components/features/tool-empty'
import { matchedSkills } from '@/lib/tailor'
import { displayEmployer } from '@/lib/display-names'

export const metadata = { title: 'Cover Letter Studio — Saaf' }

/**
 * AI Cover Letter Studio for one scored role. The profile facts passed to the
 * client are the candidate's own, read under RLS; the model call re-reads them
 * server-side rather than trusting what the page sends (copilot-tools.ts).
 */
export default async function CoverLetterPage({
  searchParams,
}: { searchParams: Promise<{ role?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { role } = await searchParams
  const [tool, account] = await Promise.all([
    resolveToolRole(user.id, role),
    readAccountSummary(user.id, user.email ?? ''),
  ])
  const initials = account.initials

  return (
    <AppShell title="Cover Letter Studio" eyebrow="AI Co-Pilot" initials={initials}>
      <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
        {!tool.selected ? (
          <ToolEmpty icon={PenLine} title="Nothing scored yet" body="A cover letter is written for a specific posting, so there has to be a scored role first." href="/today" cta="See your matches" />
        ) : !tool.context ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{tool.error}</p>
        ) : (
          <>
            <div className="mb-5 max-w-2xl"><RolePicker options={tool.options} selected={tool.selected.id} /></div>
            <CoverLetterStudio
              key={tool.selected.id}
              roleId={tool.selected.id}
              me={tool.context.me}
              defaults={{
                Company: displayEmployer(tool.context.role.company),
                Role: tool.context.role.title,
                'Target Skill': matchedSkills(tool.context.me, tool.context.role)[0] ?? tool.context.me.skills[0] ?? '',
                'Your Name': account.name ?? '',
              }}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
