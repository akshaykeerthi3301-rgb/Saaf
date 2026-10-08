'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, FileText, Sparkles, X } from 'lucide-react'
import { ScanHighlights } from '@/components/features/scan-highlights'
import { parseResume } from '@/app/actions/parse-resume'
import { confirmProfile } from '@/app/actions/confirm-profile'
import { signOut } from '@/app/actions/sign-out'
import { keepResumeFromFile } from '@/lib/keep-resume'
import { MAX_RESUME_BYTES, MAX_RESUME_MB, TOO_LARGE_MESSAGE } from '@/lib/parse/constants'
import { profileFromRead } from '@/lib/first-run'
import { clearDraft, writeDraft } from '@/lib/onboarding-store'
import { initAnalytics, track } from '@/lib/analytics'

/**
 * The first run, rebuilt on 2026-10-09 to the reference product's three screens — upload, scan, then the feed with a
 * welcome card — after the founder walked a fresh account through them. It replaces a five-screen flow (portals,
 * upload + years, reading, confirm every field, preferences, matching).
 *
 * What changed in the contract, and why it is acceptable: the profile is now SAVED FROM WHAT THE RÉSUMÉ SAYS, and the
 * check happens on the feed (the welcome card shows the level we read; /profile edits any field) instead of before
 * the first match. Nothing is guessed to make that possible — if the résumé lacks the title, employer, city, years or
 * a target role the index holds postings for, the person goes to the old check-your-details screen with what was read
 * already filled in (src/lib/first-run.ts). The file itself is still read once and dropped (parseResume persists nothing).
 */

type Phase = 'idle' | 'read' | 'match'

