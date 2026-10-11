import { redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/features/profile-form'
import { PreferencesPanel } from '@/components/features/preferences-panel'
import { readAccountSummary, readPreferences } from '@/lib/services/workspace'
import { profileHealth } from '@/lib/profile-health'
import { connectionCounts } from '@/lib/services/network'
import { ConnectionsImport } from '@/components/features/connections-import'
import { SelfIdAnswers } from '@/components/features/self-id-answers'
import { AlertSettingsPanel } from '@/components/features/alert-settings-panel'
import { readAlertSettings } from '@/lib/services/alert-settings'
import { WalletAndInvites } from '@/components/features/wallet-and-invites'
import { readInvites, readWallet } from '@/lib/services/credits'
import { AnswerBank } from '@/components/features/answer-bank'
import { AgentSettingsPanel } from '@/components/features/agent-settings-panel'
import { readAgentSettings } from '@/lib/services/agent'
import { readAnswerBank } from '@/lib/services/answer-bank'
import { readSelfId } from '@/lib/services/self-id'
import { readPrimaryResume, readProfileExtras } from '@/lib/services/profile-cards'
import { ProfileSidebar, type ProfileView } from '@/components/features/profile-sidebar'
import { ProfileMain } from '@/components/features/profile-main'
import { ExtensionBanner } from '@/components/features/extension-banner'
import { ProfilePersonal } from '@/components/features/profile-personal'
import { ProfilePreferences } from '@/components/features/profile-preferences'
import { favouriteSkills } from '@/lib/profile-extras'
import { headline, listEducation, listExperience, listProjects, emptySections } from '@/lib/profile-entries'

/** Saving skills, a city or a role rebuilds the candidate's matches, which can take a while on a large index. */
export const maxDuration = 300

const VIEWS = ['profile', 'personal', 'preferences', 'settings'] as const
type View = (typeof VIEWS)[number]

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const asked = (await searchParams).view
  const view: View = (VIEWS as readonly string[]).includes(asked ?? '') ? (asked as View) : 'profile'

  const { data: profile } = await supabase
    .from('profiles')
    /**
     * ⚠️ `*`, NOT A NAMED LIST, AND THAT IS LOAD-BEARING HERE.
     *
     * preferred_roles and keywords arrive with migration 0022, which is applied
     * by hand. Naming them made this select fail on an unmigrated database, the
     * profile came back null, and the page redirected to /start — so adding an
     * optional feature took the whole profile screen down and made it look like
     * the candidate's data had been lost. Observed immediately after wiring it.
     *
     * With `*` a missing column is simply an absent key, and the form falls back
     * to the single-role behaviour. Same reason src/lib/evaluate-user.ts selects
     * `*` — this codebase's migrations are always ahead of its database.
     */
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/start')

  const email = user.email ?? ''
  const initials = (email || 'you').slice(0, 2).toUpperCase()
  const [prefs, account, extrasRead, primary, selfId, answers, connections] = await Promise.all([
    readPreferences(user.id), readAccountSummary(user.id, email), readProfileExtras(user.id), readPrimaryResume(user.id),
    readSelfId(user.id), readAnswerBank(user.id), connectionCounts(user.id),
  ])
  const extraRoles = (profile.preferred_roles ?? []).filter((r: string) => r.toLowerCase() !== (profile.preferred_role ?? '').toLowerCase())
  const health = profileHealth({
    currentTitle: profile.current_title, employer: profile.employer,
    yearsExperience: profile.years_experience === null ? null : Number(profile.years_experience),
    city: profile.city, preferredRole: profile.preferred_role,
    extraRoles,
    skills: profile.skills ?? [], workMode: profile.work_mode_preference,
    seniority: prefs.seniority, salaryMin: prefs.salaryMin,
  })

  const fullName: string = profile.full_name ?? ''
  const [firstName = '', ...rest] = fullName.trim().split(/\s+/).filter(Boolean)
  const shownName = fullName.trim() || email.split('@')[0] || 'You'
  const skills: string[] = profile.skills ?? []
  const favourites = favouriteSkills(skills, profile.keywords ?? [])

  const selfIdPanel = <SelfIdAnswers initial={selfId.answers} stored={selfId.stored} />

  let body
  if (view === 'personal') {
    body = <ProfilePersonal data={{ firstName, lastName: rest.join(' '), email, phone: profile.phone ?? '', city: profile.city ?? '', extras: extrasRead.extras, selfId: selfId.answers }} selfIdPanel={selfIdPanel} />
  } else if (view === 'preferences') {
    body = (
      <ProfilePreferences data={{
        extras: extrasRead.extras, prefs, workMode: profile.work_mode_preference ?? 'no_preference',
        primaryRole: profile.preferred_role ?? '', extraRoles, skills, favourites, keywords: profile.keywords ?? [], status: account.status, city: profile.city ?? '',
      }} />
    )
  } else if (view === 'settings') {
    body = (
      <>
        <PreferencesPanel initial={prefs} health={health} />
        <ProfileForm initial={{
          currentTitle: profile.current_title ?? '',
          employer: profile.employer ?? '',
          yearsExperience: String(profile.years_experience ?? ''),
          preferredRole: profile.preferred_role ?? '',
          // The stored array leads with the primary, so the extras are the tail.
          extraRoles,
          keywords: profile.keywords ?? [],
          openToAdjacent: profile.open_to_adjacent === true,
          skills,
          city: profile.city ?? '',
          credential: profile.credential ?? 'none',
          workModePreference: profile.work_mode_preference ?? 'no_preference',
          salaryExpectation: profile.salary_expectation ?? '',
          fullName: profile.full_name ?? '',
          phone: profile.phone ?? '',
          linkedinUrl: profile.linkedin_url ?? '',
          portfolioUrl: profile.portfolio_url ?? '',
          noticePeriod: profile.notice_period ?? '',
        }}
          email={email}
          applyExtras={<><AgentSettingsPanelLoader userId={user.id} /><AnswerBank initial={answers.bank} stored={answers.stored} />{selfIdPanel}</>}
          accountExtras={<AccountExtras userId={user.id} connections={connections} />}
        />
      </>
    )
  } else {
    const sections = primary?.resume.sections ?? emptySections()
    body = (
      <ProfileMain
        data={{
          resume: primary ? { id: primary.resume.id, label: primary.resume.label, updatedAt: primary.resume.updatedAt, isPrimary: primary.isPrimary } : null,
          experience: listExperience(sections), projects: listProjects(sections), education: listEducation(sections),
          links: { linkedin: profile.linkedin_url ?? '', portfolio: profile.portfolio_url ?? '', github: extrasRead.extras.githubUrl, other: extrasRead.extras.otherUrl },
          skills, favourites, languages: extrasRead.extras.languages, answersCount: answers.bank.filter((b) => b.a.trim()).length,
 extrasStored: extrasRead.stored,
        }}
        networkPanel={<ConnectionsImport counts={connections ?? { linkedin: 0, google: 0, manual: 0, sourced: false }} stored={connections !== null} />}
        answersPanel={<AnswerBank initial={answers.bank} stored={answers.stored} />}
      />
    )
  }

  return (
    <AppShell title="Profile" eyebrow="Your baseline" initials={initials}>
      <div className="mx-auto max-w-[1180px] p-5 sm:p-8">
        {!extrasRead.stored && view !== 'settings' ? (
          <p role="note" className="mb-4 rounded-2xl border border-score-mid/40 bg-score-mid/10 px-5 py-3 text-sm text-primary">
            A few fields here (GitHub, other link, languages, address, birthday and some preferences) need a database update that has not been applied yet. They show empty and will not save until it is.
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <ProfileSidebar view={view as ProfileView | 'settings'} name={shownName} initials={initials} headline={headline(profile.current_title, profile.employer)} status={account.status} health={health} />
          <div className="min-w-0">
            {view !== 'settings' ? <ExtensionBanner storeUrl={process.env.NEXT_PUBLIC_EXTENSION_URL ?? ''} /> : null}
            {body}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

async function AgentSettingsPanelLoader({ userId }: { userId: string }) {
  const agent = await readAgentSettings(userId)
  return <AgentSettingsPanel initial={agent.settings} stored={agent.stored} />
}

async function AccountExtras({ userId, connections }: { userId: string; connections: Awaited<ReturnType<typeof connectionCounts>> }) {
  const [alerts, wallet, invites] = await Promise.all([readAlertSettings(userId), readWallet(), readInvites(userId)])
  return (
    <>
      <AlertSettingsPanel initial={alerts.settings} stored={alerts.stored} />
      <ConnectionsImport counts={connections ?? { linkedin: 0, google: 0, manual: 0, sourced: false }} stored={connections !== null} />
      <WalletAndInvites stored={wallet.stored} balance={wallet.balance} rows={wallet.rows} code={invites.code} joined={invites.joined} invitesStored={invites.stored} />
    </>
  )
}
