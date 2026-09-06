import Link from 'next/link'
import { ArrowUpRight, Check, CircleCheck, FileUp, ShieldCheck, Sparkles } from 'lucide-react'
import { AuditStrip } from '@/components/features/audit-strip'
import { AuthFragmentNotice } from '@/components/features/auth-fragment-notice'

const CTA = 'Show me my matches'

/**
 * The landing page, in the saaf-ai design language.
 *
 * COPY IS DELIBERATELY NOT THE KIT'S. The saaf-ai export leads on True-Fit
 * Scoring, Review & Approve and WhatsApp nudges — all three are planned and
 * none of them ship yet. docs/ROADMAP.md TASK-053 reconciled every claim on
 * this page against shipped, tested code, and the standing rule is that a
 * promise the product cannot keep is a defect rather than marketing. So the
 * visual language is the kit's and every sentence below is something the
 * product does today.
 *
 * The kit's three value props switch on as their features land:
 *   True-Fit Scoring   → when the trajectory + industry components ship
 *   Review & Approve   → when the extension and the guardrail ship
 *   WhatsApp nudges    → when the WhatsApp channel ships
 */
const valueProps = [
  {
    icon: CircleCheck,
    eyebrow: '01 / Signal over volume',
    title: 'Ranked against you',
    description:
      'Every role is scored against your profile, not the posting’s keywords. Two candidates never get the same number on the same job.',
  },
  {
    icon: ShieldCheck,
    eyebrow: '02 / Your call, always',
    title: 'We never apply for you',
    description:
      'Saaf stops before the application. Nothing is submitted on your behalf, and no employer is ever contacted about you.',
  },
  {
    icon: Sparkles,
    eyebrow: '03 / Checkable, not claimed',
    title: 'Every score opens up',
    description:
      'Role match 35/35. Experience 2/30 — asks for 8 years, you have 2. Each part shown, with the line from the posting it was read from.',
  },
]

const howItWorks = [
  ['We read your résumé once', 'Parsed to fill your profile, then deleted. You confirm every field before anything runs.'],
  ['We read the posting the same way', 'The experience floor, the credential, the location — pulled out of the job description itself, quoted, in plain code with no model guessing.'],
  ['We rank, and we show the arithmetic', 'Every role gets a score built from role match, experience, location, work mode and credential. Open any score to see each part and the sentence it came from.'],
]

const faqs = [
  ['Naukri already says it matches me. Why is this different?', 'Because our number breaks into parts you can check against the job description in thirty seconds. A portal shows you a badge and no working.'],
  ['Can my employer find out I’m looking?', 'No. No employer is ever contacted, nothing here is public or sold, and no recruiter can search this. Delete your account in one click, no email required.'],
  ['What happens to my résumé?', 'It’s parsed once to fill your profile, then the file is deleted. Only the fields you confirm are stored.'],
  ['Why isn’t LinkedIn or Naukri in here?', 'Their terms don’t allow it. We pull from company hiring boards directly — which is why some roles you see elsewhere won’t appear here, and why we tell you how many we indexed.'],
]

