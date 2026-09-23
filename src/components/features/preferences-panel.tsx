'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2, Plus, X } from 'lucide-react'
import { savePreferences } from '@/app/actions/workspace'
import { ScoreRing } from '@/components/ui/score-ring'
import type { Currency, Preferences, Seniority } from '@/lib/services/workspace'
import type { HealthItem } from '@/lib/profile-health'

/**
 * The preference matrix after onboarding: seniority, target cities and a pay
 * floor (migration 0028), beside the profile-health checklist. The rest of the
 * profile is edited in ProfileForm below it, which re-runs the scoring.
 */
const SENIORITY: { key: Seniority; label: string }[] = [
  { key: 'entry', label: 'Entry' }, { key: 'mid', label: 'Mid' }, { key: 'senior', label: 'Senior' },
  { key: 'lead', label: 'Staff / Lead' }, { key: 'executive', label: 'Executive' },
]

export function PreferencesPanel({ initial, health }: { initial: Preferences; health: { score: number; items: HealthItem[] } }) {
  const [seniority, setSeniority] = useState<Seniority | null>(initial.seniority)
  const [cities, setCities] = useState<string[]>(initial.targetCities)
  const [city, setCity] = useState('')
  const [currency, setCurrency] = useState<Currency>(initial.salaryCurrency)
  const [floor, setFloor] = useState(initial.salaryMin ? String(initial.salaryMin) : '')
  const [note, setNote] = useState<string>()
  const [pending, start] = useTransition()

  function save() {
    setNote(undefined)
    start(async () => {
      const n = Number(floor.replace(/[^0-9]/g, ''))
      const r = await savePreferences({
        seniority, targetCities: cities, salaryMin: floor.trim() && Number.isFinite(n) ? n : null, salaryCurrency: currency,
      }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      setNote(r.ok ? 'Saved.' : r.error)
    })
  }

  return (
    <section className="mb-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Preferences</p>
        {!initial.stored ? (
          <p className="mt-2 rounded-lg border border-score-mid/40 bg-score-mid/10 p-2.5 text-[11px] leading-4 text-primary">
            These three fields need a database update that has not been applied yet — they will not save until it is.
          </p>
        ) : null}

        <p className="mb-2 mt-4 text-xs font-semibold text-primary">Seniority</p>
        <div className="flex flex-wrap gap-2">
          {SENIORITY.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={seniority === key} onClick={() => setSeniority(seniority === key ? null : key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${seniority === key ? 'bg-brand-gradient border-transparent' : 'border-border bg-background text-muted-foreground hover:text-primary'}`}>
              {label}
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold text-primary">Other cities you would work in</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {cities.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-primary">
              {c}
              <button type="button" onClick={() => setCities((x) => x.filter((y) => y !== c))} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-primary"><X className="size-3" /></button>
            </span>
          ))}
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Add a city" aria-label="Add a city"
            onKeyDown={(e) => { if (e.key === 'Enter' && city.trim()) { e.preventDefault(); setCities((x) => [...new Set([...x, city.trim()])].slice(0, 6)); setCity('') } }}
            className="w-32 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-primary outline-none focus:border-accent" />
          <button type="button" aria-label="Add city" onClick={() => { if (city.trim()) { setCities((x) => [...new Set([...x, city.trim()])].slice(0, 6)); setCity('') } }}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary"><Plus className="size-3" /></button>
        </div>

        <p className="mb-2 mt-4 text-xs font-semibold text-primary">Pay floor (a year)</p>
        <div className="flex gap-2">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} aria-label="Currency"
            className="rounded-lg border border-input bg-background px-2 py-2 text-xs text-primary">
            {(['INR', 'USD', 'EUR'] as const).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={floor} onChange={(e) => setFloor(e.target.value)} inputMode="numeric" placeholder="e.g. 1500000" aria-label="Pay floor"
            className="w-44 rounded-lg border border-input bg-background px-3 py-2 text-xs text-primary outline-none focus:border-accent" />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={save} disabled={pending} className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-60">
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save preferences
          </button>
          {note ? <span role="status" className="text-xs text-muted-foreground">{note}</span> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col items-center">
          <ScoreRing score={health.score} size={88} stroke={8} label="health" />
          <p className="mt-2 text-xs font-semibold text-primary">Profile health</p>
        </div>
        <ul className="mt-4 space-y-1.5">
          {health.items.map((i) => (
            <li key={i.key} className={`flex items-center gap-2 text-[11px] ${i.done ? 'text-primary' : 'text-muted-foreground'}`} title={i.why}>
              {i.done ? <Check className="size-3 shrink-0 text-score-high" /> : <span className="size-3 shrink-0 rounded-full border border-border" />}
              <span className="flex-1">{i.label}</span>
              <span className="font-mono tabular-nums">+{i.weight}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
