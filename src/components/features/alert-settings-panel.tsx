'use client'

import { useId, useState } from 'react'
import { saveAlertSettings } from '@/app/actions/alert-settings'
import { ALERT_EMAIL_LIVE, describeAlerts, FREQUENCIES, MAX_JOBS, MIN_SCORES, WEEKDAYS, type AlertSettings } from '@/lib/alert-settings'

/**
 * Email alerts — how often, how good, how many (F-122). It has its own Save: these
 * settings move no score, so they must not re-run the matches the profile Save does.
 * It says plainly that saving them does not make email arrive until Saaf's sending
 * address is verified (ALERT_EMAIL_LIVE) — a setting that looks live and is not
 * would be the product claiming something it cannot do.
 */
export function AlertSettingsPanel({ initial, stored }: { initial: AlertSettings; stored: boolean }) {
  const id = useId()
  const [s, setS] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  const field = 'w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'

  async function save() {
    setBusy(true); setNote(undefined)
    const r = await saveAlertSettings(s).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setBusy(false)
    setNote(r.ok ? 'Saved.' : r.error)
  }

  return (
    <div className="mt-8 border-t border-border pt-6" data-testid="alert-settings">
      <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Email alerts</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{describeAlerts(s)}</p>
      {!ALERT_EMAIL_LIVE ? (
        <p role="note" className="mt-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Alert emails are not being delivered yet — Saaf’s sending address is not verified, so nothing can reach your inbox today.
          Your choices are saved and will apply the day sending is switched on.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-f`}>
          How often
          <select id={`${id}-f`} className={`${field} mt-1`} value={s.frequency} onChange={(e) => setS({ ...s, frequency: e.target.value as AlertSettings['frequency'] })}>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f === 'daily' ? 'Every day' : f === 'weekly' ? 'Once a week' : 'Never'}</option>)}
          </select>
        </label>
        {s.frequency === 'weekly' ? (
          <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-d`}>
            On
            <select id={`${id}-d`} className={`${field} mt-1`} value={s.weekday} onChange={(e) => setS({ ...s, weekday: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
        ) : null}
        <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-m`}>
          Only roles scoring
          <select id={`${id}-m`} className={`${field} mt-1`} value={s.minScore} onChange={(e) => setS({ ...s, minScore: Number(e.target.value) })}>
            {MIN_SCORES.map((m) => <option key={m} value={m}>{m === 0 ? 'Any score' : `${m} or above`}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-primary" htmlFor={`${id}-j`}>
          Roles per email
          <select id={`${id}-j`} className={`${field} mt-1`} value={s.maxJobs} onChange={(e) => setS({ ...s, maxJobs: Number(e.target.value) })}>
            {MAX_JOBS.map((n) => <option key={n} value={n}>Up to {n}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || !stored} className="bg-brand-gradient rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? 'Saving…' : 'Save alert settings'}
        </button>
        {!stored ? <span className="text-xs text-muted-foreground">Saving these needs a database update (0042) that has not been applied yet.</span> : null}
        {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  )
}