function Cta({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/signin"
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5 ${className}`}
    >
      <FileUp className="size-4" />
      {CTA}
      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">
      {children}
    </h2>
  )
}

/** Hairline-separated rows. Kept from the previous design deliberately — a list
 *  someone else compiled and is accountable for reads differently from a grid
 *  of cards, and that distinction is the product's argument. */
function Rows({ items, numbered = false }: { items: string[][]; numbered?: boolean }) {
  return (
    <div className="mt-8 border-t border-border">
      {items.map(([title, description], i) => (
        <div key={title} className="border-b border-border py-5">
          <div className="flex items-baseline gap-3">
            {numbered && (
              <span className="font-mono text-sm text-muted-foreground tabular-nums">{i + 1}</span>
            )}
            <strong className="text-base font-semibold tracking-[-0.02em] text-primary sm:text-lg">
              {title}
            </strong>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            {description}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Saaf home">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" strokeWidth={2.2} />
          </span>
          <span className="text-base font-semibold tracking-[-0.03em]">Saaf</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
          <Link href="/audit" className="transition-colors hover:text-foreground">Index audit</Link>
          <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
        </div>
        <Link
          href="/signin"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-foreground/30 hover:shadow-sm"
        >
          Log in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10">
        <AuthFragmentNotice />

        <div
          className="absolute -right-28 top-8 hidden size-64 rounded-full border border-accent/25 bg-accent/5 lg:block"
          aria-hidden="true"
        />
        <div
          className="absolute -right-8 top-24 hidden size-40 rounded-full border border-accent/25 lg:block"
          aria-hidden="true"
        />

        <div className="relative max-w-4xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
            Built for the way India works
          </div>

          <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-primary sm:text-6xl lg:text-7xl">
            Every match arrives with <span className="text-accent">its working.</span>
          </h1>

          <p className="mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            A free daily shortlist for Indian professionals in their first five years, ranked
            against your own profile — and every score opens to show how it was built.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Cta />
            <span className="flex items-center gap-2 px-1 text-xs text-muted-foreground sm:text-sm">
              <Check className="size-4 text-accent" />
              Free forever. No card.
            </span>
          </div>
        </div>

        {/* The comparison — the product's whole argument in one block. */}
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-6">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              A job portal
            </span>
            <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-primary">
              Staff Engineer · 8+ years required
            </p>
            <p className="mt-4 text-sm font-bold text-primary">★ TOP APPLICANT</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No number, no reason, no way to check it.
            </p>
          </article>

          <article className="rounded-2xl border border-accent/40 bg-card p-6 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Saaf
            </span>
            <p className="mt-3 text-lg font-medium tracking-[-0.02em] text-primary">
              Staff Engineer · <span className="font-bold tabular-nums">62</span>
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Role match 35/35 · Experience 2/30 — asks for 8 years, you have 2 · Location 15/15 ·
              Work mode 10/10
            </p>
          </article>
        </div>

        <AuditStrip />
      </section>

      {/* Value props */}
      <section id="why" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                The Saaf difference
              </p>
              <SectionHeading>Fewer applications. Better conversations.</SectionHeading>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Your career deserves a system that respects your time, intent, and ambition.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {valueProps.map(({ icon: Icon, eyebrow, title, description }) => (
              <article
                key={title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl hover:shadow-primary/5 sm:p-7"
              >
                <div className="mb-10 flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {eyebrow}
                  </span>
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-primary">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        {/* The problem */}
        <section className="py-16 sm:py-20">
          <SectionHeading>The match wasn’t missing. It was unexplained.</SectionHeading>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">
            A portal called you a Top Applicant for a role asking fifteen years. You have two. You
            spent the forty minutes anyway, and heard nothing — same as the last thirty
            applications. Eight months in, you still don’t know whether it was the résumé, the fit,
            or the timing.
          </p>
          <blockquote className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-lg font-medium tracking-[-0.02em] text-primary">
              “not even one call.”
            </p>
            <footer className="mt-3 text-sm text-muted-foreground">
              Blind — Bangalore, 13+ years, 50+ applications across LinkedIn, Naukri and Instahyre
            </footer>
          </blockquote>
        </section>

        <section id="how" className="scroll-mt-8 border-t border-border py-16 sm:py-20">
          <SectionHeading>How it works</SectionHeading>
          <Rows items={howItWorks} numbered />
        </section>

        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading>What you get</SectionHeading>
          <Rows
            items={[
              ['Scored against you, not the posting', 'Two candidates never get the same number on the same role. Your years, city, work mode and credential all move it.'],
              ['Every score opens up', 'Role match 35/35, Experience 2/30 — asks for 8 years, you have 2. Each part is shown, with the line from the posting it was read from.'],
              ['Nobody can find you here', 'Your file is deleted after parsing. No employer is contacted. Delete your account in one click, no email required.'],
            ]}
          />
        </section>

        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading>Free. Not free-for-now.</SectionHeading>
          <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground">
            No card, no ads, and no paid tier hiding behind a feature you already use. Saaf is a
            portfolio project built to real-product standards, and it stays at ₹0.
          </p>
        </section>

        <section id="faq" className="scroll-mt-8 border-t border-border py-16 sm:py-20">
          <SectionHeading>Questions</SectionHeading>
          <Rows items={faqs} />
        </section>

        <section className="border-t border-border py-16 text-center sm:py-20">
          <SectionHeading>
            <span className="mx-auto block">See how your matches are scored.</span>
          </SectionHeading>
          <div className="mt-8 flex justify-center">
            <Cta />
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Saaf</span>
            <Link href="/audit" className="transition-colors hover:text-foreground">Index audit, updated daily</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">How we handle your data</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/profile" className="transition-colors hover:text-foreground">Delete your account</Link>
          </div>
          <p className="mt-6 max-w-3xl text-xs leading-6 text-muted-foreground">
            No compliance badges: we hold no SOC 2 or GDPR certification and will not display marks
            we have not earned. Consent at upload, stated retention, deletion path; the source file
            is destroyed after parsing.
          </p>
        </div>
      </footer>
    </main>
  )
}
