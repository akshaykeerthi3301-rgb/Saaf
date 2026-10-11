'use client'

import { useState } from 'react'
import { Briefcase, Info, UserRound } from 'lucide-react'
import { saveProfileExtras, saveProfilePersonal } from '@/app/actions/profile-cards'
import { saveSelfId } from '@/app/actions/self-id'
import { ChoiceChips, EditButton, EditDrawer, Field, Label, ProfileCard, Value, YES_NO_CHOICES, inputClass, plainChoices } from '@/components/features/profile-ui'
import { DECLINED, SELF_ID_FIELDS, type SelfIdAnswers, type SelfIdField } from '@/lib/self-id'
import { PHONE_TYPES, type Extras } from '@/lib/profile-extras'

/**
 * The Personal Info view: the contact block, and the "employment information" questions that application forms ask.
 * Both are edited in a pop-up where every question with a fixed set of answers is a row of tap-to-pick chips, so
 * nobody types "Male" or hunts through a dropdown. The demographic ones are answered only by you, never guessed.
 */
export type PersonalData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  extras: Extras
  selfId: SelfIdAnswers
  links: { linkedin: string; portfolio: string; github: string; other: string }
  /** False until the database update that stores these answers has been applied. */
  selfIdStored: boolean
}

/** The three answers forms ask in every country — kept with the person's profile, not with a single employer. */
const WORK_QUESTIONS = [
  { key: 'authorisedToWork', label: 'Are you legally authorised to work in India?', required: true },
  { key: 'needsSponsorship', label: 'Will you now or in the future require sponsorship for an employment visa?', required: true },
  { key: 'willingToRelocate', label: 'Are you willing to relocate?', required: false },
] as const

const yesNoWord = (v: string | undefined) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v === DECLINED ? 'Decline to state' : '')
const shown = (v: string | undefined) => (v === DECLINED ? 'Decline to state' : v)

export function ProfilePersonal({ data }: { data: PersonalData }) {
  const [panel, setPanel] = useState<null | 'personal' | 'employment'>(null)
  const x = data.extras
  const grid: [string, string][] = [
    ['First Name', data.firstName], ['Middle Name', x.middleName],
    ['Last Name', data.lastName], ['Preferred Name', x.preferredName],
    ['Suffix Name', x.suffixName], ['Birthday', x.birthday],
    ['Email Address', data.email], ['Phone Number', data.phone],
    ['Phone Type', x.phoneType], ['Address Line', x.address1],
    ['Address 2', x.address2], ['Address 3', x.address3],
    ['Country/Region', x.country], ['State/Province', x.state],
    ['City / Location', data.city], ['County', x.county],
    ['Postal Code', x.postalCode],
    ['LinkedIn URL', data.links.linkedin], ['GitHub URL', data.links.github],
    ['Portfolio URL', data.links.portfolio],
  ]
  return (
    <div className="space-y-4">
      <ProfileCard title="Personal Info" action={<EditButton label="Edit personal info" onClick={() => setPanel('personal')} />}>
        <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {grid.map(([label, value]) => (
            <div key={label} className="min-w-0"><dt><Label>{label}</Label></dt><dd><Value>{value}</Value></dd></div>
          ))}
        </dl>
      </ProfileCard>

      <ProfileCard title="Employment Information" action={<EditButton label="Edit employment information" onClick={() => setPanel('employment')} />}>
        <p className="mt-3 text-sm text-muted-foreground">Jobinko never answers the voluntary questions for you and never guesses. The extension fills only what you answer here.</p>
        <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {WORK_QUESTIONS.map((q) => (
            <div key={q.key} className="min-w-0"><dt><Label>{q.label}</Label></dt><dd><Value>{yesNoWord(x[q.key])}</Value></dd></div>
          ))}
          {SELF_ID_FIELDS.map((f) => {
            const a = data.selfId[f.key]
            return (
              <div key={f.key} className="min-w-0">
                <dt><Label>{f.label}</Label></dt>
                <dd><Value>{f.kind === 'yesno' ? yesNoWord(a) : shown(a)}</Value></dd>
              </div>
            )
          })}
        </dl>
      </ProfileCard>

      {panel === 'personal' ? <PersonalDrawer data={data} onClose={() => setPanel(null)} /> : null}
      {panel === 'employment' ? <EmploymentDrawer data={data} onClose={() => setPanel(null)} /> : null}
    </div>
  )
}

