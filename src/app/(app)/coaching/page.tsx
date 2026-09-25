import { redirect } from 'next/navigation'
import { ArrowUpRight, GraduationCap } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { listCoaches } from '@/lib/services/coaching'
import { CoachApplication } from '@/components/features/coach-application'

/**
 * Career coaching (2026-09-25; Jobright's "Coaching", OBSERVED). A directory of
 * coaches the founder has vetted, each linking to their own booking page. No
 * ratings are shown until there are real sessions behind them.
 */
export default async function CoachingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')
  const { coaches, stored } = await listCoaches()
  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Coaching" eyebrow="People who hire, on your side" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          One-to-one help with your résumé, interviews and negotiation, from people who have hired. You book and pay the coach directly on their own page — Saaf takes nothing and sees nothing of the session.
        </p>

        {coaches.length ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {coaches.map((c) => (
              <li key={c.id} className="glow-hover flex flex-col rounded-2xl border border-border bg-card p-5">
                <p className="text-base font-semibold text-primary">{c.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{c.headline}</p>
                {c.bio ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{c.bio}</p> : null}
                {c.expertise.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.expertise.map((e) => <span key={e} className="rounded-md bg-secondary px-2 py-1 text-xs text-primary">{e}</span>)}
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {[c.languages.length ? c.languages.join(', ') : null, c.priceNote].filter(Boolean).join(' · ')}
                </p>
                <div className="mt-auto flex gap-3 pt-4">
                  <a href={c.bookingUrl} target="_blank" rel="noopener noreferrer" className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold">
                    Book a session <ArrowUpRight className="size-3.5" />
                  </a>
                  {c.profileUrl ? (
                    <a href={c.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">Profile <ArrowUpRight className="size-3" /></a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <GraduationCap className="size-6 text-accent" />
            <p className="mt-3 text-sm font-semibold text-primary">No coaches listed yet</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We list coaches only after checking who they are, so this starts empty rather than with names we made up.
              {!stored ? ' (It also needs a database update, 0031, that has not been applied yet.)' : ''}
            </p>
          </div>
        )}

        <CoachApplication />
      </div>
    </AppShell>
  )
}
