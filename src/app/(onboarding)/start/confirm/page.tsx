'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleInput } from '@/components/features/role-input'
import { SkillsField } from '@/components/features/skills-field'
import { OnboardingShell } from '@/components/features/onboarding-shell'
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
  // Skills are a list, not a string, so they live outside the edits map.
  // undefined means "untouched" — fall through to whatever was parsed.
  const [skillEdits, setSkillEdits] = useState<string[]>()
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
  const skills = skillEdits ?? fields.skills ?? []
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
      skills,
      domain: fields.domain,
    } })
    router.push('/start/gate')
  }


  return (
    <OnboardingShell step={4}>
      <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
        Confirm what we read from your résumé
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Nothing runs until you&apos;ve checked every field.
      </p>

      {warnings.length ? (
        <div className="mt-6 flex gap-3 rounded-xl border border-border bg-secondary/50 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8">
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

        <SkillsField
          skills={skills}
          fromResume={(fields.skills?.length ?? 0) > 0}
          onChange={setSkillEdits}
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-4 transition-colors hover:border-foreground/30">
          <input
            type="checkbox"
            checked={f.openToAdjacent === 'yes'}
            onChange={(e) => setF({ ...f, openToAdjacent: e.target.checked ? 'yes' : 'no' })}
            className="mt-0.5 size-4 accent-accent"
          />
          <span>
            <span className="block text-sm font-semibold text-primary">
              Also show me adjacent roles
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Off by default. Your list stays strictly on the role above — turn this on to widen
              it, at the cost of some precision.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-10 border-t border-border pt-6">
        <Button className="w-full" onClick={next}>Looks right</Button>
      </div>
    </OnboardingShell>
  )
}
