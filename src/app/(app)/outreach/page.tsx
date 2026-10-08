import { redirect } from 'next/navigation'
import { Send } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { resolveToolRole } from '@/lib/services/tools'
import { readAccountSummary } from '@/lib/services/workspace'
import { RolePicker } from '@/components/features/role-picker'
import { OutreachStudio } from '@/components/features/outreach-studio'
import { ToolEmpty } from '@/components/features/tool-empty'
import { outreachTemplates } from '@/lib/copilot-templates'
import { displayEmployer } from '@/lib/display-names'

export const metadata = { title: 'Networking & Outreach — Jobinko' }

export default async function OutreachPage({
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

  return (
    <AppShell title="Networking / Outreach" eyebrow="AI Co-Pilot" initials={account.initials}>
      <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
        {!tool.selected ? (
          <ToolEmpty icon={Send} title="Nothing scored yet" body="Outreach is written for a specific role at a specific company, so there has to be a scored role first." href="/today" cta="See your matches" />
        ) : !tool.context ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{tool.error}</p>
        ) : (
          <>
            <div className="mb-5 max-w-2xl"><RolePicker options={tool.options} selected={tool.selected.id} /></div>
            <OutreachStudio
              key={tool.selected.id}
              roleId={tool.selected.id}
              company={displayEmployer(tool.context.role.company)}
              roleTitle={tool.context.role.title}
              initial={outreachTemplates(tool.context.me, { ...tool.context.role, company: displayEmployer(tool.context.role.company) })}
              defaults={{ 'Your Name': account.name ?? '' }}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}