export function FirstRun() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string>()
  const [pct, setPct] = useState(4)
  const [slow, setSlow] = useState(false)
  const busy = phase !== 'idle'

  useEffect(() => { initAnalytics(); track('onboarding_started') }, [])

  // The bar creeps toward a ceiling for the stage it is in and only reaches 100 when the answer is back, so it can
  // never claim more than has happened. Reading the file is a few seconds; scoring is the long part (~30 s).
  useEffect(() => {
    if (phase === 'idle') return
    const ceiling = phase === 'read' ? 38 : 94
    const t = setInterval(() => setPct((p) => p + Math.max(0.15, (ceiling - p) * 0.05)), 400)
    return () => clearInterval(t)
  }, [phase])
  useEffect(() => {
    if (phase !== 'match') return
    const t = setTimeout(() => setSlow(true), 45_000)
    return () => clearTimeout(t)
  }, [phase])

  function choose(f: File | undefined) {
    setError(undefined)
    if (!f) return
    if (f.size > MAX_RESUME_BYTES) { setError(`${TOO_LARGE_MESSAGE} You can type your details in instead.`); return }
    setFile(f)
  }

  async function start() {
    if (!file || busy) return
    setError(undefined)
    setPct(4)
    setSlow(false)
    setPhase('read')
    track('resume_uploaded', { bytes: file.size, type: file.type })
    try {
      const fd = new FormData()
      fd.set('file', file)
      // The résumé's text is kept in the account alongside the profile read, so "Customize your résumé" has something to
      // tailor the moment the feed opens. Run together so it adds no time; a failure to keep never blocks the profile.
      const [read] = await Promise.all([
        parseResume(fd),
        keepResumeFromFile(file, { makePrimary: true }).catch(() => null),
      ])
      if (!read.ok) { setPhase('idle'); setError(read.error); return }

      const made = profileFromRead(read.fields, read.suggestedRole)
      if (!made.ok) {
        writeDraft({
          fields: read.fields,
          warnings: [...read.warnings, `We could not read your ${made.missing.join(', ')} from this file — add ${made.missing.length === 1 ? 'it' : 'them'} here.`],
          suggestedRole: read.suggestedRole,
          source: 'resume',
        })
        router.push('/start/confirm')
        return
      }

      setPhase('match')
      const saved = await confirmProfile({ ...made.input, openToAdjacent: false, credential: 'none' })
      if (!saved.ok) { setPhase('idle'); setError(saved.error); return }
      track('profile_confirmed')
      clearDraft()
      setPct(100)
      router.push('/today?welcome=1')
    } catch {
      setPhase('idle')
      setError('Something went wrong reading that file. Try again, or type your details in instead.')
    }
  }

  if (busy) return <ScanView phase={phase} pct={pct} slow={slow} />

  return (
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col justify-center overflow-hidden bg-[linear-gradient(145deg,color-mix(in_oklch,var(--brand)_22%,var(--card)),var(--background)_75%)] px-6 py-12 sm:px-12 lg:min-h-screen lg:px-16">
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient flex size-12 items-center justify-center rounded-full"><Sparkles className="size-5" /></span>
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-primary">
              Jobinko <span className="size-2 rounded-full bg-score-high" aria-hidden="true" />
            </p>
            <p className="text-sm text-muted-foreground">Your AI career copilot</p>
          </div>
        </div>
        <h1 className="mt-8 max-w-lg text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.045em] text-primary sm:text-5xl">
          One last step: level up your search by uploading your résumé.
        </h1>
      </section>

      <section className="relative flex min-h-[28rem] flex-col items-center justify-center px-6 py-12 sm:px-12">
        <form action={signOut} className="absolute right-5 top-5">
          <button type="submit" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-primary hover:bg-secondary">Log out</button>
        </form>

        <div className="flex w-full max-w-md flex-col items-center text-center">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files[0]) }}
            aria-label="Choose your résumé"
            className="relative flex size-40 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-secondary/70"
          >
            <FileText className="size-16" strokeWidth={1.4} />
            <span className="absolute bottom-9 right-9 flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ArrowUp className="size-4" /></span>
          </button>

          {file ? (
            <p className="mt-8 flex w-full items-center justify-between gap-3 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-medium text-primary">
              <span className="truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="text-muted-foreground hover:text-primary"><X className="size-4" /></button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-8 w-full rounded-full border border-border bg-card px-5 py-3.5 text-base font-medium text-primary transition hover:bg-secondary"
            >
              Upload your résumé
            </button>
          )}
          <p className="mt-6 text-sm text-muted-foreground">PDF or Word, up to {MAX_RESUME_MB} MB.</p>

          <p className="mt-6 rounded-2xl bg-accent/10 px-5 py-4 text-sm leading-6 text-muted-foreground">
            Your file is read once and deleted. We keep its text in your account so we can tailor it to each job — you can delete it any time on the Résumé page. Only stripped text goes to one model provider, to read it —{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-4">details</a>.
          </p>

          {error ? <p role="alert" className="mt-4 w-full rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

          <button
            type="button"
            onClick={start}
            disabled={!file}
            className="bg-brand-gradient mt-10 inline-flex min-w-48 items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Start matching
          </button>
          <button
            type="button"
            onClick={() => { writeDraft({ fields: {}, warnings: [], source: 'scratch' }); router.push('/start/confirm') }}
            className="mt-5 text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-primary"
          >
            No résumé handy? Type your details in instead
          </button>
        </div>

        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }}
        />
      </section>
    </main>
  )
}

/** The scanning screen: a bar that only ever claims what has happened, one honest line, and the rotating highlights. */
export function ScanView({ phase, pct, slow }: { phase: Exclude<Phase, 'idle'>; pct: number; slow: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-6 py-12 text-foreground">
      <div className="flex w-full max-w-xl flex-col items-center">
        <span className="flex size-20 items-center justify-center rounded-2xl border border-border bg-card text-primary"><FileText className="size-9" /></span>
        <div
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div className="bg-brand-gradient h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-6 text-center text-lg font-medium text-primary" aria-live="polite">
          {phase === 'read' ? 'Scanning your résumé for key skills, work history, and education.' : 'Finding the roles that fit you and scoring each one.'}
        </p>
        {slow ? <p className="mt-2 text-center text-sm text-muted-foreground">Taking longer than usual — there are thousands of roles to score. Still working.</p> : null}
      </div>
      <ScanHighlights />
    </main>
  )
}
