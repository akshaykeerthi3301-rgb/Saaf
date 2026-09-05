'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleInput } from '@/components/features/role-input'
import { Progress } from '@/components/features/progress'
import { writeDraft } from '@/lib/onboarding-store'
import { useDraft } from '@/lib/use-draft'

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
    // Not parsed — there is no reliable way to guess a candidate's target role
    // from their résumé text (that guess is exactly what used to misroute
    // candidates). Suggested from their current title instead, and always
    // editable, since "what you do now" and "what you want next" often differ.
    preferredRole: edits.preferredRole ?? fields.currentTitle ?? '',
    city: edits.city ?? fields.city ?? '',
    // Strict is the default: a product manager is not shown a credit analyst
    // role unless they say they want adjacent ones. See migration 0012.
    openToAdjacent: edits.openToAdjacent ?? (fields.openToAdjacent ? 'yes' : 'no'),
  }
  const setF = (patch: Partial<typeof f>) =>
    setEdits((e) => ({ ...e, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }))

  const fromResume: Record<string, boolean> = {
    currentTitle: !!fields.currentTitle, employer: !!fields.employer,
    yearsExperience: fields.yearsExperience !== undefined, city: !!fields.city,
  }

  const prov = (k: string) => (fromResume[k] ? 'read from your résumé' : undefined)

  function next() {
    if (!f.currentTitle || !f.employer || !f.city || f.yearsExperience === '' || !f.preferredRole) {
      setError('We need this to run the experience gate.')
      return
    }
    writeDraft({ fields: {
      ...f,
      yearsExperience: Number(f.yearsExperience),
      openToAdjacent: f.openToAdjacent === 'yes',
    } })
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
      <RoleInput
        label="What job role are you looking for?"
        provenance={fields.currentTitle ? "based on your current title — edit if you're looking for something different" : undefined}
        helper="e.g. 'Product Manager', not just 'Manager' — the more specific this is, the better your matches"
        value={f.preferredRole}
        onChange={(v) => setF({ ...f, preferredRole: v })}
      />

      <label style={{
        display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
        marginBottom: 'var(--space-md)', cursor: 'pointer',
        fontSize: 'var(--type-body-md-size)',
      }}>
        <input
          type="checkbox"
          checked={f.openToAdjacent === 'yes'}
          onChange={(e) => setF({ ...f, openToAdjacent: e.target.checked ? 'yes' : 'no' })}
          style={{ marginTop: 4 }}
        />
        <span>
          Also show me adjacent roles
          <span style={{ display: 'block', color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)' }}>
            Off by default. Your list stays strictly on the role above — turn this on
            to widen it, at the cost of some precision.
          </span>
        </span>
      </label>

      {error ? <p style={{ color: 'var(--color-error)', fontSize: 'var(--type-body-sm-size)' }}>{error}</p> : null}
      <Button onClick={next}>Looks right</Button>
    </main>
  )
}
