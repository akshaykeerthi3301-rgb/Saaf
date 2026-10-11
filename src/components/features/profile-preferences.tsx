'use client'

import { useState, type ReactNode } from 'react'
import { Briefcase, Building2, Compass, Heart, MapPin, SlidersHorizontal, Target, Wallet, Zap } from 'lucide-react'
import { saveProfileExtras, saveProfileKeywords, saveProfileRoles } from '@/app/actions/profile-cards'
import { savePreferences, setSearchStatus } from '@/app/actions/workspace'
import { SkillsDrawer } from '@/components/features/profile-main'
import { RolesEditor } from '@/components/features/roles-editor'
import {
  Chip, ChipEditor, EditButton, EditDrawer, Field, Label, PickEditor, ProfileCard, inputClass,
} from '@/components/features/profile-ui'
import { splitRoles } from '@/lib/role-list'
import {
  COMPANY_SIZES, EMPLOYMENT_TYPES, INDUSTRIES, VALUE_OPTIONS, type Extras,
} from '@/lib/profile-extras'
import type { Currency, Preferences, SearchStatus, Seniority } from '@/lib/services/workspace'

/**
 * The Job Preferences view: one card per question, each with its pencil.
 *
 * ⚠️ WHAT MOVES YOUR LIST AND WHAT DOES NOT. Role, skills, city, years and the pay floor feed the scorer or the
 * location gate. The rest — what you value, company size, industries, skills to avoid, employment type, companies to
 * hide — are saved with the profile for you and for application forms, and narrow nothing. The page says so once, at
 * the top, rather than letting a candidate believe an answer here is hiding jobs from them.
 */
export type PreferencesData = {
  extras: Extras
  prefs: Preferences
  workMode: 'remote' | 'hybrid' | 'onsite' | 'no_preference'
  primaryRole: string
  extraRoles: string[]
  skills: string[]
  favourites: string[]
  keywords: string[]
  status: SearchStatus
  city: string
}

const LEVELS: { key: Seniority; label: string }[] = [
  { key: 'entry', label: 'Entry level (0 to 2 years)' }, { key: 'mid', label: 'Mid level (2 to 5 years)' }, { key: 'senior', label: 'Senior (5 to 9 years)' },
  { key: 'lead', label: 'Lead / Staff (9 to 15 years)' }, { key: 'executive', label: 'Executive (15+ years)' },
]
const MODES: { key: PreferencesData['workMode']; label: string }[] = [
  { key: 'remote', label: 'Remote' }, { key: 'hybrid', label: 'Hybrid' }, { key: 'onsite', label: 'On-site' }, { key: 'no_preference', label: 'No preference' },
]
const STATUSES: { key: SearchStatus; label: string; note: string }[] = [
  { key: 'active', label: 'Actively looking', note: 'Applying now' },
  { key: 'open', label: 'Open to offers', note: 'Employed, happy to hear about the right role' },
  { key: 'closed', label: 'Not looking', note: 'Pausing the search' },
]

type Panel = null | 'keywords' | 'roles' | 'where' | 'type' | 'skills' | 'salary' | 'status'

