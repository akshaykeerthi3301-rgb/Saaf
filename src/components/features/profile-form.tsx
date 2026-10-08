'use client'

import { useId, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleInput } from '@/components/features/role-input'
import { LocationInput } from '@/components/features/location-input'
import { SkillsField } from '@/components/features/skills-field'
import { ExtraRolesField } from '@/components/features/extra-roles-field'
import { KeywordsField } from '@/components/features/keywords-field'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { deleteAccount } from '@/app/actions/delete-account'
import { restartOnboarding } from '@/app/actions/restart-onboarding'
import { signOut } from '@/app/actions/sign-out'
import { exportMyData } from '@/app/actions/account'
import { replayNudge } from '@/components/features/nudge-host'

type Initial = {
  currentTitle: string; employer: string; yearsExperience: string
  preferredRole: string; openToAdjacent: boolean; skills: string[]; city: string; credential: string
  /** Extras beyond the primary role, and the candidate's own keywords (0022). */
  extraRoles: string[]; keywords: string[]
  workModePreference: string; salaryExpectation: string
  fullName: string; phone: string; linkedinUrl: string; portfolioUrl: string; noticePeriod: string
}

/**
 * The profile in five tabs (TASK-189). One form, one state, one Save: the tabs only
 * decide which fields are on screen, so nothing is lost by moving between them and
 * a single Save rebuilds the list once. The last tab is the account's settings hub.
 */
const TABS = [
  ['basics', 'Basics'],
  ['search', 'Job search'],
  ['skills', 'Skills'],
  ['apply', 'Application details'],
  ['account', 'Account & data'],
] as const
type TabKey = (typeof TABS)[number][0]

const WORK_MODE_OPTIONS = [
  ['no_preference', 'No preference'],
  ['remote', 'Remote'],
  ['hybrid', 'Hybrid'],
  ['onsite', 'Onsite'],
] as const

