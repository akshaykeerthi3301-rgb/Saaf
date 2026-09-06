import { redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/features/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_title, employer, years_experience, preferred_role, open_to_adjacent, skills, city, credential, work_mode_preference, salary_expectation')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/start')

  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Profile & settings" initials={initials}>
      <div className="mx-auto max-w-2xl p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your profile</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-primary sm:text-3xl">
          What we match you against.
        </h2>
        <p className="mb-8 mt-2 text-sm leading-6 text-muted-foreground">
          Changing anything here re-runs the gates against today&apos;s roles.
        </p>
        <ProfileForm initial={{
          currentTitle: profile.current_title ?? '',
          employer: profile.employer ?? '',
          yearsExperience: String(profile.years_experience ?? ''),
          preferredRole: profile.preferred_role ?? '',
          openToAdjacent: profile.open_to_adjacent === true,
          skills: profile.skills ?? [],
          city: profile.city ?? '',
          credential: profile.credential ?? 'none',
          workModePreference: profile.work_mode_preference ?? 'no_preference',
          salaryExpectation: profile.salary_expectation ?? '',
        }} />
      </div>
    </AppShell>
  )
}
