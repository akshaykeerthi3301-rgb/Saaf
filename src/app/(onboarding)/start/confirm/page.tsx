'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/features/progress'
import { writeDraft } from '@/lib/onboarding-store'
import { useDraft } from '@/lib/use-draft'

const FUNCTIONS = ['engineering', 'finance', 'marketing', 'consulting', 'hr'] as const

/**
 * Screen 4 — confirm every parsed field. Gates are only as honest as the
 * profile they run against, so nothing is stored and nothing runs until this
 * screen is completed. Fields arrive pre-filled and marked with their
 * provenance, which turns typing into checking.
 */
export default function ConfirmPage() {
  const router = useRouter()
  const draft = useDraft()
  const fields = draft.fields ?? {}
  const warnings = draft.warnings ?? []

  const [edits, setEdits] = useState<Partial<Record<string, string>>>({})
  const [error, setError] = useState<string>()

  // Derived during render from the draft plus any edits — no effect, so no
  // cascading render on mount.
  const f = {
    currentTitle: edits.currentTitle ?? fields.currentTitle ?? '',
    employer: edits.employer ?? fields.employer ?? '',
    yearsExperience: edits.yearsExperience ?? fields.yearsExperience?.toString() ?? '',
    fn: (edits.fn ?? fields.fn ?? 'engineering') as (typeof FUNCTIONS)[number],
    city: edits.city ?? fields.city ?? '',
  }
  const setF = (patch: Partial<typeof f>) =>
    setEdits((e) => ({ ...e, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }))

  const fromResume: Record<string, boolean> = {
    currentTitle: !!fields.currentTitle, employer: !!fields.employer,
    yearsExperience: fields.yearsExperience !== undefined,
    fn: !!fields.fn, city: !!fields.city,
  }

  const prov = (k: string) => (fromResume[k] ? 'read from your résumé' : undefined)

  function next() {
    if (!f.currentTitle || !f.employer || !f.city || f.yearsExperience === '') {
      setError('We need this to run the experience gate.')
      return
    }
    writeDraft({ fields: { ...f, yearsExperience: Number(f.yearsExperience) } })
    router.push('/start/gate')
  }

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
      <Progress pct={60} />
      <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
        Confirm what we read from your résumé
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
        Nothing runs until you&apos;ve checked every field.
      </p>

      {warnings.length ? (
        <ul style={{ paddingLeft: 18, margin: '0 0 24px' }}>
          {warnings.map((w, i) => (
            <li key={i} style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)' }}>{w}</li>
          ))}
        </ul>
      ) : null}

      <Input label="Current title" provenance={prov('currentTitle')} value={f.currentTitle}
        onChange={(e) => setF({ ...f, currentTitle: e.target.value })} />
      <Input label="Employer" provenance={prov('employer')} value={f.employer}
        onChange={(e) => setF({ ...f, employer: e.target.value })} />
      <Input label="Years of experience" provenance={prov('yearsExperience')} type="number" min={0} max={50} step={0.5}
        value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} />
      <Input label="City" provenance={prov('city')} value={f.city}
        onChange={(e) => setF({ ...f, city: e.target.value })} />

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label htmlFor="fn" style={{
          display: 'block', fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
          letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-xs)',
        }}>
          Function{fromResume.fn ? <span style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400, marginLeft: 8 }}>read from your résumé</span> : null}
        </label>
        <select id="fn" value={f.fn}
          onChange={(e) => setF({ ...f, fn: e.target.value as (typeof FUNCTIONS)[number] })}
          style={{
            width: '100%', maxWidth: 420, height: 44, padding: '12px 14px',
            background: 'var(--color-surface)', color: 'var(--color-on-surface)',
            font: 'inherit', fontSize: 'var(--type-body-md-size)',
            border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-sm)',
          }}>
          {FUNCTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      {error ? <p style={{ color: 'var(--color-error)', fontSize: 'var(--type-body-sm-size)' }}>{error}</p> : null}
      <Button onClick={next}>Looks right</Button>
    </main>
  )
}
