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
 * flow, is labelled "Step 3 of 5", and 3 of 5 is a fact. The sentence below
 * says "for the read itself" so the two can't be read as one.
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
    return [
      {
        title: 'Read your résumé',
        detail: found
          ? `Found ${found}${fields.city ? ` in ${fields.city}` : ''}.`
          : 'Pulled out what the document states.',
      },
      {
        title: 'Removed your direct identifiers',
        detail: 'Your email, phone number and profile links were stripped before any text left our server.',
      },
      {
        title: 'Deleted the file',
        detail: 'Only text was read, and it is already gone. Nothing is stored until you confirm it on the next screen.',
      },
      ...(warnings.length
        ? [{
            title: `${warnings.length} field${warnings.length === 1 ? '' : 's'} worth checking`,
            detail: 'We would rather you corrected them than have us guess.',
          }]
        : []),
    ]
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
        We&apos;re building your first shortlist, carefully.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We show our working, because a career match should be checkable. No invented
        progress bar for the read itself — just the steps we took with your file.
      </p>

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
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex gap-3 rounded-xl border border-border bg-secondary/60 p-4">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-5 text-muted-foreground">
          The file is deleted the moment parsing finishes, and only the fields you confirm
          on the next screen are ever stored.
        </p>
      </div>

      {slow && (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          This is taking longer than it should. If nothing happens shortly,{' '}
          <a href="/start/confirm" className="font-semibold text-primary underline underline-offset-4">
            go straight to your details
          </a>{' '}
          — nothing is lost.
        </p>
      )}
    </OnboardingShell>
  )
}
