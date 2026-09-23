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
/**
 * Four steps: choose portals, upload, confirm what we read, and the résumé
 * reading in between. The fifth was the credential question — CA / CFA / CS —
 * and it is gone. It asked every candidate to answer for a requirement 3.6% of
 * the index states (780 roles of 21,806), and it is still editable on /profile
 * for the finance roles that do state one. A step that serves one candidate in
 * thirty does not belong in the path to a first shortlist.
 */
// Five since 2026-09-23: the preference matrix sits between confirming what
// was read and the first shortlist.
const STEPS = [10, 28, 48, 70, 88] as const

export function OnboardingShell({
  step,
  children,
}: {
  /** 1-based, into STEPS. */
  step: number
  children: React.ReactNode
}) {
  const pct = STEPS[step - 1]

  return (
    <main className="min-h-screen bg-card text-foreground lg:grid lg:grid-cols-[minmax(340px,0.8fr)_minmax(600px,1.2fr)]">
      {/* Sticky, not just min-h-screen as the export had it: the confirm screen's
          form is taller than the viewport, and a panel that scrolls away leaves
          bare page ground beside the form for the rest of the way down. */}
      <section className="relative flex flex-col overflow-hidden bg-[linear-gradient(145deg,color-mix(in_oklch,var(--brand)_22%,var(--card)),var(--background)_70%)] px-6 py-7 sm:px-10 lg:sticky lg:top-0 lg:h-screen lg:px-14 lg:py-10">
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
          <span className="bg-brand-gradient glow-selected flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </span>
          Saaf
        </Link>

        {/* Was a badge, a headline and two promises. The badge said what the
            headline says, and the two promises said the same thing twice. */}
        <div className="relative mt-auto max-w-md pb-2 pt-16 lg:pb-14">
          <h2 className="text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-primary sm:text-4xl">
            Five steps to your first shortlist.
          </h2>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-primary/60">
            <ShieldCheck className="size-4 shrink-0 text-accent" />
            Nothing is stored until you confirm it.
          </p>
        </div>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10 sm:py-12 lg:min-h-screen lg:px-16 lg:py-14 xl:px-24">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-9">
            {/* The step's own name sat here beside the counter and again as the
                page's h1 one line below. The counter is enough. */}
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Step {step} of {STEPS.length}
            </p>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
              className="h-1 w-full overflow-hidden rounded-full bg-secondary"
            >
              <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {children}
        </div>
      </section>
    </main>
  )
}
