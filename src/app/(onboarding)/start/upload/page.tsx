'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, FileUp, Loader2, PenLine, ShieldCheck, UserSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OnboardingShell } from '@/components/features/onboarding-shell'
import { parseResume } from '@/app/actions/parse-resume'
import { MAX_RESUME_BYTES, MAX_RESUME_MB, TOO_LARGE_MESSAGE } from '@/lib/parse/constants'
import { writeDraft } from '@/lib/onboarding-store'
import { track } from '@/lib/analytics'

/** Screen 2 — the deletion promise sits beside the ask, not behind a link. */
export default function UploadPage() {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [years, setYears] = useState('')
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState<'resume' | 'linkedin' | 'scratch'>('resume')
  const [stage, setStage] = useState(0)

  /**
   * The staged progress bar. The three stages are the three things the parse
   * really does (sections → skills → experience), but it answers in one call,
   * so the stages advance on a timer while it runs and complete when it
   * returns. The bar never reaches the end before the answer does.
   */
  useEffect(() => {
    if (!busy) return
    const timers = [900, 2200].map((ms, i) => setTimeout(() => setStage(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [busy])

  // Asked here, before the file, and never parsed. Experience is the most
  // heavily weighted thing the scorer reads and the field a parser gets wrong
  // most often — a date range in a résumé can mean a contract, a gap, an
  // internship or a promotion, and guessing between them silently moves every
  // score. The candidate knows the number; we ask them for it.
  const yearsNum = years.trim() === '' ? NaN : Number(years)
  const yearsValid = Number.isFinite(yearsNum) && yearsNum >= 0 && yearsNum <= 50

  async function onFile(file: File) {
    setError(undefined)
    if (mode === 'linkedin' && !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('LinkedIn saves your profile as a PDF — choose that file.')
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError(`${TOO_LARGE_MESSAGE} You can type your details in instead.`)
      return
    }
    setStage(0)
    setBusy(true)
    track('resume_uploaded', { bytes: file.size, type: file.type })
    // parseResume() can reject outside its own internal try/catch — a
    // network failure or a platform-level timeout — and without this,
    // busy never clears: the button is stuck on "Reading…" forever with
    // no error shown. That silent-hang shape is exactly what got reported
    // live, distinct from the 12 error messages parseResume itself returns.
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await parseResume(fd)
      if (!res.ok) { setError(res.error); return }
      // The candidate's own number wins, always. A parsed one never overwrites it.
      writeDraft({
        fields: { ...res.fields, yearsExperience: yearsNum },
        warnings: res.warnings,
        suggestedRole: res.suggestedRole,
        source: mode === 'linkedin' ? 'linkedin' : 'resume',
      })
      setStage(3)
      router.push('/start/reading')
    } catch {
      setError('Something went wrong reading that file. You can type your details in instead.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OnboardingShell step={2}>
      <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary sm:text-3xl">
        Bring in your profile
      </h1>

      {/* Three ways in. The LinkedIn option takes the PDF LinkedIn itself
          exports — Saaf never signs in to LinkedIn or fetches a profile URL:
          scraping it breaches their terms (PROJECT-STATE, "No LinkedIn"). */}
      <div className="mt-6 grid grid-cols-3 gap-2" role="tablist" aria-label="How to bring in your profile">
        {([
          ['resume', 'Résumé file', FileUp],
          ['linkedin', 'LinkedIn PDF', UserSquare],
          ['scratch', 'Start from scratch', PenLine],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            disabled={busy}
            onClick={() => { setMode(key); setError(undefined) }}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
              mode === key ? 'bg-brand-gradient border-transparent' : 'border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-primary'
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'linkedin' ? (
        <ol className="mt-5 space-y-1.5 rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-5 text-muted-foreground">
          <li><span className="font-semibold text-primary">1.</span> Open your LinkedIn profile.</li>
          <li><span className="font-semibold text-primary">2.</span> Click <span className="font-semibold text-primary">More</span> → <span className="font-semibold text-primary">Save to PDF</span>.</li>
          <li><span className="font-semibold text-primary">3.</span> Drop that PDF below. We read it exactly like a résumé.</li>
        </ol>
      ) : null}

      {mode === 'scratch' ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-primary">Type your details in</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Title, employer, years, city and skills — about two minutes. Nothing is read from a file.
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              writeDraft({ fields: yearsValid ? { yearsExperience: yearsNum } : {}, warnings: [], source: 'scratch' })
              router.push('/start/confirm')
            }}
          >
            Start typing
          </Button>
        </div>
      ) : null}

      <div className={mode === 'scratch' ? 'hidden' : 'mt-8'}>
        <label className="mb-2 block text-sm font-semibold text-primary" htmlFor="years">
          How many years have you worked full-time?
        </label>
        {/* The reasoning behind asking rather than parsing is in the comment
            above and in docs; on screen it only has to say what to exclude. */}
        <p className="mb-3 text-xs text-muted-foreground">Excluding internships.</p>
        <input
          id="years"
          type="number"
          inputMode="decimal"
          min={0}
          max={50}
          step={0.5}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          placeholder="e.g. 3"
          className="w-full rounded-xl border border-input bg-card px-4 py-3.5 text-sm text-primary outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus:border-accent focus:ring-2 focus:ring-accent/10"
        />
      </div>

      <div className="mt-8">
        <span className="mb-3 block text-sm font-semibold text-primary">Résumé</span>
        {/* The dashed box is a real drop target, not just a picture of one. */}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || !yearsValid}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            if (busy || !yearsValid) return
            const f = e.dataTransfer.files[0]
            if (f) onFile(f)
          }}
          className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-10 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            dragging
              ? 'border-accent bg-accent/5'
              : 'border-border bg-secondary/25 enabled:hover:border-accent/60 enabled:hover:bg-accent/5'
          }`}
        >
          <span className="bg-brand-gradient mb-3 flex size-11 items-center justify-center rounded-xl">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
          </span>
          <span className="text-sm font-semibold text-primary">
            {busy ? 'Reading…' : mode === 'linkedin' ? 'Choose your LinkedIn PDF, or drop it here' : 'Choose a file, or drop it here'}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {busy ? '' : `PDF or DOCX · ${MAX_RESUME_MB} MB`}
          </span>
        </button>
        {busy ? (
          <div className="mt-4" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="bg-brand-gradient h-full rounded-full transition-all duration-700" style={{ width: `${[18, 52, 82, 100][stage]}%` }} />
            </div>
            <ul className="mt-3 space-y-1.5">
              {['Parsing career history…', 'Extracting core hard & soft skills…', 'Analysing experience level…'].map((label, i) => (
                <li key={label} className={`flex items-center gap-2 text-xs ${i <= stage ? 'text-primary' : 'text-muted-foreground/60'}`}>
                  {i < stage ? <Check className="size-3.5 text-score-high" /> : i === stage ? <Loader2 className="size-3.5 animate-spin text-accent" /> : <span className="size-3.5" />}
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!yearsValid && !busy ? (
          <p className="mt-2 text-xs text-muted-foreground">Add your years above first.</p>
        ) : null}
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* SHORTENED, NOT MOVED. The deletion promise has to sit beside the ask
          rather than behind a link — that is the whole point of putting it on
          this screen — so what is left still names the three facts that matter
          (read once, deleted, a third party sees stripped text) and the link
          carries the detail. */}
      <p className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="size-4 shrink-0" />
        <span>
          Read once, then deleted. Stripped text goes to one model provider —{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline underline-offset-4"
          >
            details
          </a>
          .
        </span>
      </p>

      {/* Never a dead end: manual entry is a full alternative, not a fallback. */}
      <div className="mt-10 border-t border-border pt-6">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            writeDraft({
              fields: yearsValid ? { yearsExperience: yearsNum } : {},
              warnings: [],
            })
            router.push('/start/confirm')
          }}
        >
          Type it in instead
        </Button>
      </div>
    </OnboardingShell>
  )
}
