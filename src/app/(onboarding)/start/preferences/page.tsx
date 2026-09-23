'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, Globe, Laptop, MapPin, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingShell } from '@/components/features/onboarding-shell'
import { ExtraRolesField } from '@/components/features/extra-roles-field'
import { ScoreRing } from '@/components/ui/score-ring'
import { writeDraft, type OnboardingPrefs } from '@/lib/onboarding-store'
import { useDraft } from '@/lib/use-draft'
import { CITIES } from '@/lib/taxonomy/locations'
import { profileHealth, seniorityFromYears } from '@/lib/profile-health'

/**
 * Step 5 — the target preference matrix.
 *
 * Every control starts from what was READ: the role and city confirmed on the
 * previous step, seniority guessed from the confirmed years. The profile-health
 * meter re-computes on every change, so the candidate watches the baseline
 * move as they fill it in.
 *
 * WHAT EACH ONE DOES, stated because a preference that silently does nothing
 * is a small lie: extra roles widen what is scored and work mode is a score
 * component — both re-run the match on confirm. Target cities, seniority and
 * pay are stored (migration 0028) and shown on /profile; the scorer does not
 * read them. Pay never filters or scores — 2.2% of postings state it
 * (PROJECT-STATE Stage T).
 */

const SENIORITY: { key: NonNullable<OnboardingPrefs['seniority']>; label: string }[] = [
  { key: 'entry', label: 'Entry' },
  { key: 'mid', label: 'Mid' },
  { key: 'senior', label: 'Senior' },
  { key: 'lead', label: 'Staff / Lead' },
  { key: 'executive', label: 'Executive' },
]

const MODES: { key: OnboardingPrefs['workMode']; label: string; icon: typeof Globe }[] = [
  { key: 'remote', label: 'Remote', icon: Globe },
  { key: 'hybrid', label: 'Hybrid', icon: Laptop },
  { key: 'onsite', label: 'On-site', icon: Building2 },
  { key: 'no_preference', label: 'Any', icon: Check },
]

/** Slider ranges per currency, in the unit people think in. */
const PAY = {
  INR: { max: 80, step: 1, unit: 100_000, fmt: (v: number) => `₹${v} LPA` },
  USD: { max: 400, step: 5, unit: 1_000, fmt: (v: number) => `$${v}k` },
  EUR: { max: 300, step: 5, unit: 1_000, fmt: (v: number) => `€${v}k` },
} as const

