'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react'
import { ArrowUp, FileDown, Loader2, Pencil, Save, ShieldCheck, Sparkles, Undo2, X } from 'lucide-react'
import { rewriteStudioLine, rewriteStudioLines, scoreDraft, tailorSavedResume, type TailorStudioResult } from '@/app/actions/tailor-studio'
import { downloadWordFile } from '@/lib/download-word'
import { saveResumeToAccount } from '@/app/actions/resume-documents'
import type { ResumeSections } from '@/lib/parse/sections'
import { DEFAULT_STYLE, type ResumeStyle } from '@/lib/resume-style'
import { buildDoc } from '@/lib/resume-doc'
import { estimatePagesForStyle, fitStyleToOnePage } from '@/lib/resume-fit'
import { diffSections, tailoredFilename } from '@/lib/resume-review'
import { ExportDrawer } from '@/components/features/export-drawer'
import { ResumePaper } from '@/components/features/resume-paper'
import { ResumeStyleControls } from '@/components/features/resume-style-controls'
import { Gauge } from '@/components/features/score-gauge'

/**
 * The result of "Customize your résumé" — the reference product's step 3, "Review your new résumé".
 *
 *   left   the score (before → now), what changed, and three tabs: AI Rewrite · Editor · Style
 *   right  the new résumé as a page, the changed lines marked on it, with the file name, Fit to one page, Download
 *
 * Rebuilt 2026-10-09 from a two-column "current beside suggested" review, which asked the person to accept every
 * line before they had a résumé. The reference applies the rewrite at once and lets the person undo and edit; so
 * does this. What did not change is the part that matters: every rewrite passed the same grounding guard (nothing is
 * kept that adds a figure, name or claim the saved résumé does not hold), what the guard refused is listed rather
 * than hidden, and the score is the same ATS check the free checker runs, re-run on each edit.
 *
 * Purple on the page = a line the rewrite changed. Green = a keyword from the posting the rewrite put in.
 */

type Ok = Extract<TailorStudioResult, { ok: true }>
type Tab = 'rewrite' | 'editor' | 'style'

const CHIPS = [
  { key: 'verbs', label: 'Use stronger action verbs for my latest experience' },
  { key: 'summary', label: 'Shorten my summary to remove filler words' },
  { key: 'skills', label: 'Remove skills not related to this job' },
] as const

