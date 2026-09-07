'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleInput } from '@/components/features/role-input'
import { LocationInput } from '@/components/features/location-input'
import { SkillsField } from '@/components/features/skills-field'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { deleteAccount } from '@/app/actions/delete-account'
import { restartOnboarding } from '@/app/actions/restart-onboarding'

type Initial = {
  currentTitle: string; employer: string; yearsExperience: string
  preferredRole: string; openToAdjacent: boolean; skills: string[]; city: string; credential: string
  workModePreference: string; salaryExpectation: string
}

const WORK_MODE_OPTIONS = [
  ['no_preference', 'No preference'],
  ['remote', 'Remote'],
  ['hybrid', 'Hybrid'],
  ['onsite', 'Onsite'],
] as const

export function ProfileForm({ initial }: { initial: Initial }) {
  const [f, setF] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)

  async function save() {
    setBusy(true); setError(undefined); setMsg(undefined)
    const res = await confirmProfile({
      currentTitle: f.currentTitle, employer: f.employer,
      yearsExperience: Number(f.yearsExperience),
      preferredRole: f.preferredRole, openToAdjacent: f.openToAdjacent,
      skills: f.skills, city: f.city,
      credential: f.credential as 'CA' | 'CFA' | 'CS' | 'none',
      // Always sent from this screen (unlike onboarding, which never asks) —
      // an explicit "no preference" is a real answer here, not an omission.
      workModePreference: f.workModePreference as 'remote' | 'hybrid' | 'onsite' | 'no_preference',
      salaryExpectation: f.salaryExpectation,
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else setMsg('Saved. Your list has been rebuilt against today’s roles.')
  }


  const selectClass =
    'w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none transition-colors hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10'

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <Input label="Current title" value={f.currentTitle} onChange={(e) => setF({ ...f, currentTitle: e.target.value })} />
        <Input label="Employer" value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} />
        <Input label="Years of experience" type="number" min={0} max={50} step={0.5}
          value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} />
        <LocationInput
          label="Where do you want to work?"
          value={f.city}
          onChange={(v) => setF({ ...f, city: v })}
        />
        <RoleInput
          label="Preferred job role"
          value={f.preferredRole}
          helper="Be specific — 'Product Manager', not 'Manager'."
          onChange={(v) => setF({ ...f, preferredRole: v })}
        />

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-input p-4 transition-colors hover:border-foreground/30">
          <input type="checkbox" checked={f.openToAdjacent}
            onChange={(e) => setF({ ...f, openToAdjacent: e.target.checked })}
            className="mt-0.5 size-4 accent-accent" />
          <span>
            <span className="block text-sm font-semibold text-primary">Also show me adjacent roles</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Wider list, less precision.
            </span>
          </span>
        </label>

        <SkillsField skills={f.skills} onChange={(skills) => setF({ ...f, skills })} />

        <div className="mb-6">
          <label htmlFor="cred" className="mb-2 block text-sm font-semibold text-primary">Credential</label>
          <select id="cred" value={f.credential} onChange={(e) => setF({ ...f, credential: e.target.value })}
            className={selectClass}>
            <option value="none">None of these</option>
            <option value="CA">CA</option>
            <option value="CFA">CFA</option>
            <option value="CS">CS</option>
          </select>
        </div>

        <div className="mb-6">
          <label htmlFor="workMode" className="mb-2 block text-sm font-semibold text-primary">Work mode</label>
          <select id="workMode" value={f.workModePreference}
            onChange={(e) => setF({ ...f, workModePreference: e.target.value })}
            className={selectClass}>
            {WORK_MODE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Never withholds a role — only reorders.
          </p>
        </div>

        <Input label="Salary expectation" value={f.salaryExpectation}
          onChange={(e) => setF({ ...f, salaryExpectation: e.target.value })}
          helper="We don’t read salaries off postings, so this can’t filter yet." />

        {error ? (
          <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : null}
        {msg ? (
          <p className="mb-4 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">{msg}</p>
        ) : null}

        <Button onClick={save} disabled={busy}>{busy ? 'Rebuilding your list…' : 'Save'}</Button>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">
          Start again with a different résumé
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your current list stays up until you confirm the new profile.
        </p>
        <form action={restartOnboarding} className="mt-4">
          <Button type="submit" variant="ghost">Upload a different résumé</Button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Delete your account</h2>
        {/* Shortened but not softened — "can't be undone" is the fact that has
            to survive any cut on a destructive control. */}
        <p className="mt-2 text-sm text-muted-foreground">
          Profile, lists and reports. Can&apos;t be undone.
        </p>

        {confirming ? (
          <form action={deleteAccount} className="mt-4 flex flex-wrap gap-3">
            <Button type="submit">Yes, delete everything</Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Keep my account</Button>
          </form>
        ) : (
          <div className="mt-4">
            <Button variant="ghost" onClick={() => setConfirming(true)}>Delete my account</Button>
          </div>
        )}
      </section>
    </>
  )
}
