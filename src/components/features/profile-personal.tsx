'use client'

import { useState, type ReactNode } from 'react'
import { UserRound } from 'lucide-react'
import { saveProfilePersonal } from '@/app/actions/profile-cards'
import { EditButton, EditDrawer, Field, Label, ProfileCard, Value, inputClass } from '@/components/features/profile-ui'
import { SELF_ID_FIELDS, type SelfIdAnswers } from '@/lib/self-id'
import type { Extras } from '@/lib/profile-extras'

/**
 * The Personal Info view: the contact block and the "employment information" questions that application forms ask.
 * The second card is the existing "questions only you can answer" tool — answered only by you, never guessed — in the
 * reference product's place for it.
 */
export type PersonalData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  extras: Extras
  selfId: SelfIdAnswers
}

export function ProfilePersonal({ data, selfIdPanel }: { data: PersonalData; selfIdPanel: ReactNode }) {
  const [panel, setPanel] = useState<null | 'personal' | 'self-id'>(null)
  const x = data.extras
  const grid: [string, ReactNode][] = [
    ['First Name', data.firstName], ['Last Name', data.lastName],
    ['Preferred Name', x.preferredName], ['Suffix Name', x.suffixName],
    ['Email Address', data.email], ['Phone Number', data.phone],
    ['Birthday', x.birthday], ['Location', data.city],
    ['Address', x.address1], ['Address 2', x.address2],
    ['Address 3', x.address3], ['Postal Code', x.postalCode],
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

      <ProfileCard title="Employment Information" action={<EditButton label="Edit employment information" onClick={() => setPanel('self-id')} />}>
        <p className="mt-3 text-sm text-muted-foreground">Jobinko never answers these for you and never guesses. The extension fills only what you answer here.</p>
        <dl className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {SELF_ID_FIELDS.map((f) => {
            const a = data.selfId[f.key]
            return (
              <div key={f.key} className="min-w-0">
                <dt><Label>{f.label}</Label></dt>
                <dd><Value>{f.kind === 'yesno' && a ? (a === 'yes' ? 'Yes' : 'No') : a}</Value></dd>
              </div>
            )
          })}
        </dl>
      </ProfileCard>

      {panel === 'personal' ? <PersonalDrawer data={data} onClose={() => setPanel(null)} /> : null}
      {panel === 'self-id' ? (
        <EditDrawer open onOpenChange={(o) => { if (!o) setPanel(null) }} title="Edit Employment Information" icon={<UserRound className="size-5" />} onSave={async () => null} saveLabel="Done">
          {selfIdPanel}
        </EditDrawer>
      ) : null}
    </div>
  )
}

function PersonalDrawer({ data, onClose }: { data: PersonalData; onClose: () => void }) {
  const x = data.extras
  const [v, setV] = useState({
    firstName: data.firstName, lastName: data.lastName, phone: data.phone, city: data.city,
    preferredName: x.preferredName, suffixName: x.suffixName, birthday: x.birthday,
    address1: x.address1, address2: x.address2, address3: x.address3, postalCode: x.postalCode,
  })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Personal Info" icon={<UserRound className="size-5" />}
      onSave={async () => { const r = await saveProfilePersonal(v); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Your city decides which jobs count as near you, so saving rebuilds your matches. Nothing here is shown to an employer.</p>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required><input value={v.firstName} onChange={set('firstName')} className={inputClass} /></Field>
        <Field label="Last name"><input value={v.lastName} onChange={set('lastName')} className={inputClass} /></Field>
        <Field label="Preferred name (optional)"><input value={v.preferredName} onChange={set('preferredName')} className={inputClass} placeholder="Enter preferred name" /></Field>
        <Field label="Suffix (optional)"><input value={v.suffixName} onChange={set('suffixName')} className={inputClass} placeholder="Enter suffix" /></Field>
      </div>
      <Field label="Email address" hint="Your sign-in address. It cannot be changed here."><input value={data.email} readOnly className={`${inputClass} bg-secondary/50 text-muted-foreground`} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of birth"><input type="date" value={v.birthday} onChange={set('birthday')} className={inputClass} /></Field>
        <Field label="Phone"><input value={v.phone} onChange={set('phone')} inputMode="tel" className={inputClass} placeholder="+91 …" /></Field>
      </div>
      <Field label="Location" required><input value={v.city} onChange={set('city')} className={inputClass} placeholder="Bengaluru, Karnataka, India" /></Field>
      <Field label="Address"><input value={v.address1} onChange={set('address1')} className={inputClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address 2"><input value={v.address2} onChange={set('address2')} className={inputClass} /></Field>
        <Field label="Address 3"><input value={v.address3} onChange={set('address3')} className={inputClass} /></Field>
      </div>
      <Field label="Postal code"><input value={v.postalCode} onChange={set('postalCode')} className={`${inputClass} sm:w-1/2`} /></Field>
    </EditDrawer>
  )
}
