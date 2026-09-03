'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { deleteAccount } from '@/app/actions/delete-account'
import { restartOnboarding } from '@/app/actions/restart-onboarding'
import { QUESTIONS, ASSESSMENT_ONLY_FUNCTIONS, type Fn } from '@/lib/gate-questions'

type Initial = {
  currentTitle: string; employer: string; yearsExperience: string
  fn: string; city: string; credential: string; assessmentAnswer: string
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
      fn: f.fn as Fn, city: f.city,
      credential: f.credential as 'CA' | 'CFA' | 'CS' | 'none',
      assessmentAnswer: ASSESSMENT_ONLY_FUNCTIONS.includes(f.fn as Fn) ? f.assessmentAnswer : undefined,
      // Always sent from this screen (unlike onboarding, which never asks) —
      // an explicit "no preference" is a real answer here, not an omission.
      workModePreference: f.workModePreference as 'remote' | 'hybrid' | 'onsite' | 'no_preference',
      salaryExpectation: f.salaryExpectation,
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else setMsg('Saved. Your list has been rebuilt against today’s roles.')
  }

  return (
    <>
      <Input label="Current title" value={f.currentTitle} onChange={(e) => setF({ ...f, currentTitle: e.target.value })} />
      <Input label="Employer" value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} />
      <Input label="Years of experience" type="number" min={0} max={50} step={0.5}
        value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} />
      <Input label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label htmlFor="cred" style={{
          display: 'block', fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
          letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-xs)',
        }}>Credential</label>
        <select id="cred" value={f.credential} onChange={(e) => setF({ ...f, credential: e.target.value })}
          style={{
            width: '100%', maxWidth: 420, height: 44, padding: '12px 14px',
            background: 'var(--color-surface)', color: 'var(--color-on-surface)',
            font: 'inherit', fontSize: 'var(--type-body-md-size)',
            border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-sm)',
          }}>
          <option value="none">None of these</option>
          <option value="CA">CA</option>
          <option value="CFA">CFA</option>
          <option value="CS">CS</option>
        </select>
      </div>

      {ASSESSMENT_ONLY_FUNCTIONS.includes(f.fn as Fn) ? (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label htmlFor="assessment" style={{
            display: 'block', fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
            letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
            color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-xs)',
          }}>{QUESTIONS[f.fn as Fn].q}</label>
          <select id="assessment" value={f.assessmentAnswer}
            onChange={(e) => setF({ ...f, assessmentAnswer: e.target.value })}
            style={{
              width: '100%', maxWidth: 420, height: 44, padding: '12px 14px',
              background: 'var(--color-surface)', color: 'var(--color-on-surface)',
              font: 'inherit', fontSize: 'var(--type-body-md-size)',
              border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-sm)',
            }}>
            <option value="">Not answered</option>
            {QUESTIONS[f.fn as Fn].options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label htmlFor="workMode" style={{
          display: 'block', fontSize: 'var(--type-label-sm-size)', fontWeight: 600,
          letterSpacing: 'var(--type-label-sm-ls)', textTransform: 'uppercase',
          color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-xs)',
        }}>Work mode</label>
        <select id="workMode" value={f.workModePreference}
          onChange={(e) => setF({ ...f, workModePreference: e.target.value })}
          style={{
            width: '100%', maxWidth: 420, height: 44, padding: '12px 14px',
            background: 'var(--color-surface)', color: 'var(--color-on-surface)',
            font: 'inherit', fontSize: 'var(--type-body-md-size)',
            border: '1px solid var(--color-outline)', borderRadius: 'var(--rounded-sm)',
          }}>
          {WORK_MODE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)', margin: 'var(--space-xs) 0 0' }}>
          Never withholds a role — only moves a better-matching one higher on your list.
        </p>
      </div>

      <Input label="Salary expectation" value={f.salaryExpectation}
        onChange={(e) => setF({ ...f, salaryExpectation: e.target.value })}
        helper="No role we index states a salary, so this can't filter your list yet — it's here so it's ready if that changes." />

      {error ? <p style={{ color: 'var(--color-error)', fontSize: 'var(--type-body-sm-size)' }}>{error}</p> : null}
      {msg ? <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-sm-size)' }}>{msg}</p> : null}

      <Button onClick={save} disabled={busy}>{busy ? 'Rebuilding your list…' : 'Save'}</Button>

      <hr className="rule" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }} />

      <h2 style={{ fontSize: 'var(--type-headline-md-size)', fontWeight: 500, margin: '0 0 8px' }}>
        Start again with a different résumé
      </h2>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
        Runs onboarding from the top. Your current list stays up until the new
        profile is confirmed, so you are never left staring at nothing.
      </p>
      <form action={restartOnboarding}>
        <Button type="submit" variant="ghost">Upload a different résumé</Button>
      </form>

      <hr className="rule" style={{ margin: 'var(--space-xl) 0 var(--space-md)' }} />

      <h2 style={{ fontSize: 'var(--type-headline-md-size)', fontWeight: 500, margin: '0 0 8px' }}>
        Delete your account
      </h2>
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--type-body-md-size)', marginTop: 0 }}>
        Everything goes: your profile, your lists, your reports. One click, no email, and we
        can&apos;t undo it.
      </p>

      {confirming ? (
        <form action={deleteAccount} style={{ display: 'flex', gap: 8 }}>
          <Button type="submit">Yes, delete everything</Button>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Keep my account</Button>
        </form>
      ) : (
        <Button variant="ghost" onClick={() => setConfirming(true)}>Delete my account</Button>
      )}
    </>
  )
}
