import Link from 'next/link'
import { ArrowRight, FileText, PenLine, Sparkles, Target } from 'lucide-react'
import { AuthFragmentNotice } from '@/components/features/auth-fragment-notice'
import { ScoreRing } from '@/components/ui/score-ring'

/**
 * The landing page — rebuilt as a short page on 2026-10-09 after the founder's verdict on the old one:
 * "text heavy, need a more minimalistic clean UI". It said everything at length (a ticker, a how-it-works
 * list, six FAQs, a compliance paragraph); it now says one thing, offers two doors, and shows the product.
 *
 * Every claim here describes something that ships: matched jobs, a tailored résumé and a cover letter per
 * job, and the free ATS checker. The explanations that used to live here (how scores are built, what happens
 * to a résumé) live on /privacy and /compare, one link away in the footer.
 */
const features = [
  { icon: Target, title: 'Jobs matched to you', body: 'Ranked against your résumé, with a clear score.' },
  { icon: FileText, title: 'A résumé for every job', body: 'Tailored to the posting in a few clicks.' },
  { icon: PenLine, title: 'Cover letters in seconds', body: 'Written from your own experience.' },
]

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute -top-56 left-1/2 h-[30rem] w-[60rem] max-w-[150vw] -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Jobinko home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.2} />
          </span>
          <span className="text-base font-semibold tracking-[-0.03em]">Jobinko</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-6">
          <Link href="/tools/ats-checker" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">ATS checker</Link>
          <Link
            href="/signin"
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-secondary/60"
          >
            Log in
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pt-20">
        <AuthFragmentNotice />
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-primary sm:text-6xl">
          Your AI job copilot for India.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
          Find roles that fit, tailor your résumé and write the cover letter — in one place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signin"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
          >
            Get started — it’s free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/tools/ats-checker"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary/60 sm:w-auto"
          >
            Check your résumé
          </Link>
        </div>
      </section>

      {/* One illustrative card: what a match looks like. Static, labelled as an example. */}
      <section className="relative mx-auto max-w-3xl px-5 pb-16 sm:px-8" aria-label="Example match">
        <div className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            <p className="text-xs text-muted-foreground">Example</p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-[-0.02em] text-primary sm:text-xl">Customer Success Manager</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Acme Software · Bengaluru</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {['Full-time', 'Hybrid', 'Mid level', '3+ years'].map((t) => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-1">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-1.5 border-l border-border bg-secondary/40 p-4 sm:w-40">
            <ScoreRing score={86} size={64} stroke={5} />
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-score-high">Strong match</span>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <ul className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="size-4" /></span>
              <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-primary">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <span className="font-semibold text-foreground">Jobinko</span>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/jobs" className="transition-colors hover:text-foreground">Jobs</Link>
            <Link href="/tools/ats-checker" className="transition-colors hover:text-foreground">ATS checker</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
