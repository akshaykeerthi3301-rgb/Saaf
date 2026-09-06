'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingShell } from '@/components/features/onboarding-shell'
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
    <OnboardingShell step={5}>
      <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
        {spec.q}
      </h1>

      <div className="mt-8 grid gap-3" role="group" aria-label={spec.q}>
        {spec.options.map((o) => {
          const on = choice === o
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => setChoice(o)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                on
                  ? 'border-accent bg-accent/5 text-primary'
                  : 'border-input text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {o}
              {on ? <Check className="size-4 shrink-0 text-accent" /> : null}
            </button>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">{spec.note}</p>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-10 border-t border-border pt-6">
        <Button className="w-full" onClick={finish} disabled={busy || !choice}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running your first match…
            </>
          ) : (
            'Confirm and run my first match'
          )}
        </Button>
      </div>
    </OnboardingShell>
  )
}
