'use client'

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, EyeOff, FileText, FolderGit2, GraduationCap, Globe, Heart, Languages, Link2, Search, Users, Zap } from 'lucide-react'
import { deleteProfileEntry, saveProfileExtras, saveProfileLinks, saveProfileSkills } from '@/app/actions/profile-cards'
import { EntryDrawer, type EntryInitial } from '@/components/features/profile-entry-drawer'
import {
  AddButton, Chip, ChipEditor, DeleteButton, EditButton, EditDrawer, Field, Label, ProfileCard, Value, inputClass,
} from '@/components/features/profile-ui'
import { formatRange, parseDates, type EducationItem, type EntryKind, type ExperienceItem } from '@/lib/profile-entries'
import { LANGUAGE_SUGGESTIONS } from '@/lib/profile-extras'

/**
 * The Profile view: the cards the reference product's profile page has, in its order — extension prompt, autofill row,
 * résumé, cover letters and templates, work experience, education, projects, links, skills, languages. Each card has its
 * pencil or plus, and each opens the right-hand panel (profile-ui.tsx).
 */
export type ProfileMainData = {
  resume: { id: string; label: string; updatedAt: string; isPrimary: boolean } | null
  experience: ExperienceItem[]
  projects: ExperienceItem[]
  education: EducationItem[]
  links: { linkedin: string; portfolio: string; github: string; other: string }
  skills: string[]
  favourites: string[]
  languages: string[]
  answersCount: number
  extrasStored: boolean
}

type Edit = { kind: EntryKind; index: number | null; initial: EntryInitial; key: string }

const tile = 'inline-flex size-[52px] shrink-0 items-center justify-center rounded-xl bg-secondary text-accent'
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

