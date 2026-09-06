'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingShell } from '@/components/features/onboarding-shell'
import { writeDraft } from '@/lib/onboarding-store'
import { initAnalytics, track } from '@/lib/analytics'

const PORTALS = ['Naukri', 'LinkedIn', 'Instahyre', 'Cutshort', 'Referrals only']

/**
 * Screen 1 — open with a question, not a logo.
 *
 * Naming the incumbent establishes the comparison this product wins on: the
 * deal-killing objection is "Naukri already says it matches me."
 */
export default function StartPage() {
  const router = useRouter()
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => { initAnalytics(); track('onboarding_started') }, [])

  const toggle = (p: string) =>
    setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))

  return (
    <OnboardingShell step={1}>
      <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
        Where are you applying now?
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        So we know what you&apos;re comparing us against. Pick any number, or none.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label="Job portals you use">
        {PORTALS.map((p) => {
          const on = picked.includes(p)
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                on
                  ? 'border-accent bg-accent/5 text-primary'
                  : 'border-input text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {p}
              {on ? <Check className="size-4 shrink-0 text-accent" /> : null}
            </button>
          )
        })}
      </div>

      {/* Optional context, not a gate — the CTA stays enabled with nothing picked. */}
      <div className="mt-10 border-t border-border pt-6">
        <Button
          className="w-full"
          onClick={() => { writeDraft({ portals: picked }); router.push('/start/upload') }}
        >
          Continue
        </Button>
      </div>
    </OnboardingShell>
  )
}
