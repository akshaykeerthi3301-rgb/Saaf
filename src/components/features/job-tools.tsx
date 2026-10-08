'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, ChevronRight, FileText, Loader2, PenLine, Sparkles, ThumbsUp, X, XCircle } from 'lucide-react'
import { Sheet, SheetClose, SheetTitle } from '@/components/ui/sheet'
import { useFeed } from '@/components/features/feed-selection'
import { OverviewTab } from '@/components/features/job-panel'
import { TailorStudio } from '@/components/features/tailor-studio'
import { CoverLetterStudio } from '@/components/features/cover-letter-studio'
import { Gauge, GAUGE_LABEL } from '@/components/features/score-gauge'
import { formatDistanceToNowStrict } from 'date-fns'
import { styleSchema, type ResumeStyle } from '@/lib/resume-style'
import { keepResumeFromFile } from '@/lib/keep-resume'
import { MAX_RESUME_BYTES, MAX_RESUME_MB, TOO_LARGE_MESSAGE } from '@/lib/parse/constants'
import { loadCoverLetterContext, loadTailorContext, type CoverLetterContext, type GapRow, type TailorContext } from '@/app/actions/job-tools'

/**
 * The three AI tools on a job — Customize your résumé, Build a cover letter, Analyze how well you fit — as a rail
 * beside the job and drawers over the feed, so a candidate never leaves the list to use them (founder, 2026-10-09:
 * "resume tailoring, styling, nothing is there" — they existed, four clicks deep behind a tab and a separate page).
 *
 * The tailor drawer is the three-step flow of the reference product: 1 See the difference (a gauge and a table of
 * the job against the résumé), 2 Choose what to change, 3 Review (the studio, with styles, edit-in-place and export).
 * Every number in step 1 is read from the two documents; nothing is estimated.
 */

type Tool = 'tailor' | 'letter' | 'fit'

const ago = (iso: string) => formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
/** A saved style, or undefined when it is missing or no longer valid — never a half-read one. */
const styleOf = (raw: unknown): ResumeStyle | undefined => { const p = styleSchema.safeParse(raw); return p.success ? (p.data as ResumeStyle) : undefined }

