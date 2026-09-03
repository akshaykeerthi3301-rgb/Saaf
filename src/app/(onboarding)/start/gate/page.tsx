'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
import { readDraft, clearDraft } from '@/lib/onboarding-store'
import { useDraft } from '@/lib/use-draft'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { track } from '@/lib/analytics'

type Fn = 'engineering' | 'finance' | 'marketing' | 'consulting' | 'hr'

/**
 * Screen 5 — the function-typed gate, and the user's first sight of the engine.
 *
 * The question changes with the function because the disqualifier does. Finance
 * gates on a credential; engineering on an experience band. A years-only gate
 * applied to everyone is the bug this product exists to fix, so the branch is
 * shown rather than hidden.
 */
const QUESTIONS: Record<Fn, { q: string; note: string; options: string[] }> = {
  finance: {
    q: 'Which credential do you hold?',
    note: 'Finance gates on a credential, not on years. We check the one that actually applies to you.',
    options: ['CA', 'CFA', 'CS', 'None of these'],
  },
  engineering: {
    q: 'Confirm your experience band',
    note: 'Engineering gates on an experience band. A role asking for more than you have is withheld, with the number stated.',
    options: ['That looks right'],
  },
  marketing: {
    q: 'Confirm your experience band',
    note: 'Marketing usually gates on channel ownership and budget scale rather than years. That gate is not live yet, so only location and stated seniority apply to you for now — we will say so on your list.',
    options: ['Understood'],
  },
  consulting: {
    q: 'Confirm your experience band',
    note: 'Consulting often gates on institute tier. That gate is not live yet, so only location and stated seniority apply to you for now — we will say so on your list.',
    options: ['Understood'],
  },
  hr: {
    q: 'Confirm your experience band',
    note: 'HR often gates on a recruitment-versus-generalist split. That gate is not live yet, so only location and stated seniority apply to you for now — we will say so on your list.',
    options: ['Understood'],
  },
}

export default function GatePage() {
  const router = useRouter()
  const draft = useDraft()
  const fn = (draft.fields?.fn as Fn) ?? 'engineering'
  const [choice, setChoice] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const spec = QUESTIONS[fn]

  async function finish() {
    const d = readDraft()
    const f = d.fields ?? {}
    setBusy(true); setError(undefined)
    const res = await confirmProfile({
      currentTitle: f.currentTitle ?? '',
      employer: f.employer ?? '',
      yearsExperience: f.yearsExperience ?? 0,
      fn,
      city: f.city ?? '',
      credential: (choice && ['CA', 'CFA', 'CS'].includes(choice) ? choice : 'none') as 'CA' | 'CFA' | 'CS' | 'none',
      portals: d.portals,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    track('profile_confirmed', { fn })
    clearDraft()
    router.push('/today')
  }

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <Progress pct={80} />
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 16px' }}>
        {spec.q}
      </h1>

      <div role="group" aria-label={spec.q}>
        {spec.options.map((o) => {
          const on = choice === o
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => setChoice(o)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                font: 'inherit', fontSize: 'var(--type-body-lg-size)',
                padding: 'var(--space-md)', marginBottom: 'var(--space-sm)',
                borderRadius: 'var(--rounded-none)',
                border: `1px solid ${on ? 'var(--color-primary)' : 'var(--color-outline)'}`,
                background: on ? 'var(--color-surface-container-high)' : 'transparent',
                color: 'var(--color-on-surface)',
              }}>
              {o}
            </button>
          )
        })}
      </div>

      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)' }}>
        {spec.note}
      </p>

      {error ? <p style={{ color: 'var(--color-error)', fontSize: 'var(--type-body-sm-size)' }}>{error}</p> : null}
      <Button onClick={finish} disabled={busy || !choice}>
        {busy ? 'Running your first match…' : 'Confirm and run my first match'}
      </Button>
    </main>
  )
}
