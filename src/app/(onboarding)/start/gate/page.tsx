'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
import { readDraft, clearDraft } from '@/lib/onboarding-store'
import { useDraft } from '@/lib/use-draft'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { track } from '@/lib/analytics'
import { QUESTIONS, ASSESSMENT_ONLY_FUNCTIONS, type Fn } from '@/lib/gate-questions'

/**
 * Screen 5 — the function-typed gate, and the user's first sight of the engine.
 *
 * The question changes with the function because the disqualifier does. Finance
 * gates on a credential; engineering on an experience band. A years-only gate
 * applied to everyone is the bug this product exists to fix, so the branch is
 * shown rather than hidden.
 *
 * The question set itself lives in src/lib/gate-questions.ts, shared with the
 * profile edit form — the same answer needs to be editable after onboarding.
 */
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
      // Stored, not gated on — see confirm-profile.ts for which column this
      // lands in per function.
      assessmentAnswer: ASSESSMENT_ONLY_FUNCTIONS.includes(fn) ? choice : undefined,
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
