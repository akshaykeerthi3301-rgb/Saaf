import { redirect } from 'next/navigation'
import { ArrowUpRight, CalendarPlus, GraduationCap, Video } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { listCoaches, listOfficeHours } from '@/lib/services/coaching'
import { icsFor, whenIst } from '@/lib/office-hours'
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
  const [{ coaches, stored }, hours] = await Promise.all([listCoaches(), listOfficeHours()])
  const initials = (user.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <AppShell title="Coaching" eyebrow="People who hire, on your side" initials={initials}>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <p className="text-sm leading-6 text-muted-foreground">
          One-to-one help with your résumé, interviews and negotiation, from people who have hired. You book and pay the coach directly on their own page — Jobinko takes nothing and sees nothing of the session.
        </p>

        {/* FREE LIVE SESSIONS (F-1006, TASK-196): written by the founder, hosted on the host's own link. Jobinko
            offers a calendar file and nothing else — no booking, no recording, no payment. */}
        <section aria-label="Office hours" className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Office hours</h2>
          {hours.sessions.length ? (
            <ul className="mt-3 space-y-3">
              {hours.sessions.map((s) => {
                const ics = icsFor(s)
                return (
                  <li key={s.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <p className="text-base font-semibold text-primary">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{whenIst(s.startsAt)} · {s.durationMin} min · with {s.hostName}</p>
                    {s.description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.description}</p> : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <a href={s.joinUrl} target="_blank" rel="noopener noreferrer" className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"><Video className="size-3.5" aria-hidden="true" /> Join <ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
                      {ics ? <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`} download={`saaf-office-hours-${s.id.slice(0, 8)}.ics`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"><CalendarPlus className="size-3.5" aria-hidden="true" /> Add to calendar</a> : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No sessions are scheduled right now. Free live sessions are added here when they are booked — nothing is listed that is not on a calendar.
              {!hours.stored ? ' (This needs a database update, 0049, that has not been applied yet.)' : ''}
            </p>
          )}
        </section>

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
