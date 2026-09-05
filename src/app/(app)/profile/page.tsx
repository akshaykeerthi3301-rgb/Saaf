import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/features/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_title, employer, years_experience, preferred_role, open_to_adjacent, city, credential, work_mode_preference, salary_expectation')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/start')

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        Your profile
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
        Changing anything here re-runs the gates against today&apos;s roles.
      </p>
      <ProfileForm initial={{
        currentTitle: profile.current_title ?? '',
        employer: profile.employer ?? '',
        yearsExperience: String(profile.years_experience ?? ''),
        preferredRole: profile.preferred_role ?? '',
        openToAdjacent: profile.open_to_adjacent === true,
        city: profile.city ?? '',
        credential: profile.credential ?? 'none',
        workModePreference: profile.work_mode_preference ?? 'no_preference',
        salaryExpectation: profile.salary_expectation ?? '',
      }} />
    </main>
  )
}
