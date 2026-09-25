'use client'

import { useState, useTransition } from 'react'
import { submitCoachApplication } from '@/app/actions/coaching'

/** "Become a coach": the founder reviews applications in the database before anyone is listed. */
export function CoachApplication() {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [note, setNote] = useState<string>()
  const [f, setF] = useState({ name: '', headline: '', experience: '', bookingUrl: '' })
  const input = 'w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-primary outline-none focus:border-accent'
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-primary">Hire, recruit or coach? Get listed</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">Tell us about your hiring experience. We check every application before listing anyone.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs font-semibold text-accent">Apply to be a coach →</button>
      ) : (
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            start(async () => {
              const r = await submitCoachApplication(f).catch(() => ({ ok: false as const, error: 'Check your connection.' }))
              setNote(r.ok ? 'Thanks — we will review it and get in touch.' : r.error)
              if (r.ok) setOpen(false)
            })
          }}
        >
          <input className={input} placeholder="Your name" aria-label="Your name" value={f.name} onChange={set('name')} maxLength={120} />
          <input className={input} placeholder="One line — e.g. “Recruiter, 8 years hiring product managers”" aria-label="Headline" value={f.headline} onChange={set('headline')} maxLength={200} />
          <textarea className={input} rows={4} placeholder="Your hiring and coaching experience" aria-label="Experience" value={f.experience} onChange={set('experience')} maxLength={2000} />
          <input className={input} placeholder="Your booking page (Calendly, Cal.com…) — optional" aria-label="Booking link" value={f.bookingUrl} onChange={set('bookingUrl')} maxLength={500} />
          <button type="submit" disabled={pending} className="bg-brand-gradient rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50">Send application</button>
        </form>
      )}
      {note ? <p role="status" className="mt-2 text-xs text-primary">{note}</p> : null}
    </section>
  )
}
