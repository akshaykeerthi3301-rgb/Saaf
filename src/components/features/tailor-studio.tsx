'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import {
  Check, CheckCheck, Download, FileDown, Loader2, Pencil, Printer, Save, ShieldCheck, Sparkles, Undo2, X,
} from 'lucide-react'
import { tailorSavedResume, type TailorStudioResult } from '@/app/actions/tailor-studio'
import { downloadOptimisedResume } from '@/app/actions/resume-download'
import { saveResumeToAccount } from '@/app/actions/resume-documents'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * The Resume Tailoring Studio — current résumé beside an AI-tailored one.
 *
 * Visual diff, one meaning per colour:
 *   purple  a bullet (or the summary) the model rewrote
 *   green   a skill term the POSTING names that the rewrite put in and the
 *           original line did not have — an inserted ATS keyword
 *
 * ⚠️ NOTHING IS APPLIED UNTIL THE CANDIDATE ACCEPTS IT. The right column starts
 * as their own résumé with suggestions beside it; "Accept all" is a choice, not
 * the default. What the grounding guard refused is listed, not hidden — the
 * same rule as the review drawer: a badge over a black box is worth nothing.
 */

type Ok = Extract<TailorStudioResult, { ok: true }>
type Suggestion = { key: string; entry: number; idx: number; original: string; rewritten: string }
type Decision = 'pending' | 'accepted' | 'dismissed'

function suggestionsFrom(original: ResumeSections, res: Ok): Suggestion[] {
  const out: Suggestion[] = []
  const used = new Set<string>()
  for (const c of res.changes) {
    if (!c.kept || c.rewritten.trim() === c.original.trim()) continue
    if (c.entry === -1) {
      out.push({ key: 'summary', entry: -1, idx: 0, original: c.original, rewritten: c.rewritten })
      continue
    }
    const bullets = original.experience[c.entry]?.bullets ?? []
    const idx = bullets.findIndex((b, i) => b === c.original && !used.has(`${c.entry}:${i}`))
    if (idx < 0) continue
    used.add(`${c.entry}:${idx}`)
    out.push({ key: `${c.entry}:${idx}`, entry: c.entry, idx, original: c.original, rewritten: c.rewritten })
  }
  return out
}

