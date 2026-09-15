'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  AlertCircle, ArrowRight, CheckCircle2, Download, FileText, Loader2, Lock, RotateCcw,
  ShieldCheck, Sparkles, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ResumePreview } from '@/components/features/resume-preview'
import { readResumeFile } from '@/app/actions/read-resume-file'
import { checkResumeForAts } from '@/app/actions/ats-check'
import { optimiseResume } from '@/app/actions/optimise-resume'
import { downloadOptimisedResume } from '@/app/actions/resume-download'
import { rewriteBullet } from '@/app/actions/rewrite-bullet'
import { matchesInIndex } from '@/app/actions/index-match'
import { saveResumeToAccount } from '@/app/actions/resume-documents'
import { TEMPLATES, DEFAULT_TEMPLATE, type TemplateId } from '@/lib/resume-templates'
import type { IndexMatchCount } from '@/lib/services/index-match'
import { ReportRail } from '@/components/features/report-rail'
import { FindingDetail, MarketColumn } from '@/components/features/finding-detail'
import { GapTable } from '@/components/features/gap-table'
import {
  checkResume, marketCoverage, rolesWithKeywords, MIN_RESUME_CHARS,
  type LayoutFacts,
  type AtsReport,
} from '@/lib/ats-check'
import { buildGapTable } from '@/lib/gap-table'
import { parseSections, sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { fixFor, applyEdit, applyDateNormalisation, type FixEdit } from '@/lib/resume-fix'
import type { BulletChange } from '@/lib/resume-rewrite'

/**
 * The ATS funnel, end to end: upload → score → rewrite → download.
 *
 * ⚠️ IT REPLACED A SINGLE PASTE BOX, AND THE UPLOAD IS THE POINT. Nobody has
 * their résumé as plain text. Asking a stranger to open their PDF, select all
 * and copy is a step that loses most of them before the tool has said anything
 * — and the paste itself destroys the layout, which is the thing being
 * measured. A résumé that fails because it is a two-column PDF cannot be
 * diagnosed from text somebody pasted out of it. The paste box survives as a
 * fallback for a file we cannot read, never as the front door.
 *
 * ⚠️ THE MODEL BOUNDARY IS DRAWN ON SCREEN WHERE IT IS DRAWN IN THE CODE.
 * Upload, parse, score and every finding are deterministic. The rewrite is the
 * only model call in the flow and it is labelled at the moment the candidate
 * asks for it. The page's promise is not "no AI" — it is "no AI decided your
 * score", which is a stronger and checkable claim.
 *
 * ⚠️ NOTHING IS PERSISTED ANYWHERE, INCLUDING IN THE BROWSER. No localStorage,
 * no draft saving, no analytics on the text. A résumé is the most sensitive
 * thing this product touches, and caching it here would make the promise on the
 * page false without a line of server code changing.
 */

const FIELD =
  'w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none ' +
  'transition-colors placeholder:text-muted-foreground hover:border-foreground/30 ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/10'

const LABEL = 'mb-2 block text-sm font-semibold text-primary'


const ROLES = rolesWithKeywords()
const ROLE_GROUPS = [{ label: 'Roles we measure postings for', options: ROLES.map((value) => ({ value })) }]

type Step = 'input' | 'report' | 'preview'

type Optimised = {
  sections: ResumeSections
  changes: BulletChange[]
  reverted: BulletChange[]
  projected: AtsReport
  providerLabel: string
  target: 'job-description' | 'role-vocabulary'
}

export function AtsFlow() {
  const [step, setStep] = useState<Step>('input')
  const [file, setFile] = useState<File>()
  const [resumeText, setResumeText] = useState('')
  const [pastedFallback, setPastedFallback] = useState(false)
  const [targetRole, setTargetRole] = useState('')
  const [jdText, setJdText] = useState('')
  const [showJd, setShowJd] = useState(false)

  const [report, setReport] = useState<AtsReport>()
  /**
   * The uploaded PDF's geometry, held for the whole session.
   *
   * ⚠️ IT IS DELIBERATELY NOT CLEARED AS FIXES ARE APPLIED. Every accepted fix
   * re-renders the working document through sectionsToText(), which is single
   * column by construction — so dropping this would make a two-column résumé
   * silently stop being two-column after the user fixed an unrelated bullet.
   * The finding describes THEIR FILE, and their file is unchanged until they
   * take the rebuilt one from the preview step. That rebuild runs server-side
   * with no layout at all, which is why the projected score there is allowed to
   * clear the column finding: that document really is one column.
   */
  const [layout, setLayout] = useState<LayoutFacts>()
  const documentRef = useRef<HTMLDivElement>(null)
  const [optimised, setOptimised] = useState<Optimised>()
  const [error, setError] = useState<string>()
  const [needsSignIn, setNeedsSignIn] = useState(false)

  /**
   * The working document, and the score recomputed from it after every fix.
   *
   * ⚠️ THE RE-SCORE RUNS IN THE BROWSER, AND THAT IS NOT THE "SECOND OPINION ON
   * THE CLIENT" THIS CODEBASE BANS. The banned thing is a client that
   * REIMPLEMENTS a check and then disagrees with the server about the same
   * document. This calls checkResume() — the identical pure function, already
   * in this bundle because the role picker imports from the same module — so
   * the two cannot disagree. What it buys is the thing the whole feature turns
   * on: the score moving the instant a fix is accepted, with no round trip and
   * no rate limit standing between a candidate and their own edit.
   */
  const [sections, setSections] = useState<ResumeSections>()
  const [baseline, setBaseline] = useState<number>()
  const [selected, setSelected] = useState<string>()
  const [appliedEdits, setAppliedEdits] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [rewriting, setRewriting] = useState<string>()
  const [indexMatch, setIndexMatch] = useState<IndexMatchCount>()
  const [indexBaseline, setIndexBaseline] = useState<number>()
  const [checkingIndex, setCheckingIndex] = useState(false)
  const [template, setTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [checking, startCheck] = useTransition()
  const [improving, startImprove] = useTransition()
  const [downloading, startDownload] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const ready = Boolean(file) || resumeText.trim().length >= MIN_RESUME_CHARS

  /**
   * What the right pane is answering, and the fix it can offer.
   *
   * Skipped findings stay OUT of the selection but are still counted by the
   * score — "this does not apply to me" is the candidate's judgement about
   * relevance, not a claim that a parser will now read the document. Pretending
   * otherwise would be the one dishonest number on the page.
   */
  const visibleFindings = (report?.findings ?? []).filter((f) => !skipped.has(f.id))
  const activeFinding = visibleFindings.find((f) => f.id === selected) ?? visibleFindings[0]
  const activeFix = activeFinding && sections ? fixFor(activeFinding.id, sections) : null
  /** Empty rather than undefined: every reader of this now just checks length. */
  const coverage =
    targetRole && sections ? marketCoverage(targetRole, sectionsToText(sections)) : []

  /**
   * Stage 2, and it is recomputed on every accepted fix for free.
   *
   * ⚠️ IT NEEDS A POSTING AND THERE IS NO FALLBACK, deliberately. The columns
   * are headed "This job" and "Your résumé"; with no posting there is no job,
   * and filling the left column with the role's average would put a sentence on
   * screen that no employer wrote. The market panel below already answers the
   * role-level question honestly, so the empty state here is an invitation to
   * paste, not a worse version of the table.
   */
  const gapTable =
    report && sections && jdText.trim()
      ? buildGapTable({
          jdText: jdText.trim(),
          targetRole: targetRole || undefined,
          resumeText: sectionsToText(sections),
          read: report.read,
        })
      : undefined

  function pick(f: File | undefined) {
    if (!f) return
    setFile(f)
    setError(undefined)
  }

  function check(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    startCheck(async () => {
      let text = resumeText
      // Read from the response rather than from state: setLayout has not
      // committed by the time the check below runs.
      let uploaded: LayoutFacts | undefined

      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        const read = await readResumeFile(fd)
        if (!read.ok) {
          // Never a dead end: the fallback opens with the message.
          setError(read.error)
          setPastedFallback(true)
          return
        }
        text = read.text
        setResumeText(read.text)
        setLayout(read.layout)
        uploaded = read.layout
      }

      const res = await checkResumeForAts({
        resumeText: text,
        targetRole: targetRole || undefined,
        layout: uploaded,
        jdText: jdText.trim() || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setReport(res)
      setSections(parseSections(text))
      setBaseline(res.readability.score)
      setSelected(res.findings[0]?.id)
      setStep('report')
    })
  }

  function improve() {
    setError(undefined)
    startImprove(async () => {
      const res = await optimiseResume({
        resumeText,
        targetRole,
        jdText: jdText.trim() || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOptimised({
        sections: res.sections,
        changes: res.changes,
        reverted: res.reverted,
        projected: res.projected,
        providerLabel: res.providerLabel,
        target: res.target,
      })
      setStep('preview')
    })
  }

  /**
   * Bring the marked line into view when the reader picks a different check.
   *
   * `block: 'center'` rather than 'start' because the document sits below the
   * finding: scrolling the line to the top of the viewport would push the check
   * that named it off the screen, which is the one thing the reader needs to
   * keep looking at while they judge it.
   */
  useEffect(() => {
    const marked = documentRef.current?.querySelector('[data-highlighted]')
    marked?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [selected])

  /** Re-score the working document with the same rules, and keep the rail in step. */
  function rescore(next: ResumeSections) {
    setSections(next)
    const text = sectionsToText(next)
    setResumeText(text)
    try {
      setReport(checkResume(text, targetRole || undefined, layout, jdText.trim() || undefined))
    } catch {
      // checkResume throws only on input too short to assess. A fix cannot
      // produce that, and if it somehow did, the last good report is better
      // than an empty screen.
    }
  }

  function acceptEdit(edit: FixEdit, key: string) {
    if (!sections) return
    rescore(applyEdit(sections, edit))
    setAppliedEdits((prev) => new Set(prev).add(key))
  }

  /** Rebuilding is what our own output format does anyway — see sectionsToText. */
  function rebuildLayout() {
    if (!sections) return
    rescore(applyDateNormalisation(sections))
  }

  /**
   * An answer to an ask, written into the document at the only place it can
   * honestly go. A link joins the contact line; anything else is appended to
   * the most recent role as its own line, in the candidate's own words.
   */
  function answerAsk(findingId: string, value: string) {
    if (!sections) return
    if (findingId === 'no-links') {
      rescore({ ...sections, contact: { ...sections.contact, links: [...sections.contact.links, value] } })
      return
    }
    const experience = sections.experience.map((e, i) =>
      i === 0 ? { ...e, bullets: [...e.bullets, value] } : e,
    )
    rescore({ ...sections, experience })
  }

  function skipFinding(findingId: string) {
    setSkipped((prev) => new Set(prev).add(findingId))
    setSelected(undefined)
  }

  /** The escape hatch: one line, one model call, same guard. */
  function rewriteLine(entry: number, bullet: number) {
    if (!sections) return
    const key = `${entry}:${bullet}`
    setRewriting(key)
    setError(undefined)
    void (async () => {
      const res = await rewriteBullet({
        resumeText: sectionsToText(sections),
        entry,
        bullet,
        targetRole,
        jdText: jdText.trim() || undefined,
      })
      setRewriting(undefined)
      if (!res.ok) {
        setError(res.error)
        return
      }
      const before = sections.experience[entry]?.bullets[bullet]
      if (before === undefined) return
      rescore(applyEdit(sections, { entry, bullet, before, after: res.line }))
      /**
       * ⚠️ THE KEY IS THE PLAIN ONE, NOT `ai:${key}`. FindingDetail reads
       * `appliedEdits.has(key)` where key is `${findingId}:${entry}:${bullet}`,
       * so a prefixed key could never match and a line rewritten by the model
       * never showed as applied — the button stayed live, inviting the
       * candidate to rewrite a line that had already been rewritten.
       */
      setAppliedEdits((prev) => new Set(prev).add(key))
    })()
  }

  /**
   * The score, converted into jobs.
   *
   * Runs only when the candidate asks, because it is the heaviest read on any
   * public surface here — up to 150 postings with their requirements. The first
   * result becomes the baseline, so every later check reads as a delta rather
   * than a fresh number.
   */
  function checkIndex() {
    if (!sections || !targetRole) return
    setCheckingIndex(true)
    setError(undefined)
    void (async () => {
      const res = await matchesInIndex({
        resumeText: sectionsToText(sections),
        targetRole,
        skills: sections.skills,
      })
      setCheckingIndex(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setIndexBaseline((prev) => prev ?? res.strong)
      setIndexMatch(res)
    })()
  }

  /** Keep it. The same wall as the download, for the same reason. */
  function keep() {
    if (!optimised) return
    setSaving(true)
    setError(undefined)
    setNeedsSignIn(false)
    void (async () => {
      const res = await saveResumeToAccount({ sections: optimised.sections, targetRole })
      setSaving(false)
      if (!res.ok) {
        setNeedsSignIn(Boolean(res.needsSignIn))
        setError(res.error)
        return
      }
      setSaved(true)
    })()
  }

  function download() {
    if (!optimised) return
    setError(undefined)
    setNeedsSignIn(false)
    startDownload(async () => {
      const res = await downloadOptimisedResume({
        sections: optimised.sections,
        targetRole,
        template,
      })
      if (!res.ok) {
        setNeedsSignIn(Boolean(res.needsSignIn))
        setError(res.error)
        return
      }
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="mt-8">
      {/* ---------------------------------------------------------------- 1 */}
      {step === 'input' && (
        <form onSubmit={check}>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pick(e.dataTransfer.files?.[0])
            }}
            className="rounded-2xl border border-dashed border-input bg-card p-8 text-center transition-colors hover:border-accent/50"
          >
            <input
              ref={inputRef}
              id="ats-file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="size-6 text-accent" aria-hidden="true" />
                <p className="text-sm font-semibold text-primary">{file.name}</p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Upload your résumé
                </button>
                <p className="text-xs text-muted-foreground">
                  PDF or Word (.docx), up to 5 MB — or drop it here.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  We read it in the request and drop it. It is never stored.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Combobox
              label="The role you are targeting"
              value={targetRole}
              groups={ROLE_GROUPS}
              placeholder="Search roles — Product Analyst, Backend Engineer…"
              helper={`We compare your résumé against terms measured across real postings for that role. ${ROLES.length} roles available.`}
              onChange={setTargetRole}
            />
          </div>

          {/*
            The JD is OURS, not the reference tool's — and it is optional by
            design. A candidate checking their résumé in general has no posting
            in hand, and demanding one would turn a five-second tool into a
            task. When they do have one, the rewrite aims at that posting's own
            words instead of the role's average.
          */}
          <div className="mt-6">
            {showJd ? (
              <>
                <label htmlFor="ats-jd" className={LABEL}>
                  Paste the job description{' '}
                  <span className="font-normal text-muted-foreground">— optional</span>
                </label>
                <textarea
                  id="ats-jd"
                  rows={6}
                  className={FIELD}
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder="Paste the posting you are aiming at. With one, the rewrite uses that employer's own words; without one, it uses the vocabulary measured across every posting we index for the role."
                />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowJd(true)}
                className="text-sm font-semibold text-primary underline underline-offset-4"
              >
                Have a specific job description? Paste it — optional
              </button>
            )}
          </div>

          {(pastedFallback || !file) && (
            <div className="mt-6">
              <label htmlFor="ats-resume" className={LABEL}>
                {pastedFallback ? 'Paste your résumé text instead' : 'Or paste the text'}{' '}
                <span className="font-normal text-muted-foreground">— optional if you uploaded a file</span>
              </label>
              <textarea
                id="ats-resume"
                rows={pastedFallback ? 10 : 4}
                className={FIELD}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Select all in your PDF or Word file and paste it here."
              />
            </div>
          )}

          <Button type="submit" disabled={!ready || checking} className="mt-6 w-full sm:w-auto">
            {checking ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Reading your résumé…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Check my ATS score
              </span>
            )}
          </Button>
          {!ready && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Upload a file, or paste at least {MIN_RESUME_CHARS} characters.
            </p>
          )}
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-2 rounded-2xl border border-destructive/40 bg-card p-5 text-sm leading-6 text-destructive shadow-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error}</p>
            {needsSignIn && (
              <Link
                href="/signin"
                className="mt-2 inline-flex items-center gap-1.5 font-semibold text-primary underline underline-offset-4"
              >
                Sign in and come back <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- 2 */}
      {step === 'report' && report && (
        <div
          // Read by ToolPage via :has() — see the note there. The report and the
          // document need the width the "before you paste" column is holding.
          data-report
          className="mt-2 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]"
        >
          <ReportRail
            report={report}
            skipped={skipped}
            selected={selected}
            onSelect={setSelected}
            targetRole={targetRole}
            postings={report.role?.postings}
            onChangeRole={() => setStep('input')}
            baseline={baseline}
            indexMatch={indexMatch}
            indexBaseline={indexBaseline}
            onCheckIndex={checkIndex}
            checkingIndex={checkingIndex}
          />

          <div className="min-w-0">
            {/*
              ⚠️ STAGE 2 SITS AT THE TOP OF THIS PANE, AND THE POSITION IS THE
              POINT OF TASK-083. The founder's objection to the old screen was
              that the thing a candidate came for was "demoted to the page
              bottom", and the one question they arrive with is "does my résumé
              answer THIS job?". Answering it below a scrolling list of
              formatting findings answers it after they have left.
            */}
            {gapTable ? (
              <div className="mb-6">
                <GapTable table={gapTable} roleName={targetRole || undefined} />
              </div>
            ) : (
              <div className="mb-6 rounded-2xl border border-dashed border-input bg-card p-5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  This job, beside your résumé
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Paste the posting you are aiming at and we will lay it beside your résumé, one row
                  per dimension — the title, the years it asks for, the skills it names and any
                  qualification it states — each opening into the sentence it was read from. It
                  costs nothing and no model runs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowJd(true)
                    setStep('input')
                  }}
                  className="mt-3 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Paste a job description
                </button>
              </div>
            )}

            {activeFinding ? (
              <FindingDetail
                finding={activeFinding}
                fix={activeFix}
                appliedEdits={appliedEdits}
                onApplyEdit={acceptEdit}
                onApplyLayout={rebuildLayout}
                onAnswer={answerAsk}
                onSkip={skipFinding}
                onRewrite={rewriteLine}
                rewriting={rewriting}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-primary">
                  {report.findings.length === 0
                    ? 'Nothing left to fix.'
                    : `${report.findings.length} ${report.findings.length === 1 ? 'thing' : 'things'} to fix`}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.findings.length === 0
                    ? 'A parser should read this cleanly. Take the file, or rewrite it against a specific posting below.'
                    : 'Pick any check on the left. Wherever there is a line to quote, it is shown and marked in your résumé below — and most can be fixed in one click without a model running.'}
                </p>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    What a parser read out of it
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ['Current title', report.read.currentTitle],
                      ['Employer', report.read.employer],
                      ['City', report.read.city],
                      [
                        'Years of experience',
                        report.read.yearsExperience !== undefined ? String(report.read.yearsExperience) : undefined,
                      ],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between gap-3 border-b border-border pb-2">
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className={`text-right text-sm ${value ? 'text-primary' : 'italic text-muted-foreground'}`}>
                          {value || 'nothing'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {/*
              ⚠️ THE DOCUMENT ITSELF, WHICH THE REPORT HAS NEVER SHOWN.
              Until now the résumé appeared only AFTER the whole-document
              rewrite, so every finding on this screen described a line the
              candidate had to picture from a quotation. The category leader
              puts the document beside the checks, and that is the right shape:
              a finding is an assertion about a specific line, and the fastest
              way to judge an assertion is to look at what it is about.

              It sits below the finding rather than in a third column on
              purpose. Nesting another rail inside ToolPage's own two-column
              shell already squeezes this pane; a third would leave the document
              too narrow to read on the laptop screens most people use.
            */}
            {sections && (
              <section className="mt-6" aria-label="Your résumé, with the selected line marked">
                <div className="flex items-baseline justify-between gap-3 px-1 pb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Your résumé, as we read it
                  </p>
                  {activeFinding?.evidence ? (
                    <p className="text-xs text-muted-foreground">Marked: the line this check came from</p>
                  ) : null}
                </div>
                <div ref={documentRef}>
                  <ResumePreview
                    sections={sections}
                    targetRole={targetRole || undefined}
                    highlight={activeFinding?.evidence}
                  />
                </div>
                <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground">
                  This is the structure a parser recovered, not a picture of your original file — which is the
                  point: anything missing here is missing for an applicant tracking system too. The highlight is
                  ours and never appears in the document you download.
                </p>
              </section>
            )}

            {/*
              The market panel, standing on its own rather than hiding inside a
              finding. It answers a question about the ROLE — what do employers
              hiring for this actually write — which is true regardless of which
              check the reader is looking at, and is the one thing on this page
              built from data a résumé tool without an index cannot obtain.
            */}
            {targetRole && coverage.length > 0 && (
              <div className="mt-6">
                <MarketColumn coverage={coverage} />
              </div>
            )}

            {/* The whole-document rewrite stays, demoted: it is the shortcut for
                somebody who does not want to work through the list. */}
            <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6">
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-primary">
                Or rewrite the whole thing at once
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every line rewritten against{' '}
                {jdText.trim() ? 'the job description you pasted' : `${targetRole || 'the role'} postings we index`}, in
                one pass, with each change shown beside what it replaced.
              </p>
              {!targetRole && (
                <p className="mt-3 text-xs font-semibold text-primary">Pick a target role first.</p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={improve} disabled={improving || !targetRole}>
                  {improving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Rewriting…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="size-4" aria-hidden="true" />
                      Rewrite everything
                    </span>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary"
                >
                  Check a different file
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {step === 'preview' && optimised && report && (
        <div className="mt-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Same check, run again on the rewrite
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Before</p>
                <p className="font-mono text-3xl tabular-nums text-muted-foreground">
                  {report.readability.score}
                </p>
              </div>
              <ArrowRight className="mb-2 size-5 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-xs text-muted-foreground">After</p>
                <p className="font-mono text-4xl font-semibold tabular-nums text-accent">
                  {optimised.projected.readability.score}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Not an estimate: the rewritten document was put back through the same rules, with the same
              arithmetic. Paste it into this checker yourself and you will get this number.{' '}
              {optimised.target === 'job-description'
                ? 'Tailored to the job description you pasted.'
                : `Tailored to ${targetRole} postings.`}{' '}
              Written with {optimised.providerLabel}.
            </p>
          </div>

          {/*
            Three templates, all of which pass our own checker — the test in
            src/lib/__tests__/resume-templates.test.ts is what makes that claim
            safe to print beside them.
          */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Template
            </span>
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                aria-pressed={template === t.id}
                title={t.note}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  template === t.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-primary'
                }`}
              >
                {t.name}
              </button>
            ))}
            <span className="w-full text-xs leading-5 text-muted-foreground">
              {TEMPLATES.find((t) => t.id === template)?.note} All three are one column, real text, no
              tables — every one passes the check on the previous screen.
            </span>
          </div>

          <div className="mt-4">
            <ResumePreview sections={optimised.sections} targetRole={targetRole} template={template} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-primary">
                  Take the file
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A Word document, not a PDF — the format applicant tracking systems parse best, and one
                  you can keep editing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={keep}
                  disabled={saving || saved}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="size-4 text-accent" aria-hidden="true" /> Saved to your account
                    </>
                  ) : (
                    <>
                      <FileText className="size-4" aria-hidden="true" /> Keep this résumé
                    </>
                  )}
                </button>
              <Button type="button" onClick={download} disabled={downloading}>
                {downloading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Building…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Download className="size-4" aria-hidden="true" />
                    Download .docx
                  </span>
                )}
              </Button>
              </div>
            </div>
            <p className="mt-4 inline-flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Reading it is free and always will be. Signing in is what turns it into a file — and it is
              what lets us show you roles scored against this résumé tomorrow morning.
            </p>
          </div>

          <Changes changes={optimised.changes} reverted={optimised.reverted} />

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => setStep('report')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Back to the findings
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


/**
 * What changed, and what we refused to change.
 *
 * ⚠️ THE REFUSALS ARE THE PERSUASIVE HALF AND THEY ARE SHOWN FIRST WHEN THERE
 * ARE ANY. A trust badge over a black box is worth nothing; a list of the lines
 * our own model wrote and our own filter threw out is worth something, because
 * it is evidence against ourselves.
 */
function Changes({ changes, reverted }: { changes: BulletChange[]; reverted: BulletChange[] }) {
  const kept = changes.filter((c) => c.kept)
  if (changes.length === 0) return null

  return (
    <div className="mt-6 space-y-6">
      {reverted.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {reverted.length} rewrite{reverted.length === 1 ? '' : 's'} we threw out
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Our own model wrote these and our own filter refused them. Your original line was kept in
            every case — nothing was lost.
          </p>
          <div className="mt-4 space-y-4">
            {reverted.map((c, i) => (
              <div key={i} className="border-l-2 border-destructive/30 pl-3">
                <p className="text-sm leading-6 text-muted-foreground line-through">{c.rewritten}</p>
                <p className="mt-1 text-xs font-semibold text-destructive">{c.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kept.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {kept.length} line{kept.length === 1 ? '' : 's'} rewritten
          </p>
          <div className="mt-4 space-y-5">
            {kept.map((c, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground line-through">{c.original}</p>
                <p className="mt-1 text-sm leading-6 text-primary">{c.rewritten}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
