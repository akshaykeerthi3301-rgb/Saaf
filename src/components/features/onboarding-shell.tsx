import Link from 'next/link'
import { ShieldCheck, Sparkles } from 'lucide-react'

/**
 * The frame every onboarding screen sits in.
 *
 * Ported from the saaf-ai export's split-screen onboarding. It exists so the
 * five screens stop looking like five different products — the left panel is
 * fixed and the right pane carries the step, which is also what makes the
 * progress state legible without a bar on every page.
 *
 * A server component. Each screen stays 'use client' for its own state; the
 * chrome around it does not need to be.
 *
 * THE LEFT PANEL MAKES NO CLAIM THE PRODUCT DOES NOT KEEP. The export's copy
 * here promised a "True-Fit score" and tailored applications; scoring is real
 * but is not called that, and the co-pilot is parked, so neither line survives.
 * What is left is the two things that are true at this exact moment: nothing is
 * scored until the candidate confirms it, and the file is deleted after parsing.
 */

/** One source of truth for the flow's length and its pacing.
 *  Starts at 10%, never 0 — momentum from screen one. */
const STEPS = [
  { pct: 10, lead: 'Where you look today' },
  { pct: 25, lead: 'Your résumé' },
  { pct: 45, lead: 'Reading it' },
  { pct: 60, lead: 'Confirm what we read' },
  { pct: 80, lead: 'One last question' },
] as const

export function OnboardingShell({
  step,
  children,
}: {
  /** 1-based, into STEPS. */
  step: number
  children: React.ReactNode
}) {
  const current = STEPS[step - 1]

  return (
    <main className="min-h-screen bg-card text-foreground lg:grid lg:grid-cols-[minmax(340px,0.8fr)_minmax(600px,1.2fr)]">
      {/* Sticky, not just min-h-screen as the export had it: the confirm screen's
          form is taller than the viewport, and a panel that scrolls away leaves
          bare page ground beside the form for the rest of the way down. */}
      <section className="relative flex flex-col overflow-hidden bg-[linear-gradient(145deg,oklch(0.95_0.02_170),oklch(0.92_0.018_230))] px-6 py-7 sm:px-10 lg:sticky lg:top-0 lg:h-screen lg:px-14 lg:py-10">
        <div
          className="absolute -right-24 top-36 size-72 rounded-full border border-accent/15"
          aria-hidden="true"
        />
        <div
          className="absolute -right-10 top-52 size-44 rounded-full border border-accent/10"
          aria-hidden="true"
        />

        <Link
          href="/"
          className="relative flex w-fit items-center gap-2 text-sm font-semibold tracking-[-0.03em] text-primary"
          aria-label="Saaf home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          Saaf AI
        </Link>

        <div className="relative mt-auto max-w-md pb-2 pt-16 lg:pb-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card/65 px-3 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Setting up your shortlist
          </div>
          <h2 className="text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-primary sm:text-4xl">
            Five short steps, then your first shortlist.
          </h2>
          <p className="mt-5 max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
            Nothing is scored against a detail you haven&apos;t confirmed, and nothing is stored
            until you say it&apos;s right.
          </p>
          <p className="mt-10 hidden items-center gap-2 text-xs font-medium text-primary/60 lg:flex">
            <ShieldCheck className="size-4 text-accent" />
            Your résumé file is deleted the moment we&apos;ve read it.
          </p>
        </div>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10 sm:py-12 lg:min-h-screen lg:px-16 lg:py-14 xl:px-24">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-9">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Step {step} of {STEPS.length}
              </p>
              <p className="text-sm text-muted-foreground">{current.lead}</p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={current.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
              className="h-1 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${current.pct}%` }} />
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  )
}
