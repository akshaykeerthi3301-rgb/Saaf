'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileDown, Loader2, Plus, ScanSearch, Star, Trash2, X } from 'lucide-react'
import { Modal, ModalClose, ModalTitle } from '@/components/ui/modal'
import { Sheet, SheetClose, SheetTitle } from '@/components/ui/sheet'
import { ExportDrawer } from '@/components/features/export-drawer'
import { Gauge } from '@/components/features/score-gauge'
import { deleteSavedResume, updateSavedResume } from '@/app/actions/resume-documents'
import { downloadWordFile } from '@/lib/download-word'
import { checkResume, AtsCheckError } from '@/lib/ats-check'
import { sectionsToText, type EducationEntry, type ExperienceEntry, type ResumeSections } from '@/lib/parse/sections'
import { DEFAULT_STYLE, type ResumeStyle } from '@/lib/resume-style'

/**
 * One saved résumé, open for editing — the reference product's /jobs/resume/edit: contact details, summary, experience,
 * projects, education and skills, each editable in place, with Export, Analyze and Delete in the bar.
 *
 * It edits the document the rest of the product reads (ResumeSections), so a change here is what "Customize your
 * résumé" starts from, what the Word and PDF exports print and what the ATS score is computed over. Saving is explicit
 * and says so; leaving with unsaved changes asks first.
 */

const input = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary outline-none placeholder:text-muted-foreground focus:border-accent'
const area = `${input} resize-y leading-6`

const blankJob = (isProject: boolean): ExperienceEntry => ({ title: '', employer: '', dates: null, location: null, bullets: [''], isProject })
const blankSchool = (): EducationEntry => ({ qualification: '', institution: null, dates: null })
const orNull = (v: string) => (v.trim() === '' ? null : v)
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, '').trim() || 'resume'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-primary">{title}</h2>
        {action}
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

const addButton = 'inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-accent/60'

