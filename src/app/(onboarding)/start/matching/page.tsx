'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { readDraft, clearDraft } from '@/lib/onboarding-store'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { track } from '@/lib/analytics'

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
    })
      .then((res) => {
        if (!res.ok) { setError(res.error); return }
        track('profile_confirmed')
        clearDraft()
        const wait = Math.max(0, MIN_MS - (Date.now() - t0))
        setTimeout(() => router.push('/today'), wait)
      })
      .catch(() => setError('Something went wrong on our side. Your résumé is not lost — try again.'))

    return () => timers.forEach(clearTimeout)
  }, [router])

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
