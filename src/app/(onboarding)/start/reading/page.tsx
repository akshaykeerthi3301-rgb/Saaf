'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Progress } from '@/components/features/progress'
import { useDraft } from '@/lib/use-draft'

/**
 * Screen 3 — cover parse latency without manufacturing authority.
 *
 * The reference playbook prescribes rotating testimonials and a user count here.
 * This product has zero users and an identity that forbids claims it cannot show
 * its working for, so the lines report real parse telemetry instead.
 */
export default function ReadingPage() {
  const router = useRouter()
  const draft = useDraft()
  const [step, setStep] = useState(0)

  // Derived during render — the effect below only schedules the reveal.
  const fields = draft.fields ?? {}
  const warnings = draft.warnings ?? []
  const lines: string[] = useMemo(() => [
    fields.employer
      ? `Found ${fields.employer}${fields.currentTitle ? ` — ${fields.currentTitle}` : ''}.`
      : 'Read the document.',
    fields.fn
      ? `Matched your work to ${fields.fn}.`
      : 'Could not tell which function you work in — you can set it next.',
    'Your file is deleted. Only the parsed fields remain, and only in this browser.',
    ...(warnings.length ? [`${warnings.length} field${warnings.length === 1 ? '' : 's'} to check.`] : []),
  ], [fields.employer, fields.currentTitle, fields.fn, warnings.length])

  useEffect(() => {
    const timers = lines.map((_, i) => setTimeout(() => setStep(i + 1), 600 * (i + 1)))
    const done = setTimeout(() => router.push('/start/confirm'), 600 * lines.length + 700)
    return () => { timers.forEach(clearTimeout); clearTimeout(done) }
  }, [router, lines])

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <Progress pct={40} />
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 24px' }}>
        Reading your résumé
      </h1>
      <div aria-live="polite">
        {lines.slice(0, step).map((l, i) => (
          <p key={i} style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body-sm-size)',
            color: 'var(--color-on-surface-variant)', margin: '0 0 8px',
          }}>
            {l}
          </p>
        ))}
      </div>
    </main>
  )
}