export default function PreferencesPage() {
  const router = useRouter()
  const draft = useDraft()
  const fields = useMemo(() => draft.fields ?? {}, [draft.fields])
  const saved = draft.prefs

  const [extraRoles, setExtraRoles] = useState<string[]>(saved?.extraRoles ?? [])
  const [workMode, setWorkMode] = useState<OnboardingPrefs['workMode']>(saved?.workMode ?? 'no_preference')
  const [cities, setCities] = useState<string[]>(saved?.targetCities ?? [])
  const [cityInput, setCityInput] = useState('')
  const [currency, setCurrency] = useState<OnboardingPrefs['salaryCurrency']>(saved?.salaryCurrency ?? 'INR')
  const range = PAY[currency]
  const [lo, setLo] = useState(saved?.salaryMin ? Math.round(saved.salaryMin / PAY[saved.salaryCurrency].unit) : 0)
  const [hi, setHi] = useState(saved?.salaryMax ? Math.round(saved.salaryMax / PAY[saved.salaryCurrency].unit) : Math.round(range.max * 0.5))
  // Derived, not initialised: the draft lives in sessionStorage and arrives
  // after hydration, so a useState initialiser would read it as empty and the
  // years-based suggestion would never appear. Same pattern as /start/confirm.
  const [seniorityEdit, setSeniority] = useState<OnboardingPrefs['seniority'] | undefined>()
  const seniority = seniorityEdit !== undefined
    ? seniorityEdit
    : saved?.seniority ?? seniorityFromYears(fields.yearsExperience ?? null)

  const health = useMemo(
    () =>
      profileHealth({
        currentTitle: fields.currentTitle,
        employer: fields.employer,
        yearsExperience: fields.yearsExperience ?? null,
        city: fields.city,
        preferredRole: fields.preferredRole,
        extraRoles,
        skills: fields.skills,
        workMode,
        seniority,
        salaryMin: lo > 0 ? lo * range.unit : null,
      }),
    [fields, extraRoles, workMode, seniority, lo, range.unit],
  )

  const addCity = (raw: string) => {
    const v = raw.trim()
    if (!v || v.toLowerCase() === fields.city?.toLowerCase() || cities.some((c) => c.toLowerCase() === v.toLowerCase()) || cities.length >= 6) return
    setCities((c) => [...c, v])
    setCityInput('')
  }

  const switchCurrency = (c: OnboardingPrefs['salaryCurrency']) => {
    setCurrency(c)
    setLo(0)
    setHi(Math.round(PAY[c].max * 0.5))
  }

  function next() {
    writeDraft({
      prefs: {
        extraRoles,
        workMode,
        targetCities: cities,
        salaryMin: lo > 0 ? lo * range.unit : null,
        salaryMax: hi > 0 ? hi * range.unit : null,
        salaryCurrency: currency,
        seniority,
      },
    })
    router.push('/start/matching')
  }

  const pct = (v: number) => (v / range.max) * 100

  return (
    <OnboardingShell step={5}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
            What are you aiming for?
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Everything here is optional and editable later.</p>
        </div>
        <div className="flex flex-col items-center" aria-live="polite">
          <ScoreRing score={health.score} size={72} label="health" />
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Profile</span>
        </div>
      </div>

      {/* 1 — titles */}
      <Section title="Target job titles">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {fields.preferredRole ? (
            <span className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold">
              <Check className="size-3" /> {fields.preferredRole}
            </span>
          ) : null}
        </div>
        <ExtraRolesField roles={extraRoles} onChange={setExtraRoles} />
      </Section>

      {/* 2 — location matrix */}
      <Section title="Where you'll work">
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Work mode">
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={workMode === key}
              onClick={() => setWorkMode(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                workMode === key ? 'bg-brand-gradient border-transparent' : 'border-border bg-background text-muted-foreground hover:border-accent/60 hover:text-primary'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Reorders your list toward this — it never hides a role.</p>

        <p className="mb-2 mt-5 text-xs font-semibold text-primary">Target cities</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {fields.city ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent">
              <MapPin className="size-3" /> {fields.city}
            </span>
          ) : null}
          {cities.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-primary">
              {c}
              <button type="button" onClick={() => setCities((x) => x.filter((y) => y !== c))} aria-label={`Remove ${c}`} className="text-muted-foreground hover:text-primary">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <input
              list="saaf-cities"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCity(cityInput) } }}
              placeholder="Add a city"
              aria-label="Add a target city"
              className="w-36 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-primary outline-none focus:border-accent"
            />
            <button type="button" onClick={() => addCity(cityInput)} aria-label="Add city" className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-primary">
              <Plus className="size-3" />
            </button>
          </span>
          <datalist id="saaf-cities">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
        </div>
      </Section>

      {/* 3 — compensation */}
      <Section title="Compensation">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-sm font-semibold tabular-nums text-primary">
            {range.fmt(lo)} – {range.fmt(hi)}{hi >= range.max ? '+' : ''}
          </p>
          <div className="flex gap-1 rounded-lg border border-border bg-background p-0.5" role="radiogroup" aria-label="Currency">
            {(Object.keys(PAY) as OnboardingPrefs['salaryCurrency'][]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={currency === c}
                onClick={() => switchCurrency(c)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${currency === c ? 'bg-brand-gradient' : 'text-muted-foreground hover:text-primary'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="relative mt-5 h-5">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-secondary" />
          <div
            className="bg-brand-gradient absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
            style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
          />
          <input
            type="range" min={0} max={range.max} step={range.step} value={lo}
            onChange={(e) => setLo(Math.min(Number(e.target.value), hi - range.step))}
            aria-label="Minimum salary"
            className="range-dual"
          />
          <input
            type="range" min={0} max={range.max} step={range.step} value={hi}
            onChange={(e) => setHi(Math.max(Number(e.target.value), lo + range.step))}
            aria-label="Maximum salary"
            className="range-dual"
          />
        </div>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          Your minimum is kept for your tracker and offer notes. Only about 2% of postings state pay, so it
          never hides or scores a role.
        </p>
      </Section>

      {/* 4 — seniority */}
      <Section title="Seniority level">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Seniority">
          {SENIORITY.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={seniority === key}
              onClick={() => setSeniority(key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                seniority === key ? 'bg-brand-gradient border-transparent' : 'border-border bg-background text-muted-foreground hover:border-accent/60 hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {fields.yearsExperience !== undefined ? (
          <p className="mt-2 text-[11px] text-muted-foreground">Suggested from your {fields.yearsExperience} years — change it if it is wrong.</p>
        ) : null}
      </Section>

      <div className="mt-10 border-t border-border pt-6">
        <Button className="w-full" onClick={next}>Build my shortlist</Button>
      </div>
    </OnboardingShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{title}</h2>
      {children}
    </section>
  )
}