export function ResumeEditor({ id, label: initialLabel, targetRole, initial, primary, openExport = false }: {
  id: string
  label: string
  targetRole: string | null
  initial: ResumeSections
  primary: boolean
  openExport?: boolean
}) {
  const router = useRouter()
  const [sections, setSections] = useState(initial)
  const [label, setLabel] = useState(initialLabel)
  const [saved, setSaved] = useState(() => JSON.stringify({ initial, initialLabel }))
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState<string>()
  const [saving, startSave] = useTransition()
  const [exporting, startExport] = useTransition()
  const [exportOpen, setExportOpen] = useState(openExport)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [style, setStyle] = useState<ResumeStyle>(DEFAULT_STYLE)

  const dirty = JSON.stringify({ initial: sections, initialLabel: label }) !== saved

  // Unsaved changes are never lost silently.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function save() {
    setNote(undefined)
    startSave(async () => {
      const r = await updateSavedResume({ id, sections, label: label.trim() || undefined }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      setSaved(JSON.stringify({ initial: sections, initialLabel: label }))
      setScore(r.score)
      setNote(r.score !== null ? `Saved. ATS score ${(r.score / 10).toFixed(1)} out of 10.` : 'Saved.')
    })
  }

  function word() {
    setNote(undefined)
    startExport(async () => {
      const r = await downloadWordFile({ sections, targetRole: targetRole ?? '', style }, safeName(label))
      if (!r.ok) setNote(r.error)
    })
  }

  async function remove() {
    const r = await deleteSavedResume({ id })
    if (!r.ok) { setNote(r.error); setConfirmDelete(false); return }
    router.push('/resume')
    router.refresh()
  }

  // ---- edits -----------------------------------------------------------------------------------------------------
  const set = (patch: Partial<ResumeSections>) => setSections((s) => ({ ...s, ...patch }))
  const setContact = (patch: Partial<ResumeSections['contact']>) => setSections((s) => ({ ...s, contact: { ...s.contact, ...patch } }))
  const setJob = (i: number, patch: Partial<ExperienceEntry>) => set({ experience: sections.experience.map((e, k) => (k === i ? { ...e, ...patch } : e)) })
  const setSchool = (i: number, patch: Partial<EducationEntry>) => set({ education: sections.education.map((e, k) => (k === i ? { ...e, ...patch } : e)) })

  const jobs = sections.experience.map((e, i) => ({ e, i })).filter(({ e }) => !e.isProject)
  const projects = sections.experience.map((e, i) => ({ e, i })).filter(({ e }) => e.isProject)

  const entryBlock = ({ e, i }: { e: ExperienceEntry; i: number }) => (
    <div key={i} className="rounded-xl border border-border bg-background/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={e.isProject ? 'Project name' : 'Job title'}><input className={input} value={e.title ?? ''} onChange={(ev) => setJob(i, { title: orNull(ev.target.value) })} /></Field>
        <Field label={e.isProject ? 'Role or stack' : 'Company'}><input className={input} value={e.employer ?? ''} onChange={(ev) => setJob(i, { employer: orNull(ev.target.value) })} /></Field>
        <Field label="Dates"><input className={input} value={e.dates ?? ''} placeholder="Jun 2023 – Present" onChange={(ev) => setJob(i, { dates: orNull(ev.target.value) })} /></Field>
        <Field label="Location"><input className={input} value={e.location ?? ''} onChange={(ev) => setJob(i, { location: orNull(ev.target.value) })} /></Field>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Bullet points</p>
        {e.bullets.map((b, j) => (
          <div key={j} className="flex items-start gap-2">
            <textarea
              aria-label={`Bullet ${j + 1}`}
              rows={2}
              className={area}
              value={b}
              onChange={(ev) => setJob(i, { bullets: e.bullets.map((x, m) => (m === j ? ev.target.value : x)) })}
            />
            <button type="button" aria-label="Remove this bullet" onClick={() => setJob(i, { bullets: e.bullets.filter((_, m) => m !== j) })} className="mt-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><X className="size-4" /></button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setJob(i, { bullets: [...e.bullets, ''] })} className={addButton}><Plus className="size-3.5" /> Add a bullet</button>
          <button type="button" onClick={() => set({ experience: sections.experience.filter((_, k) => k !== i) })} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /> Remove this {e.isProject ? 'project' : 'role'}</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-5 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <Link href="/resume" aria-label="Back to your résumés" className="rounded-xl border border-border p-2 text-primary hover:bg-secondary"><X className="size-4" /></Link>
        <label className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          {primary ? <Star className="size-3.5 shrink-0 text-score-high" aria-label="Primary résumé" /> : null}
          <input aria-label="Résumé name" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-primary outline-none" />
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setAnalysisOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent/60"><ScanSearch className="size-3.5" /> Analyze</button>
          <button type="button" onClick={() => setExportOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent/60"><FileDown className="size-3.5" /> Export</button>
          <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /> Delete</button>
          <button type="button" onClick={save} disabled={!dirty || saving} className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 pb-24 pt-6">
        <p role="status" className="min-h-5 text-xs text-muted-foreground">
          {note ?? (dirty ? 'You have unsaved changes.' : score !== null ? `ATS score ${(score / 10).toFixed(1)} out of 10.` : '')}
        </p>

        <Section title="Contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><input className={input} value={sections.contact.name ?? ''} onChange={(e) => setContact({ name: orNull(e.target.value) })} /></Field>
            <Field label="Email"><input className={input} type="email" value={sections.contact.email ?? ''} onChange={(e) => setContact({ email: orNull(e.target.value) })} /></Field>
            <Field label="Phone"><input className={input} value={sections.contact.phone ?? ''} onChange={(e) => setContact({ phone: orNull(e.target.value) })} /></Field>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Links — use the full address so it is clickable</p>
            {sections.contact.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={`Link ${i + 1}`} className={input} value={l} onChange={(e) => setContact({ links: sections.contact.links.map((x, k) => (k === i ? e.target.value : x)) })} />
                <button type="button" aria-label="Remove this link" onClick={() => setContact({ links: sections.contact.links.filter((_, k) => k !== i) })} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary"><X className="size-4" /></button>
              </div>
            ))}
            {sections.contact.links.length < 6 ? <button type="button" onClick={() => setContact({ links: [...sections.contact.links, ''] })} className={addButton}><Plus className="size-3.5" /> Add a link</button> : null}
          </div>
        </Section>

        <Section title="Summary">
          <textarea aria-label="Summary" rows={5} className={area} value={sections.summary ?? ''} onChange={(e) => set({ summary: orNull(e.target.value) })} placeholder="Two or three sentences on what you do, the strongest result you can name, and what you want next." />
        </Section>

        <Section title="Experience" action={<button type="button" onClick={() => set({ experience: [...sections.experience, blankJob(false)] })} className={addButton}><Plus className="size-3.5" /> Add a role</button>}>
          {jobs.length ? jobs.map(entryBlock) : <p className="text-sm text-muted-foreground">No roles yet.</p>}
        </Section>

        <Section title="Projects" action={<button type="button" onClick={() => set({ experience: [...sections.experience, blankJob(true)] })} className={addButton}><Plus className="size-3.5" /> Add a project</button>}>
          {projects.length ? projects.map(entryBlock) : <p className="text-sm text-muted-foreground">No projects.</p>}
        </Section>

        <Section title="Education" action={<button type="button" onClick={() => set({ education: [...sections.education, blankSchool()] })} className={addButton}><Plus className="size-3.5" /> Add education</button>}>
          {sections.education.length ? sections.education.map((e, i) => (
            <div key={i} className="rounded-xl border border-border bg-background/50 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Degree"><input className={input} value={e.qualification} onChange={(ev) => setSchool(i, { qualification: ev.target.value })} /></Field>
                <Field label="Institution"><input className={input} value={e.institution ?? ''} onChange={(ev) => setSchool(i, { institution: orNull(ev.target.value) })} /></Field>
                <Field label="Dates"><input className={input} value={e.dates ?? ''} onChange={(ev) => setSchool(i, { dates: orNull(ev.target.value) })} /></Field>
              </div>
              <button type="button" onClick={() => set({ education: sections.education.filter((_, k) => k !== i) })} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /> Remove</button>
            </div>
          )) : <p className="text-sm text-muted-foreground">No education yet.</p>}
        </Section>

        <Section title="Skills">
          <div className="flex flex-wrap gap-2">
            {sections.skills.map((s, i) => (
              <span key={`${s}-${i}`} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-sm text-primary">
                {s}
                <button type="button" aria-label={`Remove ${s}`} onClick={() => set({ skills: sections.skills.filter((_, k) => k !== i) })} className="text-muted-foreground hover:text-primary"><X className="size-3.5" /></button>
              </span>
            ))}
          </div>
          <SkillAdder onAdd={(v) => set({ skills: [...sections.skills, v] })} count={sections.skills.length} />
        </Section>
      </div>

      <ExportDrawer
        open={exportOpen}
        onOpenChange={setExportOpen}
        sections={sections}
        targetRole={targetRole ?? ''}
        style={style}
        onStyle={setStyle}
        fileName={safeName(label)}
        onWord={word}
        busy={exporting}
        note={note}
      />
      <AnalysisSheet open={analysisOpen} onOpenChange={setAnalysisOpen} sections={sections} targetRole={targetRole} />

      <Modal open={confirmDelete} onOpenChange={setConfirmDelete}>
        <div className="p-6">
          <ModalTitle className="text-lg font-semibold text-primary">Delete this résumé?</ModalTitle>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">&ldquo;{label}&rdquo; will be removed from your account. This cannot be undone.</p>
          <div className="mt-6 flex justify-end gap-2">
            <ModalClose className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">Cancel</ModalClose>
            <button type="button" onClick={remove} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SkillAdder({ onAdd, count }: { onAdd: (v: string) => void; count: number }) {
  const [v, setV] = useState('')
  const go = () => { const t = v.trim(); if (t && t.length <= 80 && count < 80) { onAdd(t); setV('') } }
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go() }}>
      <input aria-label="Add a skill" className={input} value={v} placeholder="Add a skill and press Enter" onChange={(e) => setV(e.target.value)} />
      <button type="submit" className={addButton}><Plus className="size-3.5" /> Add</button>
    </form>
  )
}

const SEVERITY = { high: 'Fix first', medium: 'Worth fixing', low: 'Optional' } as const

/** The ATS analysis for this résumé: the same deterministic check as the free checker, shown as a report. */
function AnalysisSheet({ open, onOpenChange, sections, targetRole }: { open: boolean; onOpenChange: (o: boolean) => void; sections: ResumeSections; targetRole: string | null }) {
  const result = useMemo(() => {
    if (!open) return null
    try {
      return { ok: true as const, report: checkResume(sectionsToText(sections), targetRole || undefined) }
    } catch (e) {
      return { ok: false as const, error: e instanceof AtsCheckError ? e.message : 'We could not check this résumé.' }
    }
  }, [open, sections, targetRole])

  return (
    <Sheet open={open} onOpenChange={onOpenChange} trigger={<></>}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <SheetClose aria-label="Close" className="rounded-lg border border-border p-2 text-primary hover:bg-secondary"><X className="size-4" /></SheetClose>
        <SheetTitle className="text-lg font-semibold tracking-[-0.03em] text-primary">Résumé analysis</SheetTitle>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {!result ? null : !result.ok ? (
          <p className="text-sm text-muted-foreground">{result.error}</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
              <Gauge value={Math.round(result.report.readability.score) / 10} small />
              <div>
                <p className="text-base font-semibold text-primary">
                  {result.report.findings.length === 0 ? 'Nothing for an ATS to trip on.' : `${result.report.findings.length} thing${result.report.findings.length === 1 ? '' : 's'} an ATS may trip on.`}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">The same rules-based check as the free ATS checker — no AI, so the result can be checked line by line.</p>
              </div>
            </div>

            <ul className="grid gap-2">
              {result.report.categories.map((c) => (
                <li key={c.key} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <span className="flex-1 font-semibold text-primary">{c.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.passed}/{c.total} passed</span>
                  <span className="w-10 text-right font-mono text-sm tabular-nums text-primary">{Math.round(c.score)}</span>
                </li>
              ))}
            </ul>

            {(['high', 'medium', 'low'] as const).map((sev) => {
              const list = result.report.findings.filter((f) => f.severity === sev)
              if (!list.length) return null
              return (
                <section key={sev}>
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                    {sev === 'high' ? <AlertTriangle className="size-3.5 text-destructive" /> : <CheckCircle2 className="size-3.5 text-score-mid" />}
                    {SEVERITY[sev]} <span className="font-mono font-normal text-muted-foreground">{list.length}</span>
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {list.map((f, i) => (
                      <li key={`${f.id}-${i}`} className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm font-semibold text-primary">{f.title}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{f.detail}</p>
                        <p className="mt-2 text-xs leading-5 text-primary"><span className="font-semibold">Fix: </span>{f.fix}</p>
                        {f.evidence ? <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">&ldquo;{f.evidence}&rdquo;</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </Sheet>
  )
}