export function ProfileMain({ data, networkPanel, answersPanel }: { data: ProfileMainData; networkPanel: ReactNode; answersPanel: ReactNode }) {
  const router = useRouter()
  const [edit, setEdit] = useState<Edit | null>(null)
  const opened = useRef(0)
  const [panel, setPanel] = useState<null | 'links' | 'skills' | 'languages' | 'network' | 'answers'>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function remove(kind: EntryKind, index: number, what: string) {
    if (!window.confirm(`Remove ${what} from your profile and your main résumé?`)) return
    setDeleting(`${kind}-${index}`); setError(null)
    const r = await deleteProfileEntry({ kind, index }).catch(() => ({ ok: false as const, error: 'We could not remove that just now.' }))
    setDeleting(null)
    if (!r.ok) setError(r.error)
    router.refresh()
  }

  const open = (kind: EntryKind, index: number | null, initial: EntryInitial) => setEdit({ kind, index, initial, key: `${kind}-${index}-${++opened.current}` })

  const jobRow = (e: ExperienceItem, kind: 'experience' | 'project') => {
    const range = formatRange(parseDates(e.dates)) || e.dates || ''
    return (
      <li key={e.index} className="flex gap-4">
        <span className={tile} aria-hidden="true">{kind === 'project' ? <FolderGit2 className="size-6" /> : <Briefcase className="size-6" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-primary">{e.title}</h3>
              {e.employer ? <p className="text-base font-semibold text-muted-foreground">{e.employer}</p> : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <EditButton label={`Edit ${e.title ?? 'entry'}`} onClick={() => open(kind, e.index, { title: e.title, employer: e.employer, location: e.location, employmentType: e.employmentType, summary: e.summary, dates: e.dates, bullets: e.bullets })} />
              <DeleteButton label={`Remove ${e.title ?? 'entry'}`} disabled={deleting === `${kind}-${e.index}`} onClick={() => remove(kind, e.index, e.title ?? 'this entry')} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {[e.location, range, e.employmentType].filter(Boolean).map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
          {e.summary ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{e.summary}</p> : null}
          {e.bullets.length ? (
            <ul className="mt-4 space-y-1 text-sm leading-6 text-primary">
              {e.bullets.map((b, i) => <li key={i} className="flex gap-2"><span aria-hidden="true">●</span><span className="min-w-0">{b}</span></li>)}
            </ul>
          ) : null}
        </div>
      </li>
    )
  }

  const empty = (text: string) => <p className="mt-5 text-sm text-muted-foreground">{text}</p>

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-primary">Your Jobinko profile fills in your job applications</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Search className="size-4 text-accent" aria-hidden="true" /> Show profile to recruiters</p>
              <span role="switch" aria-checked="false" aria-disabled="true" aria-label="Show profile to recruiters: off, not available yet" className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-muted opacity-70">
                <span className="ml-0.5 size-5 rounded-full bg-card shadow" />
              </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><EyeOff className="size-4" aria-hidden="true" /> Hidden from every employer — nobody can find you here.</p>
            <p className="mt-2 text-xs text-muted-foreground">Recruiter discovery is not switched on. When it is, it will be off until you turn it on, and your current employer will never see you.</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Users className="size-4 text-accent" aria-hidden="true" /> Get more referrals!</p>
              <button type="button" onClick={() => setPanel('network')} className="bg-brand-gradient rounded-full px-4 py-1.5 text-sm font-semibold">Set-Up Network</button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">See who you already know at the companies you apply to, from your own LinkedIn or contacts export.</p>
          </div>
        </div>
      </section>

      <ProfileCard title="Resume" action={<EditButton label="Manage résumés" onClick={() => router.push('/resume')} />}>
        {data.resume ? (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className={tile} aria-hidden="true"><FileText className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <span className="truncate">{data.resume.label}</span>
                {data.resume.isPrimary ? <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Default</span> : null}
              </p>
              <p className="text-sm text-muted-foreground">Last updated: {day(data.resume.updatedAt)}</p>
            </div>
            <Link href={`/resume/edit/${data.resume.id}`} className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-semibold">Preview Resume</Link>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className={tile} aria-hidden="true"><FileText className="size-6" /></span>
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">No résumé saved yet. Add one and your experience and education fill in below.</p>
            <Link href="/resume" className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-semibold">Add résumé</Link>
          </div>
        )}
      </ProfileCard>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4"><h2 className="text-lg font-semibold tracking-[-0.02em] text-primary">Cover Letter</h2></div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span className={`${tile} text-brand-2`} aria-hidden="true"><FileText className="size-6" /></span>
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">Write one for any job, from your résumé and the posting.</p>
          <Link href="/cover-letter" className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-semibold">Create Cover Letter</Link>
        </div>
        <div className="mt-8 flex items-start justify-between gap-4"><h2 className="text-lg font-semibold tracking-[-0.02em] text-primary">Templates</h2></div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <span className={`${tile} text-score-mid`} aria-hidden="true"><Zap className="size-6" /></span>
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">{data.answersCount} saved {data.answersCount === 1 ? 'answer' : 'answers'} for the questions forms keep asking.</p>
          <button type="button" onClick={() => setPanel('answers')} className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-semibold">Manage answers</button>
        </div>
      </section>

      <ProfileCard title="Work Experience" id="experience" action={<AddButton label="Add work experience" onClick={() => open('experience', null, {})} />}>
        {data.experience.length ? <ul className="mt-5 space-y-8">{data.experience.map((e) => jobRow(e, 'experience'))}</ul> : empty('No work experience added')}
      </ProfileCard>

      <ProfileCard title="Education" action={<AddButton label="Add education" onClick={() => open('education', null, {})} />}>
        {data.education.length ? (
          <ul className="mt-5 space-y-6">
            {data.education.map((e) => {
              const range = formatRange(parseDates(e.dates)) || e.dates || ''
              return (
                <li key={e.index} className="flex gap-4">
                  <span className={tile} aria-hidden="true"><GraduationCap className="size-6" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-primary">{e.institution ?? e.qualification}</h3>
                      <div className="flex shrink-0 gap-2">
                        <EditButton label={`Edit ${e.institution ?? 'education'}`} onClick={() => open('education', e.index, { institution: e.institution, qualification: e.qualification, major: e.major, gpa: e.gpa, dates: e.dates })} />
                        <DeleteButton label={`Remove ${e.institution ?? 'education'}`} disabled={deleting === `education-${e.index}`} onClick={() => remove('education', e.index, e.institution ?? 'this school')} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[range, e.institution ? e.qualification : '', e.gpa ? `GPA ${e.gpa}` : ''].filter(Boolean).map((t) => <Chip key={t}>{t}</Chip>)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : empty('No education added')}
      </ProfileCard>

      <ProfileCard title="Projects & Outside Experience" action={<AddButton label="Add a project" onClick={() => open('project', null, {})} />}>
        {data.projects.length ? <ul className="mt-5 space-y-8">{data.projects.map((e) => jobRow(e, 'project'))}</ul> : empty('No projects added')}
      </ProfileCard>

      <ProfileCard title="Portfolio & Links" action={<EditButton label="Edit links" onClick={() => setPanel('links')} />}>
        <dl className="mt-5 grid gap-6 sm:grid-cols-2">
          {([
            ['LinkedIn URL', data.links.linkedin, <span key="i" className="text-lg font-bold">in</span>],
            ['GitHub URL', data.links.github, <FolderGit2 key="i" className="size-6" />],
            ['Portfolio URL', data.links.portfolio, <Globe key="i" className="size-6" />],
            ['Other URL', data.links.other, <Link2 key="i" className="size-6" />],
          ] as const).map(([label, value, icon]) => (
            <div key={label} className="flex gap-4">
              <span className={tile} aria-hidden="true">{icon}</span>
              <div className="min-w-0">
                <dt><Label>{label}</Label></dt>
                <dd>{value ? <a href={/^https?:\/\//i.test(value) ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-accent hover:underline">{value}</a> : <Value />}</dd>
              </div>
            </div>
          ))}
        </dl>
      </ProfileCard>

      <ProfileCard title="Skills" action={<EditButton label="Edit skills" onClick={() => setPanel('skills')} />}>
        <p className="mt-4 flex items-center gap-1.5 text-sm text-primary">Skills that you&rsquo;d prefer to utilize in roles are highlighted with a heart <Heart className="size-4 fill-accent text-accent" aria-hidden="true" /></p>
        {data.skills.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {data.skills.map((s) => <li key={s}><Chip><Heart className={`size-3.5 ${data.favourites.includes(s) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} aria-label={data.favourites.includes(s) ? 'Preferred' : undefined} />{s}</Chip></li>)}
          </ul>
        ) : empty('No skills added')}
      </ProfileCard>

      <ProfileCard title="Languages" action={<EditButton label="Edit languages" onClick={() => setPanel('languages')} />}>
        {data.languages.length ? <ul className="mt-5 flex flex-wrap gap-2">{data.languages.map((l) => <li key={l}><Chip><Languages className="size-3.5 text-muted-foreground" aria-hidden="true" />{l}</Chip></li>)}</ul> : empty('No items added')}
      </ProfileCard>

      {edit ? <EntryDrawer key={edit.key} kind={edit.kind} index={edit.index} initial={edit.initial} onClose={() => setEdit(null)} /> : null}
      {panel === 'links' ? <LinksDrawer links={data.links} onClose={() => setPanel(null)} /> : null}
      {panel === 'skills' ? <SkillsDrawer skills={data.skills} favourites={data.favourites} onClose={() => setPanel(null)} /> : null}
      {panel === 'languages' ? <LanguagesDrawer languages={data.languages} onClose={() => setPanel(null)} /> : null}
      {panel === 'network' ? <InfoDrawer title="Set up your network" icon={<Users className="size-5" />} onClose={() => setPanel(null)}>{networkPanel}</InfoDrawer> : null}
      {panel === 'answers' ? <InfoDrawer title="Saved answers" icon={<Zap className="size-5" />} onClose={() => setPanel(null)}>{answersPanel}</InfoDrawer> : null}
    </div>
  )
}

/** A panel whose content saves itself (the network and saved-answers tools have their own Save). */
function InfoDrawer({ title, icon, onClose, children }: { title: string; icon: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <EditDrawer open onOpenChange={(o) => { if (!o) onClose() }} title={title} icon={icon} onSave={async () => null} saveLabel="Done">
      {children}
    </EditDrawer>
  )
}

function LinksDrawer({ links, onClose }: { links: ProfileMainData['links']; onClose: () => void }) {
  const [v, setV] = useState(links)
  const bare = (s: string, prefix: RegExp) => s.replace(prefix, '')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Portfolio" icon={<Link2 className="size-5" />}
      onSave={async () => {
        const full = (s: string, base: string) => { const t = s.trim(); return !t ? '' : /^https?:\/\//i.test(t) ? t : `${base}${bare(t, /^\/+/)}` }
        const r = await saveProfileLinks({
          linkedinUrl: full(v.linkedin, 'https://www.linkedin.com/in/'), githubUrl: full(v.github, 'https://github.com/'),
          portfolioUrl: full(v.portfolio, 'https://'), otherUrl: full(v.other, 'https://'),
        })
        return r.ok ? null : r.error
      }}
    >
      <Field label="LinkedIn URL" hint="Your profile link, or just your handle"><input value={v.linkedin} onChange={set('linkedin')} className={inputClass} placeholder="https://www.linkedin.com/in/…" /></Field>
      <Field label="GitHub URL"><input value={v.github} onChange={set('github')} className={inputClass} placeholder="https://github.com/…" /></Field>
      <Field label="Portfolio URL"><input value={v.portfolio} onChange={set('portfolio')} className={inputClass} placeholder="https://…" /></Field>
      <Field label="Other URL"><input value={v.other} onChange={set('other')} className={inputClass} placeholder="https://…" /></Field>
    </EditDrawer>
  )
}

export function SkillsDrawer({ skills, favourites, onClose }: { skills: string[]; favourites: string[]; onClose: () => void }) {
  const [list, setList] = useState(skills)
  const [hearts, setHearts] = useState(favourites)
  const toggle = (s: string) => setHearts((h) => (h.includes(s) ? h.filter((x) => x !== s) : [...h, s]))
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Skills" icon={<Zap className="size-5" />}
      onSave={async () => { const r = await saveProfileSkills({ skills: list, favourites: hearts.filter((h) => list.includes(h)) }); return r.ok ? null : r.error }}
      note={<p className="rounded-xl border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">Skills decide which jobs you are scored against, so saving rebuilds your matches. A hearted skill counts for extra when jobs are ranked — it never hides a job.</p>}
    >
      <ChipEditor label="Skills" value={list} onChange={setList} max={40} placeholder="Add a skill, then press Enter" />
      {list.length ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-primary">Heart the skills you want to use in your next role</p>
          <ul className="flex flex-wrap gap-2">
            {list.map((s) => (
              <li key={s}>
                <button type="button" aria-pressed={hearts.includes(s)} onClick={() => toggle(s)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm ${hearts.includes(s) ? 'border-accent bg-accent/10 font-semibold text-primary' : 'border-border text-muted-foreground hover:text-primary'}`}>
                  <Heart className={`size-3.5 ${hearts.includes(s) ? 'fill-accent text-accent' : ''}`} aria-hidden="true" /> {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </EditDrawer>
  )
}

function LanguagesDrawer({ languages, onClose }: { languages: string[]; onClose: () => void }) {
  const [list, setList] = useState(languages)
  return (
    <EditDrawer
      open onOpenChange={(o) => { if (!o) onClose() }} title="Edit Languages" icon={<Languages className="size-5" />}
      onSave={async () => { const r = await saveProfileExtras({ languages: list }); return r.ok ? null : r.error }}
    >
      <ChipEditor label="Languages" value={list} onChange={setList} max={12} placeholder="Add a language, then press Enter" suggestions={LANGUAGE_SUGGESTIONS} />
    </EditDrawer>
  )
}