export function AiToolsRail({ roleId, title }: { roleId: string; title: string }) {
  const [open, setOpen] = useState<Tool | null>(null)
  const cards: { key: Tool; icon: typeof FileText; name: string; line: string; primary?: boolean }[] = [
    { key: 'tailor', icon: Sparkles, name: 'Customize your résumé', line: 'Match it to this job in three steps', primary: true },
    { key: 'letter', icon: PenLine, name: 'Build a cover letter', line: 'Written from your own experience' },
    { key: 'fit', icon: ThumbsUp, name: 'Analyze how well you fit', line: 'Your strengths and gaps for this role' },
  ]
  return (
    <div className="p-5">
      <h2 className="text-base font-semibold tracking-[-0.02em] text-primary">AI tools</h2>
      <div className="mt-4 space-y-3">
        {cards.map(({ key, icon: Icon, name, line, primary }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(key)}
            data-testid={`tool-${key}`}
            className={`group flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
              primary ? 'bg-brand-gradient border-transparent' : 'border-border bg-card hover:border-foreground/30'
            }`}
          >
            <Icon className="mt-0.5 size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{name}</span>
              <span className={`mt-0.5 block text-xs ${primary ? 'opacity-80' : 'text-muted-foreground'}`}>{line}</span>
            </span>
            <ChevronRight className="mt-0.5 size-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
      <TailorDrawer key={`t-${roleId}`} roleId={roleId} open={open === 'tailor'} onOpenChange={(o) => setOpen(o ? 'tailor' : null)} />
      <CoverLetterDrawer key={`c-${roleId}`} roleId={roleId} open={open === 'letter'} onOpenChange={(o) => setOpen(o ? 'letter' : null)} />
      <FitDrawer open={open === 'fit'} onOpenChange={(o) => setOpen(o ? 'fit' : null)} title={title} />
    </div>
  )
}

function DrawerHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
      <SheetClose aria-label="Close" className="rounded-lg border border-border p-2 text-primary hover:bg-secondary"><X className="size-4" /></SheetClose>
      <SheetTitle className="text-lg font-semibold tracking-[-0.03em] text-primary">{title}</SheetTitle>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------- tailor

const STEPS = ['See your difference', 'Align your résumé', 'Review your new résumé']

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center justify-center gap-3 border-b border-border px-5 py-3 text-sm" aria-label="Steps">
      {STEPS.map((label, i) => {
        const n = i + 1
        const on = n === step, done = n < step
        return (
          <li key={label} className="flex items-center gap-3">
            <span className={`flex items-center gap-2 font-medium ${on ? 'text-primary' : 'text-muted-foreground'}`} aria-current={on ? 'step' : undefined}>
              <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${on || done ? 'bg-brand-gradient' : 'bg-secondary text-muted-foreground'}`}>
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </span>
            {n < 3 ? <span className="h-px w-8 bg-border sm:w-14" aria-hidden="true" /> : null}
          </li>
        )
      })}
    </ol>
  )
}

const STATUS_ICON = {
  good: <CheckCircle2 className="size-5 text-score-high" aria-label="Matches" />,
  warn: <AlertCircle className="size-5 text-score-mid" aria-label="Partly matches" />,
  bad: <XCircle className="size-5 text-destructive" aria-label="Does not match" />,
} as const

function GapTable({ rows, resumeLabel, resumes, onPick, busy }: {
  rows: GapRow[]
  resumeLabel: string
  resumes: { id: string; label: string }[]
  onPick: (id: string) => void
  busy: boolean
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-[minmax(110px,160px)_1fr_1fr] border-b border-border bg-secondary/40 text-xs font-semibold text-muted-foreground">
        <div className="px-4 py-3">Overview</div>
        <div className="px-4 py-3">This job</div>
        <div className="flex items-center gap-2 px-4 py-3">
          Your résumé
          {resumes.length > 1 ? (
            <select
              aria-label="Résumé to tailor"
              value={resumes.find((r) => r.label === resumeLabel)?.id}
              onChange={(e) => onPick(e.target.value)}
              disabled={busy}
              className="max-w-[200px] truncate rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-primary"
            >
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          ) : <span className="truncate font-semibold text-primary">{resumeLabel}</span>}
        </div>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[minmax(110px,160px)_1fr_1fr] items-center border-b border-border text-sm last:border-b-0">
          <div className="flex items-center gap-2.5 px-4 py-4 font-semibold text-primary">{STATUS_ICON[r.status]}<span>{r.label}</span></div>
          <div className="px-4 py-4 text-muted-foreground">{r.job}</div>
          <div className="px-4 py-4 text-primary">{r.you}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * What the tailor drawer shows when the account holds no saved résumé: an upload box, right there. It used to say
 * "upload yours to the ATS checker, press Keep, and come back" — a trip to another page that never returned to the
 * job. A saved résumé now arrives at sign-up (src/lib/keep-resume.ts); this covers an account that predates that or
 * deleted it, and returns straight to step 1 for the same job.
 */
export function ResumeIntake({ onSaved }: { onSaved: (resumeId: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function pick(file: File | undefined) {
    if (!file) return
    setError(undefined)
    if (file.size > MAX_RESUME_BYTES) { setError(TOO_LARGE_MESSAGE); return }
    setBusy(true)
    try {
      const r = await keepResumeFromFile(file, { makePrimary: true })
      if (!r.ok) { setError(r.error); return }
      onSaved(r.saved.id)
    } catch {
      setError('Something went wrong reading that file. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md p-10 text-center sm:p-12">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-secondary text-primary"><FileText className="size-7" /></span>
      <h3 className="mt-5 text-lg font-semibold text-primary">Add your résumé to tailor it for this job</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Upload a PDF or Word file (up to {MAX_RESUME_MB} MB). We keep its text in your account — not the file — so you can tailor it to any job. Delete it any time on the Résumé page.
      </p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="bg-brand-gradient mt-6 inline-flex min-w-48 items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? <><Loader2 className="size-4 animate-spin" /> Reading your résumé…</> : 'Upload your résumé'}
      </button>
      {error ? <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hidden
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }}
      />
    </div>
  )
}

export function TailorDrawer({ roleId, open, onOpenChange }: { roleId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { current } = useFeed()
  const applyUrl = current.status === 'done' && current.result.ok ? current.result.insight.applyUrl : undefined
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [ctx, setCtx] = useState<TailorContext | null>(null)
  const [fromSaved, setFromSaved] = useState(false)
  const [mode, setMode] = useState<'quick' | 'full'>('full')
  const [scope, setScope] = useState({ summary: true, experience: true, skills: true })
  // The résumé the candidate picked in the table, and whether a read is already running.
  const wanted = useRef<string | undefined>(undefined)
  const inflight = useRef(false)

  // Read when the drawer opens, and again after a different résumé is picked (that sets ctx back to null).
  useEffect(() => {
    if (!open || ctx !== null || inflight.current) return
    inflight.current = true
    loadTailorContext({ roleId, resumeId: wanted.current })
      .catch((): TailorContext => ({ ok: false, error: 'Could not load — check your connection.' }))
      .then((r) => { inflight.current = false; setCtx(r) })
  }, [open, ctx, roleId])
  const loading = ctx === null
  const load = (resumeId: string) => { wanted.current = resumeId; setCtx(null) }

  const pickMode = (m: 'quick' | 'full') => { setMode(m); setScope(m === 'quick' ? { summary: true, experience: false, skills: true } : { summary: true, experience: true, skills: true }) }
  const none = !scope.summary && !scope.experience && !scope.skills

  let body: ReactNode
  if (!ctx) {
    body = <p className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading your résumé against this job…</p>
  } else if (!ctx.ok && 'needsResume' in ctx) {
    body = <ResumeIntake onSaved={(id) => load(id)} />
  } else if (!ctx.ok) {
    body = <p className="p-10 text-center text-sm text-muted-foreground">{ctx.error}</p>
  } else if (step === 1) {
    const g = ctx.gauge
    body = (
      <div className="mx-auto w-full max-w-5xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-border bg-card p-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-primary">
              {g === null ? 'Your résumé is too short to score' : `Your résumé is a ${GAUGE_LABEL(g).toLowerCase()} match for this job`}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Scored the way an applicant tracking system reads it, against this posting. Each row below shows what the job asks and what your résumé says.
            </p>
          </div>
          <Gauge value={g} />
        </div>
        {ctx.existing ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm text-primary">
              <span className="font-semibold">You already customised a résumé for this job</span>{' '}
              <span className="text-muted-foreground">({ago(ctx.existing.updatedAt)}).</span>
            </p>
            <button type="button" onClick={() => { setFromSaved(true); setStep(3) }} className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-semibold">Continue where I left off</button>
          </div>
        ) : null}
        <GapTable rows={ctx.rows} resumeLabel={ctx.resume.label} resumes={ctx.resumes} onPick={(id) => load(id)} busy={loading} />
      </div>
    )
  } else if (step === 2) {
    const toggle = (k: keyof typeof scope) => setScope((s) => ({ ...s, [k]: !s[k] }))
    const miss = ctx.keywords.filter((k) => !k.inResume)
    body = (
      <div className="mx-auto w-full max-w-3xl space-y-6 p-5 sm:p-8">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-primary">What should change?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Pick the parts to tailor. Anything you leave out stays exactly as you wrote it.</p>
          <div className="mt-4 flex gap-4 text-sm">
            {(['quick', 'full'] as const).map((m) => (
              <label key={m} className="inline-flex cursor-pointer items-center gap-2 font-medium text-primary">
                <input type="radio" name="mode" checked={mode === m} onChange={() => pickMode(m)} className="accent-[var(--color-accent)]" />
                {m === 'quick' ? 'Quick (summary and skills)' : 'Full (everything)'}
              </label>
            ))}
          </div>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {([
              ['summary', 'Summary', 'Reworded to speak to this posting'],
              ['experience', 'Experience bullets', 'Reworded, never invented — each line is checked against yours'],
              ['skills', 'Skills order', 'The skills this job names come first'],
            ] as const).map(([k, name, line]) => (
              <label key={k} className="flex cursor-pointer items-start gap-3 p-4">
                <input type="checkbox" checked={scope[k]} onChange={() => toggle(k)} className="mt-1 size-4 accent-[var(--color-accent)]" />
                <span><span className="block text-sm font-semibold text-primary">{name}</span><span className="text-xs text-muted-foreground">{line}</span></span>
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-primary">Keywords from the posting <span className="font-mono text-sm text-muted-foreground">{ctx.keywords.length - miss.length}/{ctx.keywords.length}</span></h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {ctx.keywords.map((k) => (
              <span key={k.term} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${k.inResume ? 'bg-score-high/15 text-score-high' : 'bg-secondary text-muted-foreground'}`}>
                {k.inResume ? '✓ ' : ''}{k.term}
              </span>
            ))}
            {ctx.keywords.length === 0 ? <span className="text-sm text-muted-foreground">This posting names no skills we recognise.</span> : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">A missing keyword is only added where a line you already wrote supports it — we do not claim skills you have not shown.</p>
        </section>
      </div>
    )
  } else {
    body = (
      <div className="mx-auto w-full max-w-[1200px] p-6">
        <TailorStudio
          key={`${ctx.resume.id}:${JSON.stringify(scope)}:${fromSaved}`}
          roleId={roleId}
          resumeId={ctx.resume.id}
          resumeLabel={ctx.resume.label}
          original={ctx.resume.sections}
          roleTitle={ctx.role.title}
          company={ctx.role.company}
          applyUrl={applyUrl}
          scope={scope}
          restored={fromSaved && ctx.existing ? { sections: ctx.existing.sections, style: styleOf(ctx.existing.style) ?? null, before: ctx.gauge === null ? null : Math.round(ctx.gauge * 10), keywords: ctx.keywords.map((k) => k.term) } : undefined}
          autoRun={!fromSaved}
          embedded
        />
      </div>
    )
  }

  const ready = ctx?.ok === true
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { setStep(1); setFromSaved(false) } onOpenChange(o) }} trigger={<></>} wide>
      <DrawerHeader title="Generate your custom résumé" />
      <Stepper step={step} />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background">{body}</div>
      {ready && step < 3 ? (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-5 py-4">
          {step === 2 ? <button type="button" onClick={() => setStep(1)} className="text-sm font-semibold text-muted-foreground hover:text-primary">Back</button> : <span />}
          <button
            type="button"
            disabled={step === 2 && none}
            onClick={() => setStep(step === 1 ? 2 : 3)}
            className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {step === 1 ? 'Improve my résumé for this job' : 'Generate my new résumé'}
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------------------------- cover letter

export function CoverLetterDrawer({ roleId, open, onOpenChange }: { roleId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [ctx, setCtx] = useState<CoverLetterContext | null>(null)
  useEffect(() => {
    if (!open || ctx) return
    loadCoverLetterContext({ roleId }).catch((): CoverLetterContext => ({ ok: false, error: 'Could not load — check your connection.' })).then(setCtx)
  }, [open, ctx, roleId])
  return (
    <Sheet open={open} onOpenChange={onOpenChange} trigger={<></>} wide>
      <DrawerHeader title="Build your cover letter" />
      <div className="min-h-0 flex-1 overflow-y-auto bg-background p-5 sm:p-8">
        {!ctx ? (
          <p className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Getting your profile and this job…</p>
        ) : !ctx.ok ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{ctx.error}</p>
        ) : (
          <div className="mx-auto max-w-[1200px]"><CoverLetterStudio roleId={roleId} me={ctx.me} defaults={ctx.defaults} /></div>
        )}
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------------------------------- fit

export function FitDrawer({ open, onOpenChange, title }: { open: boolean; onOpenChange: (o: boolean) => void; title: string }) {
  const { current } = useFeed()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} trigger={<></>}>
      <DrawerHeader title="How well you fit" />
      <p className="px-5 pt-4 text-sm font-semibold text-primary">{title}</p>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {current.status === 'done' && current.result.ok ? <OverviewTab j={current.result.insight} /> : <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </Sheet>
  )
}