export function TailorStudio({
  roleId, resumeId, resumeLabel, original, roleTitle, company, applyUrl, autoRun = false, scope, embedded = false,
}: {
  roleId: string
  resumeId: string
  resumeLabel: string
  original: ResumeSections
  roleTitle: string
  company: string
  /** The employer's own application page, for "Apply now". */
  applyUrl?: string
  /** Start tailoring on mount — the drawer's step 3 follows the candidate pressing Generate in step 2. */
  autoRun?: boolean
  /** Which parts to change (the drawer's step 2). Absent means the whole document. */
  scope?: { summary: boolean; experience: boolean; skills: boolean }
  /** Inside the job drawer: the page column sticks to the top of the drawer, not under the app header. */
  embedded?: boolean
}) {
  const [res, setRes] = useState<Ok | null>(null)
  const [error, setError] = useState<string>()
  const [working, setWorking] = useState<ResumeSections>(original)
  const [tab, setTab] = useState<Tab>('rewrite')
  const [note, setNote] = useState<string>()
  const [aiNote, setAiNote] = useState<string>()
  const [aiBusy, setAiBusy] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [lineBusy, setLineBusy] = useState<string | null>(null)
  const [running, startRun] = useTransition()
  const [busy, startBusy] = useTransition()
  const [style, setStyle] = useState<ResumeStyle>(DEFAULT_STYLE)
  const [fit, setFit] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [liveScore, setLiveScore] = useState<number | null>(null)
  const [scoring, setScoring] = useState(false)
  const scoreSeq = useRef(0)

  // The change list is read from the two documents, so it cannot disagree with the page.
  const changes = useMemo(() => diffSections(original, working), [original, working])
  const fitRes = useMemo(() => (fit ? fitStyleToOnePage(working, style) : null), [fit, working, style])
  // What the page looks like right now: the person's style, tightened only while "Fit to one page" is on.
  const effective: ResumeStyle = fitRes?.style ?? style
  const generated = useMemo(() => tailoredFilename({ name: working.contact.name, role: roleTitle, company }), [working.contact.name, roleTitle, company])
  const [fileBase, setFileBase] = useState<string | null>(null)
  const fileName = (fileBase ?? generated.replace(/\.docx$/, '')).trim() || 'resume'
  const blocks = useMemo(() => buildDoc(working, roleTitle, effective), [working, roleTitle, effective])
  const [pages, setPages] = useState(1)

  // The score of the page as it stands, after each undo, edit or rewrite. No change yet = the saved résumé's own
  // score, no call. `scoreSeq` drops a slow answer that a newer edit has overtaken.
  useEffect(() => {
    if (!res || changes.length === 0) return
    const mine = ++scoreSeq.current
    const t = setTimeout(() => {
      setScoring(true)
      scoreDraft({ roleId, sections: working })
        .then((r) => { if (mine === scoreSeq.current) setLiveScore(r.ok ? r.score : null) })
        .catch(() => { if (mine === scoreSeq.current) setLiveScore(null) })
        .finally(() => { if (mine === scoreSeq.current) setScoring(false) })
    }, 700)
    return () => clearTimeout(t)
  }, [res, working, roleId, changes.length])
  const before = res?.scores.before ?? null
  const now = res ? (changes.length === 0 ? before : liveScore) : null
  const tenth = (n: number | null) => (n === null ? null : Math.round(n) / 10)

  const keywords = res?.keywords ?? []

  function run() {
    setError(undefined)
    startRun(async () => {
      const r = await tailorSavedResume({ roleId, resumeId, scope }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      if (!r.ok) { setError(r.error); return }
      setRes(r)
      // Applied at once, as the reference does: the person undoes and edits from here. The guard has already run.
      setWorking(r.sections)
      setNote(undefined); setAiNote(undefined)
    })
  }

  // Step 3 of the drawer starts the run itself. A ref keeps React's double-invoked effect from tailoring twice.
  const started = useRef(false)
  useEffect(() => {
    if (!autoRun || started.current) return
    started.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  // ---- edits ---------------------------------------------------------------------------------------------------------
  const setBullet = (i: number, j: number, text: string) =>
    setWorking((w) => ({ ...w, experience: w.experience.map((e, k) => (k === i ? { ...e, bullets: e.bullets.map((b, m) => (m === j ? text : b)) } : e)) }))
  const setSummary = (text: string) => setWorking((w) => ({ ...w, summary: text }))

  function saveVersion() {
    setNote(undefined)
    startBusy(async () => {
      const r = await saveResumeToAccount({
        sections: working,
        targetRole: roleTitle,
        label: `Tailored — ${roleTitle}${company ? ` at ${company}` : ''}`.slice(0, 120),
      }).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
      setNote(r.ok ? `Saved as “${r.saved.label}”. It is on your Résumé page.` : r.error)
    })
  }

  function exportWord() {
    setNote(undefined)
    startBusy(async () => {
      const r = await downloadWordFile({ sections: working, targetRole: roleTitle, style: effective, company: company || undefined }, fileBase ? fileName : undefined)
      if (!r.ok) setNote(r.error)
    })
  }

  /** "Rewrite with AI" on the one line the person is editing: the suggestion lands in the box for them to keep or change. */
  function rewriteLine(key: string, text: string, apply: (t: string) => void) {
    if (lineBusy) return
    setLineBusy(key); setAiNote(undefined)
    rewriteStudioLine({ roleId, line: text })
      .then((r) => { if (r.ok) { apply(r.line); setAiNote('Rewritten — read it, change it if you like, or press Undo.') } else setAiNote(r.error) })
      .catch(() => setAiNote('Check your connection and try again.'))
      .finally(() => setLineBusy(null))
  }

  /** The AI Rewrite tab: what the person asked for, applied to their own lines, each one through the same guard. */
  async function askAi(ask: string, which: 'summary' | 'latest' | 'both') {
    if (aiBusy) return
    const lines: { key: string; text: string; summary?: boolean }[] = []
    if ((which === 'summary' || which === 'both') && working.summary && working.summary.trim().length >= 8) lines.push({ key: 'summary', text: working.summary, summary: true })
    if (which === 'latest' || which === 'both') {
      const i = working.experience.findIndex((e) => !e.isProject && e.bullets.length > 0)
      if (i >= 0) working.experience[i].bullets.slice(0, 6).forEach((b, j) => { if (b.trim().length >= 8) lines.push({ key: `${i}:${j}`, text: b }) })
    }
    if (!lines.length) { setAiNote('There is nothing to rewrite there yet.'); return }
    setAiBusy(true); setAiNote(undefined)
    try {
      const r = await rewriteStudioLines({ roleId, instruction: ask, lines })
      if (!r.ok) { setAiNote(r.error); return }
      let applied = 0
      for (const out of r.results) {
        if (!out.line) continue
        applied++
        if (out.key === 'summary') setSummary(out.line)
        else { const [i, j] = out.key.split(':').map(Number); setBullet(i, j, out.line) }
      }
      const left = r.results.filter((x) => x.reason).map((x) => x.reason)
      setAiNote(
        `${applied} of ${lines.length} line${lines.length === 1 ? '' : 's'} rewritten${r.providerLabel ? ` by ${r.providerLabel}` : ''}.` +
        (left.length ? ` ${left.length} left as written: ${left[0]}` : ' Undo any of them in the Editor tab.'),
      )
      if (applied) setInstruction('')
    } catch {
      setAiNote('Check your connection and try again.')
    } finally {
      setAiBusy(false)
    }
  }

  /** Deterministic, no model: keep the skills the posting names (or that contain one), drop the rest — never down to nothing. */
  function pruneSkills() {
    const kw = keywords.map((k) => k.toLowerCase())
    const related = (s: string) => { const x = s.toLowerCase(); return kw.some((k) => x === k || x.includes(k) || k.includes(x)) }
    const keep = working.skills.filter(related)
    if (keep.length === working.skills.length) { setAiNote('Every skill on your résumé already relates to this job.'); return }
    if (keep.length < 3) { setAiNote('Fewer than three of your skills appear in this posting, so nothing was removed — a thin skills list reads worse than a long one.'); return }
    setWorking((w) => ({ ...w, skills: keep }))
    setAiNote(`Removed ${working.skills.length - keep.length} skill${working.skills.length - keep.length === 1 ? '' : 's'} the posting never mentions. Restore them in the Editor tab.`)
  }

  function onChip(key: (typeof CHIPS)[number]['key']) {
    if (key === 'verbs') void askAi('Open each line with a stronger past-tense action verb.', 'latest')
    else if (key === 'summary') void askAi('Shorten this and remove filler words.', 'summary')
    else pruneSkills()
  }

  // ---- the page's highlights -------------------------------------------------------------------------------------------
  const beforeOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of changes) if (c.after && c.before !== null && c.kind !== 'skills') m.set(c.after, c.before)
    return m
  }, [changes])
  const decorate = (text: string): ReactNode => {
    if (!beforeOf.has(text)) return text
    return <mark className="rounded-sm bg-brand-2/15 px-0.5 text-inherit">{markInserted(text, beforeOf.get(text) ?? '', keywords)}</mark>
  }

  // ---- the summary of what changed -------------------------------------------------------------------------------------
  const nBullets = changes.filter((c) => c.kind === 'bullet').length
  const summaryChanged = changes.some((c) => c.kind === 'summary')
  const skillsChange = changes.find((c) => c.kind === 'skills')
  const lead =
    now === null || before === null ? 'Your new résumé is ready.'
    : changes.length === 0 ? `Your score is ${tenth(before)} — nothing has changed yet.`
    : now > before ? `Great! Your score jumped from ${tenth(before)} to ${tenth(now)}.`
    : now === before ? `Your score holds at ${tenth(now)}.`
    : `Your score is ${tenth(now)} (it was ${tenth(before)}) — undo a change to bring it back.`

  if (!res) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center print:hidden">
        {error ? <p className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{error}</p> : null}
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="bg-brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {running ? 'Tailoring to this posting…' : 'Tailor my résumé for this role'}
        </button>
        {running ? <p className="mt-3 text-xs text-muted-foreground">Usually 10–30 seconds. Your saved résumé is not changed.</p> : null}
      </div>
    )
  }

  return (
    <div className="print:hidden">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
        {/* ---- left: the score, what changed, the three tabs ---- */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Score for this posting">
            <div className="flex items-center gap-4">
              <Gauge value={tenth(now)} small />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-snug tracking-[-0.03em] text-primary">{lead}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {scoring ? <Loader2 className="mr-1 inline size-3 animate-spin align-[-1px]" aria-label="Scoring" /> : null}
                  ATS score against this posting — the same check as the free ATS checker, re-run on every change.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs font-semibold text-primary">See what&rsquo;s changed</p>
              {changes.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">Nothing — this is your saved résumé.</p>
              ) : (
                <ul className="mt-1.5 space-y-1 text-xs leading-5 text-muted-foreground">
                  {summaryChanged ? <li>Summary updated to speak to this role</li> : null}
                  {nBullets ? <li>Enhanced {nBullets} work-experience bullet{nBullets === 1 ? '' : 's'}</li> : null}
                  {skillsChange ? <li>Skills {skillsChange.note ? `— ${skillsChange.note}` : 'changed'}</li> : null}
                </ul>
              )}
              <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <p>Every rewrite was checked against your own lines{res.providerLabel ? `, after ${res.providerLabel} drafted it` : ''}.</p>
                  {res.reverted.length ? (
                    <details className="mt-1">
                      <summary className="cursor-pointer font-semibold text-primary">{res.reverted.length} refused — see why</summary>
                      <ul className="mt-1.5 space-y-1.5">
                        {res.reverted.map((r, i) => (
                          <li key={i} className="rounded-lg bg-secondary/60 p-2">
                            <span className="line-through">{r.rewritten}</span>
                            <span className="mt-0.5 block text-primary">Refused: {r.reason}.</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card" aria-label="Edit your new résumé">
            <div role="tablist" aria-label="Edit your new résumé" className="grid grid-cols-3 border-b border-border">
              {([['rewrite', 'AI Rewrite'], ['editor', 'Editor'], ['style', 'Style']] as const).map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={`relative py-3 text-sm font-semibold transition-colors ${tab === k ? 'text-primary after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-accent' : 'text-muted-foreground hover:text-primary'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'rewrite' ? (
                <div className="space-y-3">
                  <p className="text-xs leading-5 text-muted-foreground">Tell the AI what you want. It only rewrites lines you already wrote — it cannot add a number, employer or skill you do not have.</p>
                  <div className="flex flex-col gap-2">
                    {CHIPS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => onChip(c.key)}
                        disabled={aiBusy}
                        className="rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-primary transition hover:border-accent/60 disabled:opacity-60"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex items-center gap-2 rounded-2xl border border-border bg-background py-1.5 pl-4 pr-1.5 focus-within:border-accent"
                    onSubmit={(e) => { e.preventDefault(); if (instruction.trim().length >= 3) void askAi(instruction.trim(), 'both') }}
                  >
                    <input
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Ask the AI to change your summary or latest role…"
                      aria-label="Tell the AI what to change"
                      maxLength={160}
                      className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted-foreground"
                    />
                    <button type="submit" disabled={aiBusy || instruction.trim().length < 3} aria-label="Send" className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-40">
                      {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                    </button>
                  </form>
                  {aiNote ? <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-primary">{aiNote}</p> : null}
                </div>
              ) : null}

              {tab === 'editor' ? (
                <div className="space-y-5">
                  <p className="text-xs leading-5 text-muted-foreground">Change any line. The page on the right and the score update as you type. Purple lines are the ones the AI changed — Undo puts yours back.</p>
                  {aiNote ? <p role="status" className="rounded-xl bg-secondary px-3 py-2 text-xs leading-5 text-primary">{aiNote}</p> : null}

                  {working.summary !== null ? (
                    <EditorBlock title="Summary">
                      <LineEditor
                        value={working.summary ?? ''}
                        original={original.summary ?? ''}
                        rows={4}
                        busy={lineBusy === 'summary'}
                        onChange={setSummary}
                        onAi={() => rewriteLine('summary', working.summary ?? '', setSummary)}
                      />
                    </EditorBlock>
                  ) : null}

                  {working.experience.map((e, i) =>
                    e.bullets.length ? (
                      <EditorBlock key={i} title={[e.title, e.employer].filter(Boolean).join(' · ') || `Role ${i + 1}`}>
                        <div className="space-y-2">
                          {e.bullets.map((b, j) => (
                            <LineEditor
                              key={j}
                              value={b}
                              original={original.experience[i]?.bullets[j] ?? b}
                              rows={3}
                              busy={lineBusy === `${i}:${j}`}
                              onChange={(t) => setBullet(i, j, t)}
                              onAi={() => rewriteLine(`${i}:${j}`, b, (t) => setBullet(i, j, t))}
                            />
                          ))}
                        </div>
                      </EditorBlock>
                    ) : null,
                  )}

                  <EditorBlock title="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {working.skills.map((s) => (
                        <span key={s} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs ${keywords.some((k) => k.toLowerCase() === s.toLowerCase()) ? 'bg-score-high/15 text-score-high' : 'bg-secondary text-primary'}`}>
                          {s}
                          <button type="button" aria-label={`Remove ${s}`} onClick={() => setWorking((w) => ({ ...w, skills: w.skills.filter((x) => x !== s) }))} className="text-muted-foreground hover:text-primary"><X className="size-3" /></button>
                        </span>
                      ))}
                    </div>
                    {skillsChange ? (
                      <button type="button" onClick={() => setWorking((w) => ({ ...w, skills: original.skills }))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">
                        <Undo2 className="size-3" /> Restore my original skills
                      </button>
                    ) : null}
                  </EditorBlock>
                </div>
              ) : null}

              {tab === 'style' ? <ResumeStyleControls style={effective} onChange={(next) => { setFit(false); setStyle(next) }} /> : null}
            </div>
          </section>
        </aside>

        {/* ---- right: the page ---- */}
        <section className={`min-w-0 lg:sticky ${embedded ? 'lg:top-2' : 'lg:top-20'} lg:self-start`} aria-label="Your new résumé">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Pencil className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={fileName}
                onChange={(e) => setFileBase(e.target.value.replace(/[\\/:*?"<>|]/g, ''))}
                aria-label="File name"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-primary outline-none"
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-primary">
              <input type="checkbox" role="switch" checked={fit} onChange={(e) => setFit(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
              Fit to one page
            </label>
            <button type="button" onClick={saveVersion} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-primary hover:border-accent/60 disabled:opacity-60">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save
            </button>
            <button type="button" onClick={() => setExportOpen(true)} className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold">
              <FileDown className="size-3.5" /> Download résumé
            </button>
            {applyUrl ? (
              <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-primary hover:border-accent/60">
                Apply now
              </a>
            ) : null}
          </div>
          <p role="status" className="mb-2 min-h-4 text-[11px] text-muted-foreground">
            {fit && fitRes
              ? fitRes.fits ? `Fits one page (estimated, about ${estimatePagesForStyle(working, effective).toFixed(1)}).` : 'Still more than a page with the tightest spacing — shorten older roles or long bullets.'
              : null}
            {note ? ` ${note}` : null}
          </p>
          <PaperBox blocks={blocks} style={effective} decorate={decorate} onPages={setPages} pages={pages} />
        </section>
      </div>

      <ExportDrawer
        open={exportOpen}
        onOpenChange={setExportOpen}
        sections={working}
        targetRole={roleTitle}
        style={effective}
        onStyle={(next) => { setFit(false); setStyle(next) }}
        fileName={fileName}
        onWord={exportWord}
        busy={busy}
        note={note}
      />
    </div>
  )
}

/** The page, scaled to the column it sits in and never larger than life, with its page count underneath. */
function PaperBox({ blocks, style, decorate, onPages, pages }: { blocks: ReturnType<typeof buildDoc>; style: ResumeStyle; decorate: (t: string) => ReactNode; onPages: (n: number) => void; pages: number }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.7)
  const paperW = (style.page === 'letter' ? 8.5 : 8.27) * 96
  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(Math.min(1, el.clientWidth / paperW))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [paperW])
  return (
    <div ref={box} className="max-h-[calc(100vh-11rem)] min-h-[24rem] overflow-y-auto rounded-2xl border border-border bg-secondary/40 p-2">
      <div style={{ zoom: scale, width: paperW }} className="mx-auto">
        <ResumePaper blocks={blocks} style={style} onPages={onPages} decorate={decorate} />
      </div>
      <p className="pointer-events-none sticky bottom-1 mx-auto mt-2 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground" aria-live="polite">
        {pages} {pages === 1 ? 'page' : 'pages'}
      </p>
    </div>
  )
}

function EditorBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 border-b border-border pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h4>
      {children}
    </div>
  )
}

/** One editable line. Marked when it differs from the saved résumé, with Undo and a one-line AI rewrite. */
function LineEditor({ value, original, rows, busy, onChange, onAi }: { value: string; original: string; rows: number; busy: boolean; onChange: (t: string) => void; onAi: () => void }) {
  const changed = value !== original
  return (
    <div className={`rounded-xl border p-2 ${changed ? 'border-brand-2/60 bg-brand-2/5' : 'border-border bg-background'}`}>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Edit this line"
        className="w-full resize-y bg-transparent text-sm leading-6 text-primary outline-none"
      />
      <div className="flex items-center gap-2 text-[11px]">
        {changed ? <span className="font-semibold text-brand-2">Changed</span> : <span className="text-muted-foreground">As you wrote it</span>}
        <span className="ml-auto flex items-center gap-1">
          {changed ? (
            <button type="button" onClick={() => onChange(original)} aria-label="Undo this change" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-muted-foreground hover:bg-secondary hover:text-primary">
              <Undo2 className="size-3" /> Undo
            </button>
          ) : null}
          <button type="button" onClick={onAi} disabled={busy} aria-label="Rewrite this line with AI" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-60">
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />} Rewrite
          </button>
        </span>
      </div>
    </div>
  )
}

function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Marks posting keywords the rewrite added. Text nodes only. */
function markInserted(text: string, before: string, keywords: string[]): ReactNode {
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
