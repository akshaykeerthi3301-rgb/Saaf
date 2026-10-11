'use client'

import { useState } from 'react'
import { Briefcase, GraduationCap, Info } from 'lucide-react'
import { saveProfileEntry } from '@/app/actions/profile-cards'
import { EditDrawer, Field, inputClass } from '@/components/features/profile-ui'
import { MONTHS, bulletsToText, parseDates, type EntryKind } from '@/lib/profile-entries'
import { EMPLOYMENT_TYPES } from '@/lib/profile-extras'

/**
 * Add or edit one job, project or school — the profile's "Edit Experience" panel. The dates are month and year pickers
 * with a "currently work here" box; what is saved is the résumé's own date string (src/lib/profile-entries.ts).
 */
export type EntryInitial = {
  title?: string | null
  employer?: string | null
  location?: string | null
  employmentType?: string
  dates?: string | null
  bullets?: string[]
  qualification?: string
  institution?: string | null
  major?: string
  gpa?: string
  summary?: string
}

const YEARS = (() => {
  const top = new Date().getFullYear() + 2
  return Array.from({ length: top - 1969 }, (_, i) => top - i)
})()

const select = inputClass

export function EntryDrawer({ kind, index, initial, onClose }: {
  kind: EntryKind
  /** null = adding a new one. */
  index: number | null
  initial: EntryInitial
  onClose: () => void
}) {
  const edu = kind === 'education'
  const d = parseDates(initial.dates)
  const [title, setTitle] = useState(initial.title ?? '')
  const [employer, setEmployer] = useState(initial.employer ?? '')
  const [location, setLocation] = useState(initial.location ?? '')
  const [type, setType] = useState(initial.employmentType ?? '')
  const [description, setDescription] = useState(bulletsToText(initial.bullets ?? []))
  const [institution, setInstitution] = useState(initial.institution ?? '')
  const [qualification, setQualification] = useState(initial.qualification ?? '')
  // An entry saved before majors had their own box: the field of study is what follows the degree's comma.
  const [major, setMajor] = useState(initial.major ?? (initial.qualification?.includes(',') ? initial.qualification.split(',').slice(1).join(',').trim() : ''))
  const [gpa, setGpa] = useState(initial.gpa ?? '')
  const [summary, setSummary] = useState(initial.summary ?? '')
  const [sm, setSm] = useState<number | null>(d.startMonth)
  const [sy, setSy] = useState<number | null>(d.startYear)
  const [em, setEm] = useState<number | null>(d.endMonth)
  const [ey, setEy] = useState<number | null>(d.endYear)
  const [current, setCurrent] = useState(d.current)

  const num = (v: string) => (v ? Number(v) : null)
  const dates = { startMonth: sm, startYear: sy, endMonth: current ? null : em, endYear: current ? null : ey, current }

  async function save(): Promise<string | null> {
    const r = edu
      ? await saveProfileEntry({ kind: 'education', index, institution, major, qualification, gpa, ...dates })
      : await saveProfileEntry({ kind, index, title, employer, location, employmentType: type, summary, description, ...dates })
    return r.ok ? null : r.error
  }

  const word = kind === 'experience' ? 'Experience' : kind === 'project' ? 'Project' : 'Education'

  const monthSelect = (value: number | null, set: (v: number | null) => void, label: string, disabled = false) => (
    <select aria-label={label} value={value ?? ''} disabled={disabled} onChange={(e) => set(num(e.target.value))} className={select}>
      <option value="">Month</option>
      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
    </select>
  )
  const yearSelect = (value: number | null, set: (v: number | null) => void, label: string, disabled = false) => (
    <select aria-label={label} value={value ?? ''} disabled={disabled} onChange={(e) => set(num(e.target.value))} className={select}>
      <option value="">Year</option>
      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  )

  return (
    <EditDrawer
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      title={`${index === null ? 'Add' : 'Edit'} ${word}`}
      icon={edu ? <GraduationCap className="size-5" /> : <Briefcase className="size-5" />}
      onSave={save}
      note={
        <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/50 p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-primary">Profile section</p>
            <p className="text-sm text-muted-foreground">This is saved to your main résumé, and used to autofill and tailor your applications.</p>
          </div>
        </div>
      }
    >
      {edu ? (
        <>
          <Field label="School name" required><input value={institution} onChange={(e) => setInstitution(e.target.value)} className={inputClass} placeholder="e.g. Indian Institute of Management" /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Major" required><input value={major} onChange={(e) => setMajor(e.target.value)} className={inputClass} placeholder="Marketing" /></Field>
            <Field label="Degree type" required><input value={qualification} onChange={(e) => setQualification(e.target.value)} className={inputClass} placeholder="MBA, Marketing" /></Field>
            <Field label="GPA" hint="As you write it: 8.4, 3.7/4.0, 78%"><input value={gpa} onChange={(e) => setGpa(e.target.value)} className={inputClass} placeholder="8.4" /></Field>
          </div>
        </>
      ) : (
        <>
          <Field label={kind === 'project' ? 'Project name' : 'Position title'} required><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
          <Field label={kind === 'project' ? 'Organisation or context' : 'Company'} required={kind === 'experience'}><input value={employer} onChange={(e) => setEmployer(e.target.value)} className={inputClass} /></Field>
          <div className={`grid gap-4 ${kind === 'experience' ? 'sm:grid-cols-2' : ''}`}>
            <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Bengaluru, India" /></Field>
            {kind === 'experience' ? (
              <Field label="Job type" required>
                <select value={type} onChange={(e) => setType(e.target.value)} className={select}>
                  <option value="">Select…</option>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start month">{monthSelect(sm, setSm, 'Start month')}</Field>
        <Field label="Start year">{yearSelect(sy, setSy, 'Start year')}</Field>
        <Field label="End month">{monthSelect(em, setEm, 'End month', current)}</Field>
        <Field label="End year">{yearSelect(ey, setEy, 'End year', current)}</Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-primary">
        <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} className="size-4 rounded border-input" />
        {edu ? 'I currently study here' : kind === 'project' ? 'This is ongoing' : 'I currently work here'}
      </label>

      {edu || kind !== 'experience' ? null : (
        <Field label="Experience summary" hint="One or two sentences on the role. Kept for autofill — not printed on your résumé.">
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={1000} className={`${inputClass} resize-y leading-6`} />
        </Field>
      )}

      {edu ? null : (
        <Field label="Description" hint="One achievement per line. Numbers and outcomes read best.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={9} className={`${inputClass} resize-y leading-6`} />
        </Field>
      )}
    </EditDrawer>
  )
}
