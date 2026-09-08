'use client'

import { useRef, useState, useTransition } from 'react'
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
import { rolesWithKeywords, MIN_RESUME_CHARS, type AtsReport, type AtsSeverity } from '@/lib/ats-check'
import type { ResumeSections } from '@/lib/parse/sections'
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

const SEVERITY: Record<AtsSeverity, { label: string; dot: string }> = {
  high: { label: 'Blocks parsing', dot: 'bg-accent' },
  medium: { label: 'Degrades parsing', dot: 'bg-accent/60' },
  low: { label: 'Worth tidying', dot: 'bg-accent/30' },
}

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
  const [optimised, setOptimised] = useState<Optimised>()
  const [error, setError] = useState<string>()
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const [checking, startCheck] = useTransition()
  const [improving, startImprove] = useTransition()
  const [downloading, startDownload] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const ready = Boolean(file) || resumeText.trim().length >= MIN_RESUME_CHARS

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
      }

      const res = await checkResumeForAts({ resumeText: text, targetRole: targetRole || undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setReport(res)
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

  function download() {
    if (!optimised) return
    setError(undefined)
    setNeedsSignIn(false)
    startDownload(async () => {
      const res = await downloadOptimisedResume({
        sections: optimised.sections,
        targetRole,
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
        <div className="mt-2">
          <ScorePanel report={report} />

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              What a parser read out of it
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
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
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              This is our own parser, the same one our matching runs on. A field it missed is a field a
              real system plausibly misses too.
            </p>
          </div>

          <Findings report={report} />

          {report.role && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Against {report.role.name} postings
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Your résumé names{' '}
                <strong className="font-semibold text-primary">
                  {report.role.present.length} of {report.role.present.length + report.role.missing.length}
                </strong>{' '}
                terms that appear in at least a third of the{' '}
                <strong className="font-semibold text-primary">{report.role.postings}</strong>{' '}
                {report.role.name} postings we index.
              </p>
              <TermList label="Already there" terms={report.role.present} tone="accent" />
              <TermList label="Not mentioned" terms={report.role.missing} tone="muted" />
            </div>
          )}

          {/* The conversion step. Reachable only after the report, because the
              offer only means something once the problem is specific. */}
          <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/5 p-6">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-primary">
              Now let us fix it
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We will rewrite your own lines — sharper verbs, the role&rsquo;s vocabulary where your
              experience already supports it, and a layout built from the constructs that parse.{' '}
              {jdText.trim()
                ? 'Aimed at the job description you pasted.'
                : `Aimed at ${targetRole || 'the role you choose'} postings we index.`}
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              <strong className="font-semibold text-primary">This step uses a language model</strong> —
              the first and only one in this flow. It may reorder, compress and reword what you wrote.
              It may not add a figure, an employer or a qualification that is not already in your own
              line, and anything it tries is shown to you and reverted.
            </p>
            {!targetRole && (
              <p className="mt-3 text-xs font-semibold text-primary">
                Pick a target role above first — a rewrite needs something to aim at.
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={improve} disabled={improving || !targetRole}>
                {improving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Rewriting your résumé…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Improve my score
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
      )}

      {/* ---------------------------------------------------------------- 3 */}
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

          <div className="mt-6">
            <ResumePreview sections={optimised.sections} targetRole={targetRole} />
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

/** Overall score, then the four groups. The groups are what make it actionable. */
function ScorePanel({ report }: { report: AtsReport }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Your ATS score
      </p>
      <p className="mt-2 font-mono text-5xl font-semibold tabular-nums text-primary">
        {report.readability.score}
        <span className="text-lg text-muted-foreground">/100</span>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {report.categories.map((c) => (
          <div key={c.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-primary">{c.label}</p>
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {c.passed}/{c.total} checks
              </p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${c.score}%` }}
                role="progressbar"
                aria-valuenow={c.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.label} score`}
              />
            </div>
          </div>
        ))}
      </div>

      {report.readability.deductions.length === 0 ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-accent">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Nothing found. A parser should read this cleanly.
        </p>
      ) : (
        <ul className="mt-6 space-y-1.5 border-t border-border pt-4">
          {report.readability.deductions.map((d) => (
            <li key={d.id} className="flex justify-between gap-4 font-mono text-xs tabular-nums">
              <span className="text-muted-foreground">{d.title}</span>
              <span className="shrink-0 text-primary">−{d.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Findings({ report }: { report: AtsReport }) {
  if (report.findings.length === 0) return null
  return (
    <div className="mt-6 space-y-6">
      {report.categories.map((c) => {
        const mine = report.findings.filter((f) => f.category === c.key)
        if (mine.length === 0) return null
        return (
          <section key={c.key}>
            <h3 className="text-sm font-semibold tracking-[-0.02em] text-primary">
              {c.label}{' '}
              <span className="font-normal text-muted-foreground">
                — {mine.length} to fix
              </span>
            </h3>
            <div className="mt-3 space-y-3">
              {mine.map((f) => (
                <div key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${SEVERITY[f.severity].dot}`} aria-hidden="true" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {SEVERITY[f.severity].label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">{f.title}</p>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{f.detail}</p>
                  {f.evidence && (
                    <p className="mt-3 border-l-2 border-border pl-3 font-mono text-xs leading-5 text-muted-foreground">
                      {f.evidence}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-6 text-primary">{f.fix}</p>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TermList({ label, terms, tone }: { label: string; terms: string[]; tone: 'accent' | 'muted' }) {
  if (terms.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-primary">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {terms.map((t) => (
          <span
            key={t}
            className={
              tone === 'accent'
                ? 'rounded-lg bg-accent/10 px-2 py-1 text-xs font-medium text-accent'
                : 'rounded-lg bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground'
            }
          >
            {t}
          </span>
        ))}
      </div>
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