export function TailorStudio({
  roleId, resumeId, resumeLabel, original, roleTitle, company,
}: {
  roleId: string
  resumeId: string
  resumeLabel: string
  original: ResumeSections
  roleTitle: string
  company: string
}) {
  const [res, setRes] = useState<Ok | null>(null)
  const [error, setError] = useState<string>()
  const [working, setWorking] = useState<ResumeSections>(original)
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const [skillsDecision, setSkillsDecision] = useState<Decision>('pending')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState<string>()
  const [running, startRun] = useTransition()
  const [busy, startBusy] = useTransition()

  const suggestions = useMemo(() => (res ? suggestionsFrom(original, res) : []), [res, original])
  const pending = suggestions.filter((s) => (decisions[s.key] ?? 'pending') === 'pending')
  const keywords = res?.keywords ?? []

  function run() {
    setError(undefined)
    startRun(async () => {
      const r = await tailorSavedResume({ roleId, resumeId }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setError(r.error); return }
      setRes(r)
      setWorking(original)
      setDecisions({})
      setSkillsDecision(r.skillsReordered ? 'pending' : 'dismissed')
    })
  }

  const setText = (s: Pick<Suggestion, 'entry' | 'idx'>, text: string) =>
    setWorking((w) =>
      s.entry === -1
        ? { ...w, summary: text }
        : {
            ...w,
            experience: w.experience.map((e, i) =>
              i === s.entry ? { ...e, bullets: e.bullets.map((b, j) => (j === s.idx ? text : b)) } : e,
            ),
          },
    )

  const accept = (s: Suggestion) => { setText(s, s.rewritten); setDecisions((d) => ({ ...d, [s.key]: 'accepted' })) }
  const dismiss = (s: Suggestion) => { setText(s, s.original); setDecisions((d) => ({ ...d, [s.key]: 'dismissed' })) }
  const acceptAll = () => {
    pending.forEach(accept)
    if (skillsDecision === 'pending' && res) { setWorking((w) => ({ ...w, skills: res.sections.skills })); setSkillsDecision('accepted') }
  }

  function saveVersion() {
    setNote(undefined)
    startBusy(async () => {
      const r = await saveResumeToAccount({
        sections: working,
        targetRole: roleTitle,
        label: `Tailored — ${roleTitle}${company ? ` at ${company}` : ''}`.slice(0, 120),
      }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      setNote(r.ok ? `Saved as “${r.saved.label}”. Pick it as the résumé version on your tracker.` : r.error)
    })
  }

  function exportWord() {
    setNote(undefined)
    startBusy(async () => {
      const r = await downloadOptimisedResume({ sections: working, targetRole: roleTitle })
        .catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setNote(r.error); return }
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(
        new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = r.filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  /** Marks posting keywords the rewrite added. Text nodes only. */
  const markInserted = (text: string, before: string): ReactNode => {
    const added = keywords.filter(
      (k) => k.length > 1 && new RegExp(`\\b${esc(k)}\\b`, 'i').test(text) && !new RegExp(`\\b${esc(k)}\\b`, 'i').test(before),
    )
    if (!added.length) return text
    const re = new RegExp(`\\b(${added.map(esc).join('|')})\\b`, 'gi')
    return text.split(re).map((part, i) =>
      added.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
        <mark key={i} className="rounded bg-score-high/20 px-0.5 font-semibold text-score-high">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  const line = (s: Suggestion | undefined, key: string, entry: number, idx: number, current: string, originalText: string) => {
    const d = s ? decisions[s.key] ?? 'pending' : undefined
    const changed = current !== originalText
    if (editing === key) {
      return (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            aria-label="Edit this line"
            className="w-full rounded-lg border border-input bg-background p-2.5 text-sm leading-6 text-primary outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <SmallButton onClick={() => { setText({ entry, idx }, draft.trim() || originalText); setEditing(null) }} icon={Check}>Done</SmallButton>
            <SmallButton onClick={() => setEditing(null)} icon={X}>Cancel</SmallButton>
          </div>
        </div>
      )
    }
    return (
      <div>
        <div
          className={`group flex gap-2 rounded-lg px-2 py-1.5 text-sm leading-6 ${
            changed ? 'border-l-2 border-brand-2 bg-brand-2/10 text-primary' : 'text-primary'
          }`}
        >
          <span className="flex-1">{changed ? markInserted(current, originalText) : current}</span>
          <button
            type="button"
            onClick={() => { setEditing(key); setDraft(current) }}
            aria-label="Edit this line"
            className="h-fit shrink-0 rounded p-1 text-muted-foreground opacity-60 hover:bg-secondary hover:text-primary group-hover:opacity-100"
          >
            <Pencil className="size-3.5" />
          </button>
          {s && d === 'accepted' ? (
            <button
              type="button"
              onClick={() => dismiss(s)}
              aria-label="Undo this rewrite"
              className="h-fit shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <Undo2 className="size-3.5" />
            </button>
          ) : null}
        </div>
        {s && d === 'pending' ? (
          <div className="mt-1.5 rounded-lg border border-dashed border-brand-2/60 bg-brand-2/5 p-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-2">
              <Sparkles className="size-3" /> Suggested rewrite
            </p>
            <p className="mt-1 text-sm leading-6 text-primary">{markInserted(s.rewritten, s.original)}</p>
            <div className="mt-2 flex gap-2">
              <SmallButton onClick={() => accept(s)} icon={Check} strong>Accept</SmallButton>
              <SmallButton onClick={() => dismiss(s)} icon={X}>Keep mine</SmallButton>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const byKey = new Map(suggestions.map((s) => [s.key, s]))

  return (
    <div>
      {/* The control bar. */}
      <div className="glass sticky top-16 z-10 -mx-5 mb-5 flex flex-wrap items-center gap-2 border-b border-border px-5 py-3 sm:-mx-8 sm:px-8 print:hidden">
        {!res ? (
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {running ? 'Tailoring to this posting…' : 'Tailor my résumé for this role'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={acceptAll}
              disabled={!pending.length && skillsDecision !== 'pending'}
              className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <CheckCheck className="size-4" />
              Accept all AI suggestions{pending.length ? ` (${pending.length + (skillsDecision === 'pending' ? 1 : 0)})` : ''}
            </button>
            <ToolbarButton onClick={saveVersion} disabled={busy} icon={Save}>Save as version</ToolbarButton>
            <ToolbarButton onClick={exportWord} disabled={busy} icon={FileDown}>Export Word</ToolbarButton>
            <ToolbarButton onClick={() => window.print()} icon={Printer}>Export PDF</ToolbarButton>
            <ToolbarButton onClick={run} disabled={running} icon={running ? Loader2 : Sparkles}>Re-run</ToolbarButton>
          </>
        )}
        <span className="ml-auto hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand-2" /> rewritten</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-score-high" /> inserted keyword</span>
          <span className="inline-flex items-center gap-1.5"><Pencil className="size-3" /> edit any line</span>
        </span>
      </div>

      {error ? <p className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground print:hidden">{error}</p> : null}
      {note ? <p role="status" className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-primary print:hidden">{note}</p> : null}

      <div className="grid gap-5 lg:grid-cols-2 print:hidden">
        <DocColumn title="Current résumé" subtitle={resumeLabel}>
          <DocBody sections={original} />
        </DocColumn>

        <DocColumn title="AI-tailored résumé" subtitle={`For ${roleTitle}${company ? ` at ${company}` : ''}`} accent>
          <Head name={working.contact.name} />
          {working.summary !== null ? (
            <Block title="Summary">{line(byKey.get('summary'), 'summary', -1, 0, working.summary ?? '', original.summary ?? '')}</Block>
          ) : null}
          {working.experience.length ? (
            <Block title="Experience">
              <div className="space-y-4">
                {working.experience.map((e, i) => (
                  <div key={i}>
                    <Role e={e} />
                    <div className="mt-1 space-y-1">
                      {e.bullets.map((b, j) => (
                        <div key={j}>{line(byKey.get(`${i}:${j}`), `${i}:${j}`, i, j, b, original.experience[i]?.bullets[j] ?? b)}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Block>
          ) : null}
          {working.skills.length ? (
            <Block title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {working.skills.map((s) => (
                  <span key={s} className={`rounded-md px-2 py-0.5 text-xs ${keywords.some((k) => k.toLowerCase() === s.toLowerCase()) ? 'bg-score-high/15 text-score-high' : 'bg-secondary text-primary'}`}>{s}</span>
                ))}
              </div>
              {res && skillsDecision === 'pending' ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-brand-2/60 bg-brand-2/5 p-2.5 text-xs text-primary">
                  <Sparkles className="size-3 text-brand-2" />
                  Lead with the skills this posting names.
                  <SmallButton onClick={() => { setWorking((w) => ({ ...w, skills: res.sections.skills })); setSkillsDecision('accepted') }} icon={Check} strong>Reorder</SmallButton>
                  <SmallButton onClick={() => setSkillsDecision('dismissed')} icon={X}>Keep order</SmallButton>
                </div>
              ) : null}
            </Block>
          ) : null}
          {working.education.length ? (
            <Block title="Education">
              {working.education.map((ed, i) => (
                <p key={i} className="text-sm text-primary">{ed.qualification}{ed.institution ? ` — ${ed.institution}` : ''}{ed.dates ? ` · ${ed.dates}` : ''}</p>
              ))}
            </Block>
          ) : null}
        </DocColumn>
      </div>

      {res ? (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4 print:hidden">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5 text-accent" />
            Every suggestion was checked against your own lines{res.providerLabel ? `, after being drafted by ${res.providerLabel}` : ''}.
          </p>
          {res.reverted.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground hover:text-primary">
                {res.reverted.length} rewrite{res.reverted.length === 1 ? ' was' : 's were'} refused — see what and why
              </summary>
              <ul className="mt-2 space-y-2">
                {res.reverted.map((r, i) => (
                  <li key={i} className="rounded-lg bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground">
                    <span className="line-through">{r.rewritten}</span>
                    <span className="mt-1 block text-primary">Refused: {r.reason}.</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {!suggestions.length ? (
            <p className="mt-2 text-xs text-muted-foreground">No line needed rewriting for this posting — your résumé already speaks to it.</p>
          ) : null}
        </div>
      ) : null}

      {/* What Export PDF prints: the tailored document alone, on paper. */}
      <div className="hidden bg-paper p-8 text-paper-ink print:block">
        <h1 className="text-2xl font-bold">{working.contact.name}</h1>
        <p className="text-sm text-paper-muted">{[working.contact.email, working.contact.phone, ...working.contact.links].filter(Boolean).join(' · ')}</p>
        {working.summary ? <p className="mt-4 text-sm leading-6">{working.summary}</p> : null}
        {working.experience.length ? <h2 className="mt-5 border-b border-paper-rule pb-1 text-sm font-bold uppercase">Experience</h2> : null}
        {working.experience.map((e, i) => (
          <div key={i} className="mt-3">
            <p className="text-sm font-bold">{[e.title, e.employer].filter(Boolean).join(' — ')}<span className="font-normal text-paper-muted">{e.dates ? `  ${e.dates}` : ''}</span></p>
            <ul className="ml-5 list-disc text-sm leading-6">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          </div>
        ))}
        {working.skills.length ? <><h2 className="mt-5 border-b border-paper-rule pb-1 text-sm font-bold uppercase">Skills</h2><p className="mt-2 text-sm">{working.skills.join(', ')}</p></> : null}
        {working.education.length ? <><h2 className="mt-5 border-b border-paper-rule pb-1 text-sm font-bold uppercase">Education</h2>{working.education.map((ed, i) => <p key={i} className="mt-1 text-sm">{ed.qualification}{ed.institution ? ` — ${ed.institution}` : ''}{ed.dates ? ` · ${ed.dates}` : ''}</p>)}</> : null}
      </div>
    </div>
  )
}

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function DocColumn({ title, subtitle, accent, children }: { title: string; subtitle: string; accent?: boolean; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border bg-card p-5 ${accent ? 'glow-selected border-transparent' : 'border-border'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${accent ? 'text-accent' : 'text-muted-foreground'}`}>{title}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

function DocBody({ sections }: { sections: ResumeSections }) {
  return (
    <>
      <Head name={sections.contact.name} />
      {sections.summary ? <Block title="Summary"><p className="px-2 text-sm leading-6 text-muted-foreground">{sections.summary}</p></Block> : null}
      {sections.experience.length ? (
        <Block title="Experience">
          <div className="space-y-4">
            {sections.experience.map((e, i) => (
              <div key={i}>
                <Role e={e} />
                <ul className="mt-1 space-y-1">
                  {e.bullets.map((b, j) => <li key={j} className="px-2 py-1.5 text-sm leading-6 text-muted-foreground">{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Block>
      ) : null}
      {sections.skills.length ? (
        <Block title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {sections.skills.map((s) => <span key={s} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{s}</span>)}
          </div>
        </Block>
      ) : null}
    </>
  )
}

function Head({ name }: { name: string | null }) {
  return name ? <p className="text-lg font-semibold tracking-[-0.03em] text-primary">{name}</p> : null
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 border-b border-border pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Role({ e }: { e: ResumeSections['experience'][number] }) {
  return (
    <p className="px-2 text-sm font-semibold text-primary">
      {[e.title, e.employer].filter(Boolean).join(' — ') || 'Role'}
      {e.dates ? <span className="ml-2 text-xs font-normal text-muted-foreground">{e.dates}</span> : null}
    </p>
  )
}

function ToolbarButton({ onClick, disabled, icon: Icon, children }: { onClick: () => void; disabled?: boolean; icon: typeof Download; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-primary hover:border-accent/60 disabled:opacity-50"
    >
      <Icon className={`size-3.5 ${Icon === Loader2 ? 'animate-spin' : ''}`} />
      {children}
    </button>
  )
}

function SmallButton({ onClick, icon: Icon, strong, children }: { onClick: () => void; icon: typeof Check; strong?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${
        strong ? 'bg-brand-gradient' : 'border border-border bg-background text-primary hover:border-accent/60'
      }`}
    >
      <Icon className="size-3" />
      {children}
    </button>
  )
}
