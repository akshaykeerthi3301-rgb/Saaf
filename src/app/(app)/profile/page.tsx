import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/features/profile-form'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_title, employer, years_experience, function, city, credential, channel_budget, institute_tier, hr_track')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/start')

  // Whichever of the three columns matches this profile's own function —
  // they're mutually exclusive by construction, same as the write side in
  // confirm-profile.ts.
  const assessmentAnswer = {
    marketing: profile.channel_budget,
    consulting: profile.institute_tier,
    hr: profile.hr_track,
  }[profile.function as 'marketing' | 'consulting' | 'hr'] ?? ''

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
        fn: profile.function ?? 'engineering',
        city: profile.city ?? '',
        credential: profile.credential ?? 'none',
        assessmentAnswer,
      }} />
    </main>
  )
}