export function ProfilePreferences({ data }: { data: PreferencesData }) {
  const [panel, setPanel] = useState<Panel>(null)
  const x = data.extras
  const none = <p className="mt-4 text-sm text-muted-foreground">-</p>
  const chips = (items: readonly string[]) => (items.length ? <ul className="mt-4 flex flex-wrap gap-2">{items.map((i) => <li key={i}><Chip>{i}</Chip></li>)}</ul> : none)
  const level = LEVELS.find((l) => l.key === data.prefs.seniority)?.label
  const mode = MODES.find((m) => m.key === data.workMode && m.key !== 'no_preference')?.label
  const salary = data.prefs.salaryMin
    ? `At least ${data.prefs.salaryCurrency === 'INR' ? '₹' : data.prefs.salaryCurrency === 'USD' ? '$' : '€'}${data.prefs.salaryMin.toLocaleString(data.prefs.salaryCurrency === 'INR' ? 'en-IN' : 'en-US')} a year`
    : ''

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-border bg-secondary/40 px-5 py-3.5 text-sm text-muted-foreground">
        <span className="font-semibold text-primary">What changes your list:</span> your target role, skills, city, years of experience and pay floor.
        Everything else here is saved with your profile for you and for application forms — it never hides a job from you.
      </p>
      {!data.prefs.stored ? (
        <p role="note" className="rounded-2xl border border-score-mid/40 bg-score-mid/10 px-5 py-3 text-sm text-primary">Level, other cities and the pay floor need a database update that has not been applied yet, so they will not save until it is.</p>
      ) : null}

      <ExtrasQuestion title="What do you value in a new role?" hint="Select up to 3" icon={<Heart className="size-5" />} field="values" mode="pick" options={VALUE_OPTIONS} max={3} value={x.values} />

      <ProfileCard title="What kinds of roles are you interested in?" action={<EditButton label="Edit roles" onClick={() => setPanel('roles')} />}>
        <p className="mt-3 text-sm text-muted-foreground">The first is your main target; it decides which jobs you are scored against.</p>
        {chips([data.primaryRole, ...data.extraRoles].filter(Boolean))}
      </ProfileCard>

      <ProfileCard title="Where would you like to work?" action={<EditButton label="Edit locations" onClick={() => setPanel('where')} />}>
        {chips([data.city, ...data.prefs.targetCities, ...(mode ? [mode] : [])].filter(Boolean))}
      </ProfileCard>

      <ProfileCard title="What type of roles are you looking for?" action={<EditButton label="Edit role type and level" onClick={() => setPanel('type')} />}>
        <p className="mt-4 text-sm text-muted-foreground">What type of roles are you looking for?</p>
        {chips(x.employmentTypes)}
        <p className="mt-5 text-sm text-muted-foreground">What level of roles are you looking for?</p>
        {chips(level ? [level] : [])}
      </ProfileCard>

      <ExtrasQuestion title="What is your ideal company size?" icon={<Building2 className="size-5" />} field="companySizes" mode="pick" options={COMPANY_SIZES} max={8} value={x.companySizes} />
      <ExtrasQuestion title="What industries are exciting to you?" icon={<Compass className="size-5" />} field="industriesLike" mode="chips" options={INDUSTRIES} max={10} value={x.industriesLike} placeholder="Add an industry" />
      <ExtrasQuestion title="Are there any industries you don't want to work in?" icon={<Compass className="size-5" />} field="industriesAvoid" mode="chips" options={INDUSTRIES} max={10} value={x.industriesAvoid} placeholder="Add an industry" />

      <ProfileCard title="What skills do you have or enjoy working with?" action={<EditButton label="Edit skills" onClick={() => setPanel('skills')} />}>
        <p className="mt-3 flex items-center gap-1.5 text-sm text-primary">Skills that you&rsquo;d prefer to utilize in roles are highlighted with a heart <Heart className="size-4 fill-accent text-accent" aria-hidden="true" /></p>
        {data.skills.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.skills.map((s) => <li key={s}><Chip><Heart className={`size-3.5 ${data.favourites.includes(s) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} aria-hidden="true" />{s}</Chip></li>)}
          </ul>
        ) : none}
      </ProfileCard>

      <ProfileCard title="What words matter to you?" action={<EditButton label="Edit keywords" onClick={() => setPanel('keywords')} />}>
        <p className="mt-3 text-sm text-muted-foreground">A product area, an industry, a tool. A job that names them ranks higher — nothing is hidden, and a job matching none still appears.</p>
        {chips(data.keywords)}
      </ProfileCard>

      <ExtrasQuestion title="Are there any skills you don't want to work with?" icon={<Zap className="size-5" />} field="skillsAvoid" mode="chips" options={[]} max={20} value={x.skillsAvoid} placeholder="Add a skill" />

      <ProfileCard title="What is your minimum expected salary?" action={<EditButton label="Edit salary" onClick={() => setPanel('salary')} />}>
        <p className="mt-3 text-sm text-muted-foreground">We use this only to match you with jobs and never share it.</p>
        {chips(salary ? [salary] : [])}
      </ProfileCard>

      <ProfileCard title="What's the status of your job search?" action={<EditButton label="Edit job search status" onClick={() => setPanel('status')} />}>
        {chips([STATUSES.find((s) => s.key === data.status)?.label ?? ''].filter(Boolean))}
      </ProfileCard>

      <ExtrasQuestion title="What companies do you want to hide from your job search?" icon={<Briefcase className="size-5" />} field="hiddenCompanies" mode="chips" options={[]} max={30} value={x.hiddenCompanies} placeholder="Add a company"
        note="Saved with your profile. Hiding a company from your feed is not switched on yet — until it is, use Hide on a job card." />

      {panel === 'keywords' ? <KeywordsDrawer keywords={data.keywords} onClose={() => setPanel(null)} /> : null}
      {panel === 'roles' ? <RolesDrawer primary={data.primaryRole} extras={data.extraRoles} onClose={() => setPanel(null)} /> : null}
      {panel === 'where' ? <WhereDrawer data={data} onClose={() => setPanel(null)} /> : null}
      {panel === 'type' ? <TypeDrawer data={data} onClose={() => setPanel(null)} /> : null}
      {panel === 'skills' ? <SkillsDrawer skills={data.skills} favourites={data.favourites} onClose={() => setPanel(null)} /> : null}
      {panel === 'salary' ? <SalaryDrawer data={data} onClose={() => setPanel(null)} /> : null}
      {panel === 'status' ? <StatusDrawer status={data.status} onClose={() => setPanel(null)} /> : null}
    </div>
  )
}

/** A question whose answer is a list kept in the extras column. */
function ExtrasQuestion({ title, hint, icon, field, mode, options, max, value, placeholder = '', note }: {
  title: string
  hint?: string
  icon: ReactNode
  field: 'values' | 'companySizes' | 'industriesLike' | 'industriesAvoid' | 'skillsAvoid' | 'hiddenCompanies'
  mode: 'pick' | 'chips'
  options: readonly string[]
  max: number
  value: string[]
  placeholder?: string
  note?: string
}) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState(value)
  return (
    <ProfileCard title={title} action={<EditButton label={`Edit: ${title}`} onClick={() => { setList(value); setOpen(true) }} />}>
      {hint ? <p className="mt-3 text-sm text-muted-foreground">{hint}</p> : null}
      {value.length ? <ul className="mt-4 flex flex-wrap gap-2">{value.map((i) => <li key={i}><Chip>{i}</Chip></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">-</p>}
      {open ? (
        <EditDrawer
          open onOpenChange={setOpen} title="Edit Preference" icon={icon}
          onSave={async () => { const r = await saveProfileExtras({ [field]: list }); return r.ok ? null : r.error }}
          note={<div><p className="text-base font-semibold text-primary">{title}</p>{note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}</div>}
        >
          {mode === 'pick'
            ? <PickEditor options={options} value={list} onChange={setList} max={max} />
            : <ChipEditor label={title} value={list} onChange={setList} max={max} placeholder={placeholder} suggestions={options} />}
        </EditDrawer>
      ) : null}
    </ProfileCard>
  )
}

function KeywordsDrawer({ keywords, onClose }: { keywords: string[]; onClose: () => void }) {
  const [list, setList] = useState(keywords)
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Keywords" icon={<Heart className="size-5" />}
      onSave={async () => { const r = await saveProfileKeywords({ keywords: list }); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Saving re-ranks your list so jobs that name these words come first. It never hides a job.</p>}
    >
      <ChipEditor label="Keywords" value={list} onChange={setList} max={20} placeholder="payments, fintech, B2B SaaS… then press Enter" />
    </EditDrawer>
  )
}

function RolesDrawer({ primary, extras, onClose }: { primary: string; extras: string[]; onClose: () => void }) {
  const [roles, setRoles] = useState([primary, ...extras].filter(Boolean))
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Roles" icon={<Target className="size-5" />}
      onSave={async () => { const r = await saveProfileRoles(splitRoles(roles)); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Choose up to five roles. The first is your main one and decides which jobs you are scored against; saving rebuilds your matches.</p>}
    >
      <RolesEditor roles={roles} onChange={setRoles} />
    </EditDrawer>
  )
}

/** The pay floor, level and work mode all travel in one savePreferences call, which writes them together. */
function prefsInput(data: PreferencesData, over: Partial<{ seniority: Seniority | null; targetCities: string[]; salaryMin: number | null; salaryCurrency: Currency; workMode: PreferencesData['workMode'] }>) {
  return {
    seniority: data.prefs.seniority, targetCities: data.prefs.targetCities, salaryMin: data.prefs.salaryMin,
    salaryCurrency: data.prefs.salaryCurrency, workMode: data.workMode, ...over,
  }
}

function WhereDrawer({ data, onClose }: { data: PreferencesData; onClose: () => void }) {
  const [cities, setCities] = useState(data.prefs.targetCities)
  const [mode, setMode] = useState(data.workMode)
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Locations" icon={<MapPin className="size-5" />}
      onSave={async () => { const r = await savePreferences(prefsInput(data, { targetCities: cities, workMode: mode })); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Your home city ({data.city || 'not set'}) is edited under Personal Info. These are the other places you would work.</p>}
    >
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">Other cities you would work in</p>
        <ChipEditor label="Cities" value={cities} onChange={setCities} max={6} placeholder="Add a city, then press Enter" />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">How do you want to work?</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => setMode(m.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${mode === m.key ? 'border-accent bg-accent/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}>{m.label}</button>
          ))}
        </div>
      </div>
    </EditDrawer>
  )
}

function TypeDrawer({ data, onClose }: { data: PreferencesData; onClose: () => void }) {
  const [types, setTypes] = useState(data.extras.employmentTypes)
  const [level, setLevel] = useState<Seniority | null>(data.prefs.seniority)
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Role Type" icon={<SlidersHorizontal className="size-5" />}
      onSave={async () => {
        const a = await saveProfileExtras({ employmentTypes: types })
        if (!a.ok) return a.error
        const b = await savePreferences(prefsInput(data, { seniority: level }))
        return b.ok ? null : b.error
      }}
    >
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">What type of roles are you looking for?</p>
        <PickEditor options={EMPLOYMENT_TYPES} value={types} onChange={setTypes} max={5} />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-primary">What level of roles are you looking for?</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button key={l.key} type="button" aria-pressed={level === l.key} onClick={() => setLevel(level === l.key ? null : l.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${level === l.key ? 'border-accent bg-accent/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}>{l.label}</button>
          ))}
        </div>
      </div>
    </EditDrawer>
  )
}

function SalaryDrawer({ data, onClose }: { data: PreferencesData; onClose: () => void }) {
  const [currency, setCurrency] = useState<Currency>(data.prefs.salaryCurrency)
  const [amount, setAmount] = useState(data.prefs.salaryMin ? String(data.prefs.salaryMin) : '')
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Salary" icon={<Wallet className="size-5" />}
      onSave={async () => {
        const n = Number(amount.replace(/[^0-9]/g, ''))
        const r = await savePreferences(prefsInput(data, { salaryCurrency: currency, salaryMin: amount.trim() && Number.isFinite(n) ? n : null }))
        return r.ok ? null : r.error
      }}
    >
      <Field label="Minimum expected salary (a year)">
        <div className="flex gap-2">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} aria-label="Currency" className={`${inputClass} w-28`}>
            {(['INR', 'USD', 'EUR'] as const).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="e.g. 1500000" className={inputClass} />
        </div>
      </Field>
      <Label>Leave it empty to see every job, whatever it pays.</Label>
    </EditDrawer>
  )
}

function StatusDrawer({ status, onClose }: { status: SearchStatus; onClose: () => void }) {
  const [v, setV] = useState(status)
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Job Search Status" icon={<Compass className="size-5" />}
      onSave={async () => { const r = await setSearchStatus({ status: v }); return r.ok ? null : r.error }}
    >
      <div className="space-y-3" role="radiogroup" aria-label="Job search status">
        {STATUSES.map((s) => (
          <button key={s.key} type="button" role="radio" aria-checked={v === s.key} onClick={() => setV(s.key)}
            className={`block w-full rounded-xl border px-4 py-3 text-left ${v === s.key ? 'border-accent bg-accent/10' : 'border-border hover:bg-secondary/60'}`}>
            <span className="block text-sm font-semibold text-primary">{s.label}</span>
            <span className="block text-xs text-muted-foreground">{s.note}</span>
          </button>
        ))}
      </div>
    </EditDrawer>
  )
}
