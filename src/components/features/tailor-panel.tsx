'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, Download, FileText, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { tailorFromPastedJd, type TailorJdResponse } from '@/app/actions/tailor-jd'
import { downloadTailoredDocx } from '@/app/actions/tailor-docx'

/**
 * "Now tailor my résumé for this role" — the conversion step of the hook.
 *
 * Sits under the match score on /tools/paste-jd, which already collects exactly
 * what tailoring needs: a posting and a résumé. Reusing that form rather than
 * building a third one keeps the candidate in a single flow — score, then
 * rewrite, then take the file.
 *
 * ⚠️ THE WALL IS AT THE DOWNLOAD, NOT THE DRAFT. Anyone can see the tailored
 * bullets; signing in is what turns them into a file. That is deliberate: the
 * hook has to prove the tailoring is good BEFORE asking for anything, and a
 * candidate who has read three bullets about their own work has had the
 * question answered honestly either way.
 *
 * ⚠️ WHAT THE FILTER REMOVED IS SHOWN, NOT HIDDEN. src/lib/tailor.ts drops any
 * bullet stating a figure, naming an employer the candidate never listed,
 * claiming more years than their résumé shows, or asserting a credential they
 * do not hold. Showing the removals is what makes the badge above them mean
 * anything — a trust mark over a black box is worth nothing.
 */
export function TailorPanel({
  jdText,
  resumeText,
  jdTitle,
}: {
  jdText: string
  resumeText: string
  jdTitle: string
}) {
  const [result, setResult] = useState<Extract<TailorJdResponse, { ok: true }> | null>(null)
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signInNeeded, setSignInNeeded] = useState(false)
  const [pending, start] = useTransition()
  const [saving, startSaving] = useTransition()

  function tailor() {
    setError(null)
    start(async () => {
      const res = await tailorFromPastedJd({
        jdText,
        resumeText,
        jdTitle: jdTitle.trim() || undefined,
        company: company.trim() || undefined,
      })
      if (!res.ok) { setError(res.error); setResult(null); return }
      setResult(res)
    })
  }

  function download() {
    if (!result) return
    setError(null)
    setSignInNeeded(false)
    startSaving(async () => {
      const res = await downloadTailoredDocx({
        bullets: result.draft.bullets,
        coverNote: result.draft.coverNote,
        roleTitle: jdTitle.trim() || 'this role',
        company: company.trim() || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        setSignInNeeded(Boolean(res.needsSignIn))
        return
      }
      // The action returns base64 because a Server Action's return value is
      // JSON; the browser turns it back into a real file here.
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

  if (!result) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Next step
        </p>
        <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-primary">
          Rewrite your résumé for this role
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Using only what your own résumé says. Anything that cannot be grounded in it
          is removed rather than softened, and you are shown what went.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10 sm:max-w-64"
            aria-label="Company"
            placeholder="Company (optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <Button type="button" onClick={tailor} disabled={pending} className="shrink-0">
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Writing…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-4" aria-hidden="true" />
                Tailor my résumé
              </span>
            )}
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-3 flex gap-2 text-sm leading-6 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Tailored for this posting
      </p>

      <h3 className="mt-3 text-sm font-semibold text-primary">Experience bullets</h3>
      <ul className="mt-3 space-y-2.5">
        {result.draft.bullets.map((b) => (
          <li key={b} className="flex gap-2.5 text-sm leading-6 text-primary">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>

      {result.draft.coverNote && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-primary">Cover note</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {result.draft.coverNote}
          </p>
        </>
      )}

      {/* The badge is a filter, not a label — so what it removed is on the page. */}
      <div className="mt-6 rounded-xl border border-border bg-secondary/40 p-4">
        <p className="flex items-center gap-2 text-xs font-semibold text-primary">
          <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
          Every line above is grounded in the résumé you pasted
        </p>
        <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
          Read as{' '}
          {[result.readAs.currentTitle, result.readAs.employer].filter(Boolean).join(' at ') ||
            'your résumé'}
          {result.readAs.yearsExperience !== null && `, ${result.readAs.yearsExperience} years`}.
          Written by {result.providerLabel}; nothing was stored.
        </p>
        {result.draft.dropped.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-primary">
              {result.draft.dropped.length} line
              {result.draft.dropped.length === 1 ? ' was' : 's were'} removed — see what and why
            </summary>
            <ul className="mt-2 space-y-2">
              {result.draft.dropped.map((d) => (
                <li key={d.text} className="text-xs leading-5 text-muted-foreground">
                  <span className="line-through">{d.text}</span>
                  <span className="mt-0.5 block text-accent">— {d.reason}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" onClick={download} disabled={saving} className="shrink-0">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Building…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Download className="size-4" aria-hidden="true" />
              Download as Word
            </span>
          )}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          <FileText className="mr-1 inline size-3.5" aria-hidden="true" />
          .docx, not PDF — Word files are what an ATS parses most reliably.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-border bg-background p-4">
          <p className="flex gap-2 text-sm leading-6 text-primary">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            {error}
          </p>
          {signInNeeded && (
            <Link
              href="/signin"
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Sign in — free, no card
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
