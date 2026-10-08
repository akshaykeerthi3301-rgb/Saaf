import { redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/features/profile-form'
import { PreferencesPanel } from '@/components/features/preferences-panel'
import { readPreferences } from '@/lib/services/workspace'
import { profileHealth } from '@/lib/profile-health'
import { connectionCounts } from '@/lib/services/network'
import { ConnectionsImport } from '@/components/features/connections-import'
import { SelfIdAnswers } from '@/components/features/self-id-answers'
import { AlertSettingsPanel } from '@/components/features/alert-settings-panel'
import { readAlertSettings } from '@/lib/services/alert-settings'
import { WalletAndInvites } from '@/components/features/wallet-and-invites'
import { readInvites, readWallet } from '@/lib/services/credits'
import { readSelfId } from '@/lib/services/self-id'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

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

  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()
  const [prefs, connections, selfId, alerts, wallet, invites] = await Promise.all([readPreferences(user.id), connectionCounts(user.id), readSelfId(user.id), readAlertSettings(user.id), readWallet(), readInvites(user.id)])
  const health = profileHealth({
    currentTitle: profile.current_title, employer: profile.employer,
    yearsExperience: profile.years_experience === null ? null : Number(profile.years_experience),
    city: profile.city, preferredRole: profile.preferred_role,
    extraRoles: (profile.preferred_roles ?? []).filter((r: string) => r.toLowerCase() !== (profile.preferred_role ?? '').toLowerCase()),
    skills: profile.skills ?? [], workMode: profile.work_mode_preference,
    seniority: prefs.seniority, salaryMin: prefs.salaryMin,
  })

  return (
    <AppShell title="Profile & Preferences" eyebrow="Your baseline" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <PreferencesPanel initial={prefs} health={health} />
        <ProfileForm initial={{
          currentTitle: profile.current_title ?? '',
          employer: profile.employer ?? '',
          yearsExperience: String(profile.years_experience ?? ''),
          preferredRole: profile.preferred_role ?? '',
          // The stored array leads with the primary, so the extras are the tail.
          extraRoles: (profile.preferred_roles ?? []).filter(
            (r: string) => r.toLowerCase() !== (profile.preferred_role ?? '').toLowerCase(),
          ),
          keywords: profile.keywords ?? [],
          openToAdjacent: profile.open_to_adjacent === true,
          skills: profile.skills ?? [],
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
          email={user.email ?? ''}
          applyExtras={<SelfIdAnswers initial={selfId.answers} stored={selfId.stored} />}
          accountExtras={<><AlertSettingsPanel initial={alerts.settings} stored={alerts.stored} /><ConnectionsImport counts={connections ?? { linkedin: 0, google: 0, manual: 0, sourced: false }} stored={connections !== null} /><WalletAndInvites stored={wallet.stored} balance={wallet.balance} rows={wallet.rows} code={invites.code} joined={invites.joined} invitesStored={invites.stored} /></>}
        />
      </div>
    </AppShell>
  )
}
