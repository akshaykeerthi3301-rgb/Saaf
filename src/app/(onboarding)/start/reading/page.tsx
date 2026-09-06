'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { OnboardingShell } from '@/components/features/onboarding-shell'
import { useDraft } from '@/lib/use-draft'

/**
 * Screen 3 — cover parse latency without manufacturing authority.
 *
 * The reference playbook prescribes rotating testimonials and a user count
 * here. This product has zero users and an identity that forbids claims it
 * cannot show its working for, so every line below is a fact about the file
 * that was just read.
 *
 * NO PROGRESS PERCENTAGE FOR THE READ, DELIBERATELY. We do not know one. A bar
 * that fills at a rate unrelated to the work is the smallest possible version of
 * the thing this product exists to argue against, and it would sit two screens
 * away from a privacy promise we do keep.
 *
 * The shell's bar is a different claim and stays: it measures the five-step
 * flow, is labelled "Step 3 of 5", and 3 of 5 is a fact.
 *
 * The paragraph that used to explain all of this on screen is gone. The steps
 * below are the argument; a paragraph asserting that we show our working, sat
 * above a list showing the working, was the assertion doing no work.
 *
 * SCOPE OF THE CLAIMS. The parse has already finished by the time this renders
 * — it runs in the server action on the upload screen. So the steps here are
 * about the file: what was read, what was stripped, what was deleted. Scoring
 * and bucketing happen later, inside confirmProfile, and are not claimed here.
 * A loading state for that wait belongs on the confirm screen, where the work
 * actually is.
 */

const REVEAL_MS = 550

export default function ReadingPage() {
  const router = useRouter()
  const draft = useDraft()
  const [step, setStep] = useState(0)
  const [slow, setSlow] = useState(false)

  const fields = draft.fields ?? {}
  const warnings = draft.warnings ?? []

  const steps = useMemo(() => {
    const found = [fields.currentTitle, fields.employer].filter(Boolean).join(' at ')
    // A title, and at most the one fact the title cannot carry on its own.
    // "Removed your identifiers" has to name which ones; "Deleted the file"
    // does not need a sentence explaining what deletion is.
    return [
      {
        title: 'Read your résumé',
        detail: found ? `${found}${fields.city ? ` · ${fields.city}` : ''}` : undefined,
      },
      {
        title: 'Removed your identifiers',
        detail: 'Email, phone, profile links.',
      },
      { title: 'Deleted the file' },
      ...(warnings.length
        ? [{ title: `${warnings.length} field${warnings.length === 1 ? '' : 's'} worth checking` }]
        : []),
    ] as { title: string; detail?: string }[]
  }, [fields.currentTitle, fields.employer, fields.city, warnings.length])

  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStep(i + 1), REVEAL_MS * (i + 1)))
    const done = setTimeout(() => router.push('/start/confirm'), REVEAL_MS * steps.length + 800)
    // If something has gone wrong we say so rather than spinning silently.
    const slowTimer = setTimeout(() => setSlow(true), 8000)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(done)
      clearTimeout(slowTimer)
    }
  }, [router, steps])

  return (
    <OnboardingShell step={3}>
      <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
        Reading your résumé.
      </h1>

      <ol className="mt-8 space-y-5" aria-live="polite">
        {steps.map((s, i) => {
          const done = i < step
          const current = i === step
          if (!done && !current) return null
          return (
            <li key={s.title} className="flex gap-4">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                  done
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : (
                  <Loader2 className="size-3.5 animate-spin" />
                )}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
                  {s.title}
                  {current && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                      now
                    </span>
                  )}
                </p>
                {s.detail ? (
                  <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-secondary/60 p-4 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" />
        Only the fields you confirm are stored.
      </p>

      {slow && (
        <p className="mt-4 text-xs text-muted-foreground">
          Taking longer than it should.{' '}
          <a href="/start/confirm" className="font-semibold text-primary underline underline-offset-4">
            Skip ahead
          </a>{' '}
          — nothing is lost.
        </p>
      )}
    </OnboardingShell>
  )
}