export function ProfileForm({ initial, email, accountExtras, applyExtras }: { initial: Initial; email: string; accountExtras?: ReactNode; applyExtras?: ReactNode }) {
  const ids = useId()
  const router = useRouter()
  const [tourNote, setTourNote] = useState<string>()
  const [tab, setTab] = useState<TabKey>('basics')
  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState<string>()
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
      // The primary always leads the array, so the singular column and the
      // first element never disagree.
      preferredRoles: [f.preferredRole, ...f.extraRoles].filter(Boolean),
      keywords: f.keywords,
      skills: f.skills, city: f.city,
      credential: f.credential as 'CA' | 'CFA' | 'CS' | 'none',
      // Always sent from this screen (unlike onboarding, which never asks) —
      // an explicit "no preference" is a real answer here, not an omission.
      workModePreference: f.workModePreference as 'remote' | 'hybrid' | 'onsite' | 'no_preference',
      salaryExpectation: f.salaryExpectation,
      fullName: f.fullName, phone: f.phone, linkedinUrl: f.linkedinUrl,
      portfolioUrl: f.portfolioUrl, noticePeriod: f.noticePeriod,
    })
    setBusy(false)
    if (!res.ok) setError(res.error)
    else setMsg('Saved. Your list has been rebuilt against today’s roles.')
  }


  async function download() {
    setExporting(true); setExportNote(undefined)
    const r = await exportMyData().catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
    setExporting(false)
    if (!r.ok) { setExportNote(r.error); return }
    const url = URL.createObjectURL(new Blob([r.json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = r.filename
    a.click()
    URL.revokeObjectURL(url)
    setExportNote(`Downloaded ${r.filename}.`)
  }

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const to = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null
    if (to === null) return
    e.preventDefault()
    setTab(TABS[to][0])
    document.getElementById(`${ids}-tab-${TABS[to][0]}`)?.focus()
  }

  const panel = (key: TabKey) => ({ role: 'tabpanel' as const, id: `${ids}-panel-${key}`, 'aria-labelledby': `${ids}-tab-${key}`, hidden: tab !== key })

  const selectClass =
    'w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none transition-colors hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10'

  return (
    <>
      <div role="tablist" aria-label="Profile sections" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1.5">
        {TABS.map(([key, label], i) => (
          <button
            key={key}
            id={`${ids}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${ids}-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              tab === key ? 'bg-brand-gradient' : 'text-muted-foreground hover:text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div {...panel('basics')}>
          <Input label="Current title" value={f.currentTitle} onChange={(e) => setF({ ...f, currentTitle: e.target.value })} />
          <Input label="Employer" value={f.employer} onChange={(e) => setF({ ...f, employer: e.target.value })} />
          <Input label="Years of experience" type="number" min={0} max={50} step={0.5}
            value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} />
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
        </div>

        <div {...panel('search')}>
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

          <div className="border-t border-border pt-6">
            <ExtraRolesField
              roles={f.extraRoles}
              onChange={(extraRoles) => setF({ ...f, extraRoles })}
            />
          </div>

          <div className="border-t border-border pt-6">
            <KeywordsField keywords={f.keywords} onChange={(keywords) => setF({ ...f, keywords })} />
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
        </div>

        <div {...panel('skills')}>
          <SkillsField skills={f.skills} onChange={(skills) => setF({ ...f, skills })} />
        </div>

        <div {...panel('apply')}>
          {/*
            ⚠️ THESE FIVE ARE FOR THE BROWSER EXTENSION AND FOR NOTHING ELSE.
            The scorer reads none of them — no component moves because a phone
            number is present. They exist so the extension can fill an application
            form from the account instead of asking the candidate to type their
            own name into a popup, which is duplicate entry of a fact Jobinko could
            already have known. Optional throughout.
          */}
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            For filling application forms
          </p>
          <p className="mb-4 mt-1 text-sm leading-6 text-muted-foreground">
            Only used by the browser extension, and only when you press Fill. Never scored, never
            shown to an employer by us.
          </p>
          <Input label="Full name" value={f.fullName}
            onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          <Input label="Phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Input label="LinkedIn URL" type="url" inputMode="url" value={f.linkedinUrl}
            onChange={(e) => setF({ ...f, linkedinUrl: e.target.value })} />
          <Input label="Portfolio or GitHub" type="url" inputMode="url" value={f.portfolioUrl}
            onChange={(e) => setF({ ...f, portfolioUrl: e.target.value })} />
          <Input label="Notice period" value={f.noticePeriod}
            onChange={(e) => setF({ ...f, noticePeriod: e.target.value })} />
          {applyExtras}
        </div>

        {tab !== 'account' ? (
          <div>
            {error ? (
              <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
            ) : null}
            {msg ? (
              <p className="mb-4 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">{msg}</p>
            ) : null}

            <Button onClick={save} disabled={busy}>{busy ? 'Rebuilding your list…' : 'Save'}</Button>
            <p className="mt-3 text-xs text-muted-foreground">One Save covers every tab. Saving re-runs your matches against today’s roles.</p>
          </div>
        ) : null}

        <div {...panel('account')}>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as <span className="font-semibold text-primary">{email}</span>.</p>
          <form action={signOut} className="mt-4">
            <Button type="submit" variant="ghost">Sign out</Button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Download my data</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Everything Jobinko holds about you in one file: your profile, your applications and your saved résumés. Scores are counted, not listed, because they are rebuilt from your profile.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" variant="ghost" onClick={download} disabled={exporting}>{exporting ? 'Putting it together…' : 'Download my data'}</Button>
              {exportNote ? <span role="status" className="text-xs text-muted-foreground">{exportNote}</span> : null}
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Help</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">A five-stop tour of the job feed, shown once on your first visit.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => (replayNudge('tour:feed') ? router.push('/today') : setTourNote('This browser cannot remember tours, so none is shown.'))}
              >
                Show the tour again
              </Button>
              {tourNote ? <span role="status" className="text-xs text-muted-foreground">{tourNote}</span> : null}
            </div>
          </div>

          {accountExtras ? <div className="mt-8 border-t border-border pt-6">{accountExtras}</div> : null}
        </div>
      </section>

      {/* The rest of the Account tab: the same panel, continued below the card. */}
      <div hidden={tab !== 'account'}>
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
      </div>
    </>
  )
}
