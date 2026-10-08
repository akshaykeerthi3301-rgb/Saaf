'use client'

import { useEffect, useState } from 'react'
import { FileText, PenLine, ScanSearch, Sparkles } from 'lucide-react'
import { ScoreRing } from '@/components/ui/score-ring'

/**
 * The rotating "feature highlights" card under the scanning bar, as in the reference product's matching screen.
 * Every slide describes something that ships today — a résumé tailored per job, a cover letter per job, the free
 * ATS checker — and nothing is promised that is not in the app.
 */
const SLIDES = [
  {
    icon: Sparkles,
    title: 'Generate a custom résumé for each job',
    chips: ['Summary rewritten', 'Relevant skills highlighted', 'Recent experience sharpened'],
    figure: 92,
  },
  {
    icon: PenLine,
    title: 'Cover letters in seconds, in your own words',
    chips: ['Pick the tone', 'Edit before you send', 'Copy it or take it as Word'],
    figure: null,
  },
  {
    icon: ScanSearch,
    title: 'See how an ATS reads your résumé',
    chips: ['A score out of 100', 'Missing keywords named', 'Free to use'],
    figure: 84,
  },
] as const

const ROTATE_MS = 4500

export function ScanHighlights() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % SLIDES.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [])
  const s = SLIDES[i]
  const Icon = s.icon

  return (
    <section aria-label="Feature highlights" className="w-full max-w-3xl rounded-3xl border border-border bg-accent/10 p-6 sm:p-8">
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <span className="inline-flex rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">Feature highlights</span>
          <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-[-0.035em] text-primary sm:text-3xl" aria-live="polite">{s.title}</h2>
        </div>
        <div className="relative mx-auto w-64 rounded-2xl border border-border bg-card p-4 shadow-sm" aria-hidden="true">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="size-4" /></span>
            {s.figure !== null ? <ScoreRing score={s.figure} size={44} stroke={4} /> : <FileText className="ml-auto size-5 text-muted-foreground" />}
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 w-11/12 rounded-full bg-secondary" />
            <div className="h-1.5 w-4/5 rounded-full bg-secondary" />
            <div className="h-1.5 w-9/12 rounded-full bg-secondary" />
          </div>
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {s.chips.map((c) => (
              <li key={c} className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">{c}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-1.5" role="tablist" aria-label="Highlights">
        {SLIDES.map((x, n) => (
          <button
            key={x.title}
            type="button"
            role="tab"
            aria-selected={n === i}
            aria-label={x.title}
            onClick={() => setI(n)}
            className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </div>
    </section>
  )
}
