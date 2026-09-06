import {
  ArrowUpRight,
  Check,
  CircleCheck,
  FileUp,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

const valueProps = [
  {
    icon: CircleCheck,
    eyebrow: '01 / Signal over volume',
    title: 'True-Fit Scoring',
    description:
      'Hard skills, industry context, and career trajectory combined into one honest score.',
  },
  {
    icon: ShieldCheck,
    eyebrow: '02 / Your call, always',
    title: 'Review & Approve',
    description:
      'You approve every application before submission; no black-box auto-spamming.',
  },
  {
    icon: MessageCircle,
    eyebrow: '03 / Stay in the loop',
    title: 'WhatsApp Nudges',
    description:
      'High-signal updates on 85%+ matched roles directly on WhatsApp.',
  },
]

export default function Page() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="Saaf AI home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.2} />
          </span>
          <span className="text-base font-semibold tracking-[-0.03em]">Saaf AI</span>
        </a>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a href="#why-saaf" className="transition-colors hover:text-foreground">Why Saaf</a>
          <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
        </div>
        <a
          href="/onboarding"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:shadow-sm"
        >
          Get started
        </a>
      </header>

      <section id="top" className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-28">
        <div className="absolute -right-28 top-8 hidden h-64 w-64 rounded-full border border-emerald-200/70 bg-emerald-50/70 lg:block" aria-hidden="true" />
        <div className="absolute -right-8 top-24 hidden h-40 w-40 rounded-full border border-emerald-200/70 lg:block" aria-hidden="true" />
        <div className="relative max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Built for the way India works
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.04] tracking-[-0.06em] text-primary sm:text-7xl lg:text-[5.5rem]">
            Precision Career Copilot for India. <span className="text-accent">Zero Spam.</span> 100% Tailored.
          </h1>
          <p className="mt-8 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Saaf AI matches you with high-precision roles that actually fit your skills, context, and next move — so you spend less time applying and more time moving forward.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              id="get-started"
              href="/onboarding"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5"
            >
              <FileUp className="size-4" />
              Upload Resume &amp; Get True-Fit Match
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <span className="flex items-center gap-2 px-1 text-xs text-muted-foreground sm:text-sm">
              <Check className="size-4 text-accent" />
              No spam. No guesswork.
            </span>
          </div>
        </div>
        <div className="mt-16 flex items-center gap-3 border-t border-border pt-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:mt-24">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          A calmer way to find your next role
        </div>
      </section>

      <section id="why-saaf" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">The Saaf difference</p>
              <h2 className="max-w-md text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Fewer applications. Better conversations.</h2>
            </div>
            <p id="how-it-works" className="max-w-xs text-sm leading-6 text-muted-foreground">Your career deserves a system that respects your time, intent, and ambition.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {valueProps.map(({ icon: Icon, eyebrow, title, description }) => (
              <article key={title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl hover:shadow-primary/5 sm:p-7">
                <div className="mb-12 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon className="size-5" /></span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</span>
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-primary">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <span className="font-medium text-foreground">Saaf AI</span>
        <span>Career clarity, without the noise.</span>
      </footer>
    </main>
  )
}
