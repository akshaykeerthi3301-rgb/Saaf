'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/features/progress'
import { readDraft, clearDraft } from '@/lib/onboarding-store'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { track } from '@/lib/analytics'
import { CREDENTIAL_QUESTION } from '@/lib/gate-questions'

/**
 * Screen 5 — the credential question, and the user's first sight of the engine.
 *
 * Previously branched per candidate function (see git history / gate-questions.ts's
 * own comment for why that's gone). Now a single, unconditional question — matching
 * is handled by the preferred-role text confirmed on the previous screen, not by
 * this question.
 */
export default function GatePage() {
  const router = useRouter()
  const [choice, setChoice] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const spec = CREDENTIAL_QUESTION

  async function finish() {
    const d = readDraft()
    const f = d.fields ?? {}
    setBusy(true); setError(undefined)
    const res = await confirmProfile({
      currentTitle: f.currentTitle ?? '',
      employer: f.employer ?? '',
      yearsExperience: f.yearsExperience ?? 0,
      preferredRole: f.preferredRole ?? '',
      openToAdjacent: f.openToAdjacent ?? false,
      skills: f.skills ?? [],
      domain: f.domain,
      city: f.city ?? '',
      credential: (choice && ['CA', 'CFA', 'CS'].includes(choice) ? choice : 'none') as 'CA' | 'CFA' | 'CS' | 'none',
      portals: d.portals,
    })
    setBusy(false)
    if (!res.ok) { setError(res.error); return }
    track('profile_confirmed')
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