function PersonalDrawer({ data, onClose }: { data: PersonalData; onClose: () => void }) {
  const x = data.extras
  const [v, setV] = useState({
    firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city,
    middleName: x.middleName, preferredName: x.preferredName, suffixName: x.suffixName, birthday: x.birthday,
    phoneType: x.phoneType as string,
    address1: x.address1, address2: x.address2, address3: x.address3, postalCode: x.postalCode,
    country: x.country, state: x.state, county: x.county,
    linkedinUrl: data.links.linkedin, githubUrl: data.links.github, portfolioUrl: data.links.portfolio, otherUrl: data.links.other,
  })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Personal Info" icon={<UserRound className="size-5" />}
      onSave={async () => { const r = await saveProfilePersonal(v as Parameters<typeof saveProfilePersonal>[0]); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Updates here are used to autofill your applications. Your city decides which jobs count as near you, so saving rebuilds your matches. Nothing here is shown to an employer.</p>}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="First name" required><input value={v.firstName} onChange={set('firstName')} className={inputClass} /></Field>
        <Field label="Middle name"><input value={v.middleName} onChange={set('middleName')} className={inputClass} placeholder="Middle name" /></Field>
        <Field label="Last name" required><input value={v.lastName} onChange={set('lastName')} className={inputClass} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preferred name (optional)"><input value={v.preferredName} onChange={set('preferredName')} className={inputClass} placeholder="Enter preferred name" /></Field>
        <Field label="Suffix (optional)"><input value={v.suffixName} onChange={set('suffixName')} className={inputClass} placeholder="Enter suffix" /></Field>
      </div>
      <Field label="Email address" hint="Your sign-in address. It cannot be changed here."><input value={data.email} readOnly className={`${inputClass} bg-secondary/50 text-muted-foreground`} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" required><input value={v.phone} onChange={set('phone')} inputMode="tel" className={inputClass} placeholder="+91 …" /></Field>
        <Field label="Date of birth"><input type="date" value={v.birthday} onChange={set('birthday')} className={inputClass} /></Field>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-primary">Phone type</span>
        <ChoiceChips label="Phone type" options={plainChoices(PHONE_TYPES)} value={v.phoneType} onChange={(t) => setV({ ...v, phoneType: t })} />
      </div>
      <Field label="Address line" required><input value={v.address1} onChange={set('address1')} className={inputClass} placeholder="Enter your current address" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address 2"><input value={v.address2} onChange={set('address2')} className={inputClass} /></Field>
        <Field label="Address 3"><input value={v.address3} onChange={set('address3')} className={inputClass} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country/Region" required><input value={v.country} onChange={set('country')} className={inputClass} placeholder="India" /></Field>
        <Field label="State/Province" required><input value={v.state} onChange={set('state')} className={inputClass} placeholder="Karnataka" /></Field>
        <Field label="City / Location" required><input value={v.city} onChange={set('city')} className={inputClass} placeholder="Bengaluru, Karnataka, India" /></Field>
        <Field label="County"><input value={v.county} onChange={set('county')} className={inputClass} placeholder="Enter your current county" /></Field>
      </div>
      <Field label="Postal code" required><input value={v.postalCode} onChange={set('postalCode')} className={`${inputClass} sm:w-1/2`} placeholder="Postal code for your address" /></Field>
      <Field label="LinkedIn URL" required><input value={v.linkedinUrl} onChange={set('linkedinUrl')} className={inputClass} placeholder="https://www.linkedin.com/in/your-name" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GitHub URL"><input value={v.githubUrl} onChange={set('githubUrl')} className={inputClass} placeholder="https://github.com/your-name" /></Field>
        <Field label="Portfolio URL"><input value={v.portfolioUrl} onChange={set('portfolioUrl')} className={inputClass} placeholder="https://" /></Field>
      </div>
    </EditDrawer>
  )
}

