'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, CheckCircle2, FileSearch, Loader2, Quote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkResumeForAts, type AtsCheckResponse } from '@/app/actions/ats-check'
import { MIN_RESUME_CHARS, MAX_RESUME_CHARS, type AtsSeverity } from '@/lib/ats-check'

/**
 * TASK-061 — the ATS checker surface.
 *
 * Thin on purpose, exactly like jd-match-form: it collects text, calls one
 * action, and renders what comes back. No check is evaluated here — a second
 * opinion on the client is how two surfaces begin disagreeing about the same
 * document.
 *
 * ⚠️ NOTHING IS PERSISTED, INCLUDING IN THE BROWSER. No localStorage, no draft
 * saving, no analytics on the pasted text. A résumé in a public tool is the
 * most sensitive thing this product touches, and caching it here would make the
 * promise on the page false without changing a line of server code.
 */

/** DESIGN.md's `input-field` token, one line taller. Matches jd-match-form. */
const FIELD =
  'w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none ' +
  'transition-colors placeholder:text-muted-foreground hover:border-foreground/30 ' +
  'focus:border-accent focus:ring-2 focus:ring-accent/10'

const LABEL = 'mb-2 block text-sm font-semibold text-primary'

/**
 * Severity as a word and a weight, never as a colour alone.
 *
 * `docs/DESIGN.md` reserves `destructive` for system errors, and a formatting
 * problem in someone's CV is not an error state — painting a third of the page
 * red would contradict the product's own rule that the truth is told without
 * demoralising. The label carries the meaning; the accent carries the ordering.
 */
const SEVERITY: Record<AtsSeverity, { label: string; dot: string }> = {
  high: { label: 'Blocks parsing', dot: 'bg-accent' },
  medium: { label: 'Degrades parsing', dot: 'bg-accent/60' },
  low: { label: 'Worth tidying', dot: 'bg-accent/30' },
}

const AREA: Record<string, string> = {
  parsing: 'Machine readability',
  keywords: 'Written for a filter',
  consistency: 'Two things disagree',
}

type Report = Extract<AtsCheckResponse, { ok: true }>

export function AtsCheckForm() {
  const [resumeText, setResumeText] = useState('')
  const [report, setReport] = useState<Report>()
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  const ready = resumeText.trim().length >= MIN_RESUME_CHARS

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    start(async () => {
      const res = await checkResumeForAts({ resumeText })
      if (!res.ok) {
        setError(res.error)
        setReport(undefined)
        return
      }
      setReport(res)
    })
  }

  return (
    <div className="mt-8">
      <form onSubmit={submit}>
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="ats-resume" className={LABEL}>
              Your résumé
            </label>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {resumeText.trim().length.toLocaleString('en-IN')} / {MAX_RESUME_CHARS.toLocaleString('en-IN')}
            </span>
          </div>
          <textarea
            id="ats-resume"
            rows={12}
            className={FIELD}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste it as text — select all in your PDF or Word file and copy. Pasting the text is the point: it is exactly what a parser sees."
          />
        </div>

        <Button type="submit" disabled={!ready || pending} className="w-full sm:w-auto">
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <FileSearch className="size-4" aria-hidden="true" />
              Check my résumé
            </span>
          )}
        </Button>
        {!ready && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Paste at least {MIN_RESUME_CHARS} characters so there is something to read.
          </p>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-2 rounded-2xl border border-destructive/40 bg-card p-5 text-sm leading-6 text-destructive shadow-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {report && (
        <div className="mt-10">
          {/* The score, with its arithmetic beside it rather than behind it. */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Machine readability
            </p>
            <p className="mt-2 font-mono text-4xl tabular-nums font-semibold text-primary">
              {report.readability.score}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
            {report.readability.deductions.length === 0 ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-accent">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Nothing found. A parser should read this cleanly.
              </p>
            ) : (
              <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                {report.readability.deductions.map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 font-mono text-xs tabular-nums">
                    <span className="text-muted-foreground">{d.title}</span>
                    <span className="shrink-0 text-primary">−{d.points}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* What a parser actually took away. The most persuasive panel here:
              it is a demonstration, not a claim. */}
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
                  <dd
                    className={`text-right text-sm ${value ? 'text-primary' : 'text-muted-foreground italic'}`}
                  >
                    {value || 'nothing'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {report.findings.length > 0 && (
            <div className="mt-6 space-y-4">
              {report.findings.map((f) => (
                <div key={f.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`size-1.5 shrink-0 rounded-full ${SEVERITY[f.severity].dot}`} aria-hidden="true" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {AREA[f.area] ?? f.area} · {SEVERITY[f.severity].label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-primary">{f.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.detail}</p>

                  {f.evidence && (
                    <p className="mt-3 flex gap-2 rounded-xl border border-border bg-secondary px-3 py-2">
                      <Quote className="mt-0.5 size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="font-mono text-xs leading-5 break-words text-primary">{f.evidence}</span>
                    </p>
                  )}

                  <p className="mt-3 text-sm leading-6 text-primary">
                    <span className="font-semibold">Fix: </span>
                    {f.fix}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 font-mono text-xs tabular-nums text-muted-foreground">
            {report.stats.words.toLocaleString('en-IN')} words · {report.stats.lines.toLocaleString('en-IN')} lines ·
            read and dropped, nothing stored
          </p>
        </div>
      )}
    </div>
  )
}
