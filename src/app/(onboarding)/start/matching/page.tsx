'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, CircleDashed, Loader2 } from 'lucide-react'
import { readDraft, clearDraft } from '@/lib/onboarding-store'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { getMatchSummary, savePreferences } from '@/app/actions/workspace'
import { track } from '@/lib/analytics'
import { profileHealth, type HealthItem } from '@/lib/profile-health'
import { ScoreRing } from '@/components/ui/score-ring'

/**
 * The last screen before the shortlist.
 *
 * ⚠️ IT IS NOT A DECORATIVE DELAY. confirmProfile() writes the profile and then
 * runs evaluateUser(), which scores the candidate against up to 500 roles and
 * writes their gate_results — real work, taking a real second or two, which
 * previously happened behind a frozen button on the credential screen while
 * nothing on screen said anything was happening.
 *
 * So this covers actual work. That distinction is the whole reason it is
 * allowed to exist here: the résumé-reading screen deliberately refuses to show
 * a progress percentage because we do not know one, and a spinner invented to
 * make a product feel busy is the same lie with better manners. Every line
 * below is a statement about something that is genuinely being done.
 *
 * MIN_MS exists for the opposite reason — on a fast connection the work can
 * finish in 300ms, and a screen that flashes past is worse than no screen. It
 * is a floor on how long a completed step is *shown*, never a delay added to
 * the work itself: if scoring takes longer, this waits for scoring.
 */
const MIN_MS = 1600
const STEP_MS = 520

const STEPS = [
  { title: 'Saved your profile', detail: 'Only the fields you confirmed.' },
  { title: 'Reading the live index', detail: undefined },
  { title: 'Scoring every match', detail: 'Experience, location, title and skills — each scored separately.' },
  { title: 'Ranking your shortlist', detail: undefined },
]