/**
 * Every question is a row of chips. A question marked * (the ones Jobright marks) must be answered — or, for the voluntary
 * ones, declined — before Update. Declining is stored (`decline`); the extension never fills it. A question without a star
 * can simply be left empty.
 */
function EmploymentDrawer({ data, onClose }: { data: PersonalData; onClose: () => void }) {
  const x = data.extras
  const [work, setWork] = useState<Record<string, string>>({ authorisedToWork: x.authorisedToWork, needsSponsorship: x.needsSponsorship, willingToRelocate: x.willingToRelocate })
  const [self, setSelf] = useState<Record<string, string>>({ ...data.selfId })

  async function save(): Promise<string | null> {
    const missing = [
      ...WORK_QUESTIONS.filter((q) => q.required && !work[q.key]).map((q) => q.label),
      ...SELF_ID_FIELDS.filter((f) => f.required && !self[f.key]).map((f) => f.label),
    ]
    if (missing.length) return `Please answer ${missing.length === 1 ? 'this question' : `these ${missing.length} questions`}, marked *: ${missing.join(' · ')}`
    const answers = Object.fromEntries(Object.entries(self).filter(([, v]) => v))
    const a = await saveSelfId(answers)
    if (!a.ok) return a.error
    const b = await saveProfileExtras({ authorisedToWork: work.authorisedToWork as '' | 'yes' | 'no', needsSponsorship: work.needsSponsorship as '' | 'yes' | 'no', willingToRelocate: work.willingToRelocate as '' | 'yes' | 'no' })
    return b.ok ? null : b.error
  }

  const question = (f: { key: string; label: string; hint?: string; required?: boolean }, chips: React.ReactNode) => (
    <div key={f.key} className="border-t border-border pt-5 first:border-t-0 first:pt-0">
      <p className="mb-2 text-sm font-semibold text-primary">{f.label}{f.required ? <span className="text-destructive"> *</span> : null}</p>
      {chips}
      {f.hint ? <p className="mt-1.5 text-xs text-muted-foreground">{f.hint}</p> : null}
    </div>
  )
  /** A declined answer is shown as the Decline chip pressed; an optional question's Decline simply empties it. */
  const declineChip = (required: boolean | undefined, key: string) => (required ? { clearLabel: 'Decline to state', clearValue: DECLINED } : { clearLabel: 'Decline to state', clearValue: '' })

  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Employment" icon={<Briefcase className="size-5" />}
      onSave={save} saveLabel="Update"
      note={
        <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Updates to your profile are used to autofill your applications. Tap an answer — or <span className="font-semibold text-primary">Decline to state</span> to
            leave it blank on the form. Questions marked <span className="text-destructive">*</span> need one or the other. Jobinko never guesses these.
            {!data.selfIdStored ? ' The voluntary questions need a database update that has not been applied yet, so they will not save.' : ''}
          </p>
        </div>
      }
    >
      {WORK_QUESTIONS.map((q) => question(q, (
        <ChoiceChips label={q.label} options={YES_NO_CHOICES} value={work[q.key]} onChange={(val) => setWork({ ...work, [q.key]: val })} clearLabel={q.required ? undefined : 'Decline to state'} />
      )))}
      {SELF_ID_FIELDS.map((f: SelfIdField) => {
        const d = declineChip(f.required, f.key)
        const chips = f.kind === 'yesno' ? YES_NO_CHOICES : f.options ? plainChoices(f.options) : null
        return question(f, chips
          ? <ChoiceChips label={f.label} options={chips} value={self[f.key] ?? ''} onChange={(val) => setSelf({ ...self, [f.key]: val })} clearLabel={d.clearLabel} clearValue={d.clearValue} />
          : <input aria-label={f.label} value={self[f.key] === DECLINED ? '' : self[f.key] ?? ''} maxLength={60} placeholder="Decline to state" onChange={(e) => setSelf({ ...self, [f.key]: e.target.value })} className={inputClass} />)
      })}
      <p className="text-xs text-muted-foreground">Date of birth, age and pregnancy are never filled, whatever you enter anywhere.</p>
    </EditDrawer>
  )
}
