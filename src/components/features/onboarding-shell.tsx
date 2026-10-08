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

/**
 * Since 2026-10-09 this frames one screen only: /start/confirm, the check-your-details form a person lands on when
 * their résumé did not yield everything the first match needs (or when they chose to type it in). The first run
 * itself is /start (src/components/features/first-run.tsx). The old step counter and progress bar went with the
 * five-screen flow they measured.
 */
export function OnboardingShell({ children }: { children: React.ReactNode }) {
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
          aria-label="Jobinko home"
        >
          <span className="bg-brand-gradient glow-selected flex size-8 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </span>
          Jobinko
        </Link>

        {/* Was a badge, a headline and two promises. The badge said what the
            headline says, and the two promises said the same thing twice. */}
        <div className="relative mt-auto max-w-md pb-2 pt-16 lg:pb-14">
          <h2 className="text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-primary sm:text-4xl">
            Check what we read, then see your jobs.
          </h2>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-primary/60">
            <ShieldCheck className="size-4 shrink-0 text-accent" />
            Nothing is stored until you confirm it.
          </p>
        </div>
      </section>

      <section className="flex flex-col px-5 py-8 sm:px-10 sm:py-12 lg:min-h-screen lg:px-16 lg:py-14 xl:px-24">
        <div className="mx-auto w-full max-w-xl">
          {children}
        </div>
      </section>
    </main>
  )
}