export default function MatchingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string>()
  const [indexed, setIndexed] = useState<number>()
  /**
   * The baseline splash, shown once scoring is done rather than redirecting
   * straight to /today: the profile's health (a visible checklist, see
   * src/lib/profile-health.ts) and how many roles were actually scored.
   */
  const [summary, setSummary] = useState<{ score: number; items: HealthItem[]; matched: number; strong: number }>()
  const started = useRef(false)

  useEffect(() => {
    // React 18 mounts effects twice in development. Confirming a profile twice
    // is not harmful — the upsert is idempotent — but it doubles the scoring
    // work on the slowest screen in the flow.
    if (started.current) return
    started.current = true

    const t0 = Date.now()
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)))

    // The real size of the index, so "Reading the live index" carries a fact
    // rather than a mood. Failure is silent: the line simply stays unadorned.
    fetch('/api/audit/today')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (typeof d?.rolesIndexed === 'number') setIndexed(d.rolesIndexed) })
      .catch(() => {})

    const d = readDraft()
    const f = d.fields ?? {}
    const p = d.prefs
    const pay = p?.salaryMin
      ? `${p.salaryCurrency} ${p.salaryMin.toLocaleString('en-IN')}${p.salaryMax ? `–${p.salaryMax.toLocaleString('en-IN')}` : '+'} a year`
      : undefined
    const health = profileHealth({
      currentTitle: f.currentTitle, employer: f.employer, yearsExperience: f.yearsExperience ?? null,
      city: f.city, preferredRole: f.preferredRole, extraRoles: p?.extraRoles, skills: f.skills,
      workMode: p?.workMode, seniority: p?.seniority, salaryMin: p?.salaryMin,
    })
    confirmProfile({
      currentTitle: f.currentTitle ?? '',
      employer: f.employer ?? '',
      yearsExperience: f.yearsExperience ?? 0,
      preferredRole: f.preferredRole ?? '',
      openToAdjacent: f.openToAdjacent ?? false,
      skills: f.skills ?? [],
      domain: f.domain,
      city: f.city ?? '',
      // The credential question is no longer asked during onboarding: it gated
      // every candidate on a requirement 3.6% of the index states, and it is
      // still editable on /profile for the finance roles that do state one.
      credential: 'none',
      portals: d.portals,
      // The preference matrix. Extra roles, work mode and the pay line are
      // existing columns and save here; the rest follows in savePreferences.
      ...(p?.extraRoles.length ? { preferredRoles: [f.preferredRole ?? '', ...p.extraRoles].filter(Boolean) } : {}),
      ...(p ? { workModePreference: p.workMode } : {}),
      ...(pay ? { salaryExpectation: pay } : {}),
    })
      .then((res) => {
        if (!res.ok) { setError(res.error); return }
        track('profile_confirmed')
        // Seniority, target cities and the pay floor need migration 0028. A
        // refusal is not an onboarding failure — they are shown as not saved on
        // /profile, and the shortlist does not depend on them.
        const prefs = p
          ? savePreferences({
              seniority: p.seniority, targetCities: p.targetCities,
              salaryMin: p.salaryMin, salaryCurrency: p.salaryCurrency,
            }).catch(() => null)
          : Promise.resolve(null)
        Promise.all([getMatchSummary().catch(() => null), prefs]).then(([m]) => {
          clearDraft()
          const wait = Math.max(0, MIN_MS - (Date.now() - t0))
          setTimeout(() => {
            if (m?.ok) setSummary({ ...health, matched: m.matched, strong: m.strong })
            else router.push('/today')
          }, wait)
        })
      })
      .catch(() => setError('Something went wrong on our side. Your résumé is not lost — try again.'))

    return () => timers.forEach(clearTimeout)
  }, [router])

  if (summary) {
    const missing = summary.items.filter((i) => !i.done)
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 glow-selected">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your baseline</p>
          <h1 className="mt-3 text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
            You&apos;re set up.
          </h1>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center rounded-2xl border border-border bg-background p-5">
              <ScoreRing score={summary.score} size={104} stroke={9} label="health" />
              <p className="mt-3 text-xs font-semibold text-primary">Profile health</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-background p-5 text-center">
              <p className="text-brand-gradient font-mono text-5xl font-semibold tabular-nums tracking-[-0.05em]">
                {summary.matched.toLocaleString('en-IN')}
              </p>
              <p className="mt-2 text-xs font-semibold text-primary">roles matched</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{summary.strong.toLocaleString('en-IN')} high-precision</p>
            </div>
          </div>
          {missing.length ? (
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Raise your health — on your profile</p>
              <ul className="mt-2 space-y-1.5">
                {missing.slice(0, 4).map((i) => (
                  <li key={i.key} className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    <span><span className="font-semibold text-primary">{i.label}</span> (+{i.weight}) — {i.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.matched === 0 ? (
            <p className="mt-6 rounded-xl border border-border bg-secondary/50 p-3 text-xs leading-5 text-muted-foreground">
              Nothing scored yet — that is our coverage for this role, not a verdict on you. Your feed fills as the
              nightly index runs; adding a second role widens it today.
            </p>
          ) : null}
          <Link
            href="/today"
            className="bg-brand-gradient mt-8 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Open my job feed <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-card px-6 py-16">
      <div className="w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Almost there</p>
        <h1 className="mt-3 text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
          Building your shortlist.
        </h1>

        <ol className="mt-9 space-y-5" aria-live="polite">
          {STEPS.map((s, i) => {
            const done = i < step
            const current = i === step
            if (!done && !current) return null
            const detail =
              i === 1 && indexed
                ? `${indexed.toLocaleString('en-IN')} live India roles from company career pages.`
                : s.detail
            return (
              <li key={s.title} className="flex gap-4">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    done
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border bg-secondary text-muted-foreground'
                  }`}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : <Loader2 className="size-3.5 animate-spin" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">{s.title}</p>
                  {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>

        {/* A failure here must never read as a verdict, and must never look like
            an empty shortlist. It is our problem, said plainly, with a way out. */}
        {error ? (
          <div className="mt-8 rounded-xl border border-border bg-secondary/60 p-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => { started.current = false; setError(undefined); setStep(0); router.refresh() }}
              className="mt-3 text-sm font-semibold text-primary underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </main>
  )
}
