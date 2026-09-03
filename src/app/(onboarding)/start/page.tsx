'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
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
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <Progress pct={10} />
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        Where are you applying now?
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
        So we know what you&apos;re comparing us against.
      </p>

      <div role="group" aria-label="Job portals you use">
        {PORTALS.map((p) => {
          const on = picked.includes(p)
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(p)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                font: 'inherit', fontSize: 'var(--type-body-lg-size)',
                padding: 'var(--space-md)', marginBottom: 'var(--space-sm)',
                borderRadius: 'var(--rounded-none)',
                border: `1px solid ${on ? 'var(--color-primary)' : 'var(--color-outline)'}`,
                background: on ? 'var(--color-surface-container-high)' : 'transparent',
                color: 'var(--color-on-surface)',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>

      {/* Optional context, not a gate — the CTA stays enabled with nothing picked. */}
      <Button
        style={{ marginTop: 'var(--space-md)' }}
        onClick={() => { writeDraft({ portals: picked }); router.push('/start/upload') }}
      >
        Continue
      </Button>
    </main>
  )
}
