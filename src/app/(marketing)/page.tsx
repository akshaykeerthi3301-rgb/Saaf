import Link from 'next/link'
import { ArrowUpRight, Check, FileUp, Sparkles } from 'lucide-react'
import { AuditStrip } from '@/components/features/audit-strip'
import { AuthFragmentNotice } from '@/components/features/auth-fragment-notice'

/**
 * ⚠️ THE LABEL NAMES THE OUTCOME, NOT THE MECHANIC. It read "Upload Résumé &
 * Get True-Fit Match", which describes what the product does to a file rather
 * than what the candidate came for, and it named a score ("True-Fit") that
 * means nothing to somebody who has not used us yet. The two doors in the hero
 * are "Find your next job" and "ATS score checker", and every other button on
 * the page has to agree with them or the page reads as three products.
 */
const CTA = 'Find your next job'

/**
 * The landing page, in the saaf-ai design language and carrying the saaf-ai copy.
 *
 * EVERY CLAIM ON THIS PAGE DESCRIBES SOMETHING THAT SHIPS. It did not until
 * 2026-09-07: a three-card section promised True-Fit Scoring (needs the
 * trajectory and industry components, unbuilt), Review & Approve (the co-pilot,
 * parked) and WhatsApp Nudges (parked, needs a budget). They were kept on the
 * explicit understanding that deployment was on hold and nothing was public —
 * and they came off the moment it was not, which is the condition the founder
 * set and docs/ROADMAP.md TASK-053 recorded.
 *
 * Put them back when the features land, not before. The standing rule is that a
 * promise the product cannot keep is a defect rather than marketing.
 */
const howItWorks = [
  ['We read your résumé once', 'Then delete it. You confirm every field.'],
  ['We read the posting the same way', 'Experience, credential, location — quoted from the job description.'],
  ['We rank, and show the arithmetic', 'Open any score to see each part and the line it came from.'],
]

const faqs = [
  ['Naukri already says it matches me. Why is this different?', 'Our number breaks into parts you can check against the posting. A portal shows a badge and no working.'],
  ['Can my employer find out I’m looking?', 'No. No employer is contacted, nothing is public or sold, and no recruiter can search this.'],
  ['What happens to my résumé?', 'Parsed once, then deleted. Only the fields you confirm are stored.'],
  ['Why isn’t LinkedIn or Naukri in here?', 'Their terms don’t allow it. We pull from company hiring boards — which is why we publish how many we indexed.'],
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
          {/* ⚠️ THE TOOLS WERE ORPHANS UNTIL 2026-09-08 — zero inbound links from
              anywhere, reachable only by typing the URL, on the two pages whose
              entire purpose is to be useful before anybody signs up. This is the
              first of them, and it is deliberately in the primary nav rather
              than the footer. */}
          <Link href="/tools" className="transition-colors hover:text-foreground">Free tools</Link>
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
            {/*
              ⚠️ "100% TAILORED." WAS CUT FROM HERE, 2026-09-14. It was a
              completeness figure nothing measures — the same invented number as
              the "Profile Strength: 92%" dial /copilot refuses to draw, on the
              one page whose whole argument is that our arithmetic can be
              checked. The landing page had already advertised one scoring bug
              this way ("Work mode 7/7 · Credential 10/10"); this was the second
              instance of the same habit. The sub-headline below carries the
              real promise, and it is checkable.
            */}
            Precision Career Copilot for India. <span className="text-accent">Zero Spam.</span>
          </h1>

          <p className="mt-7 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Roles that fit, each with the arithmetic behind the score.
          </p>

          {/*
            ⚠️ TWO DOORS, PRESENTED AS EQUALS — founder decision, 2026-09-08.
            This was one primary button (sign in, upload, get matched) with the
            ATS check demoted to a link beside it. That ordering described how
            the product was BUILT rather than how people arrive at it: most
            organic traffic is somebody searching "ATS score checker" who has
            never heard of us, and asking them to create an account thirty
            seconds in is the largest possible ask at the smallest possible
            moment of trust.

            So the checker is a door, not a footnote. It needs no account, it
            answers a question they already had, and the rewrite at the end of
            it is where signing in finally buys something concrete.

            Both cards say plainly what they cost. A "free" badge on the one
            that needs an account would be the sort of small dishonesty this
            product exists to argue against.
          */}
          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <Link
              href="/signin"
              className="group flex flex-col rounded-2xl border border-border bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5"
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                <FileUp className="size-3.5" aria-hidden="true" />
                Needs an account
              </span>
              <span className="mt-3 inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.03em]">
                Find your next job
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              <span className="mt-2 text-sm leading-6 text-primary-foreground/75">
                Roles from company hiring boards, ranked against your résumé — each score opening
                into the line it was read from.
              </span>
            </Link>

            <Link
              href="/tools/ats-checker"
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-foreground/30"
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="size-3.5" aria-hidden="true" />
                No account, ₹0
              </span>
              <span className="mt-3 inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.03em] text-primary">
                ATS score checker
                <ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              <span className="mt-2 text-sm leading-6 text-muted-foreground">
                Upload your résumé and see what a parser actually reads out of it — then have it
                rewritten for the role you are after.
              </span>
            </Link>
          </div>

          <p className="mt-4 flex items-center gap-2 px-1 text-xs text-muted-foreground sm:text-sm">
            <Check className="size-4 text-accent" />
            No spam. No guesswork. The checker needs no account.
          </p>

          <div className="mt-16 flex items-center gap-3 border-t border-border pt-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:mt-20">
            <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
            A calmer way to find your next role
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
              Staff Engineer · <span className="font-bold tabular-nums">35</span>
            </p>
            {/* THESE NUMBERS ARE THE REAL OUTPUT, not an illustration. Produced
                by scoreRole() for a two-year candidate in Bengaluru against a
                "Staff Engineer, 8+ years" posting, and checked again whenever
                WEIGHTS or the caps change — see the test that pins them.
                They were 35/35, 2/30, 15/15 and 10/10 until 2026-09-07: four
                denominators the scorer has never used, on the one page whose
                entire argument is that our arithmetic can be checked.

                ⚠️ WORK MODE AND CREDENTIAL CAME OFF THIS LINE ON 2026-09-14,
                and their absence is the honest version. Both used to pay out
                full marks when the candidate had stated no preference and the
                posting required nothing — measured at 100% and 98% average
                award across 504 scored roles. Printing "Work mode 7/7 ·
                Credential 10/10" here advertised seventeen points that were
                awarded for absence of data, on the page arguing against scores
                you cannot check. The scorer now omits a component with nothing
                to measure, so the example shows three real ones. */}
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Role match 28/28 · Experience 1/25 — asks for 8 years, you have 2 · Location 10/10 —
              then capped at 50, because you are well under the bar this posting states. Work mode
              and credential are not scored here: you set no preference and the posting names none.
            </p>
          </article>
        </div>

        <AuditStrip />
      </section>

      {/* Value props */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
        {/* The problem */}
        <section className="py-16 sm:py-20">
          <SectionHeading>The match wasn’t missing. It was unexplained.</SectionHeading>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            A portal called you a Top Applicant for a role asking fifteen years. You have two. You
            spent the forty minutes anyway, and heard nothing.
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
              ['Scored against you, not the posting', 'Your years, city, work mode and credential all move the number.'],
              ['Every score opens up', 'Each part, with the line from the posting it was read from.'],
              ['Nobody can find you here', 'File deleted after parsing. No employer contacted. Delete in one click.'],
            ]}
          />
        </section>

        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading>Free. Not free-for-now.</SectionHeading>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground">
            No card, no ads, no paid tier. It stays at ₹0.
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
          <div className="mt-8 flex flex-col items-center gap-4">
            <Cta />
            {/* The second door repeated at the bottom, for a reader who got all
                the way here and still is not ready to make an account. */}
            <Link
              href="/tools/ats-checker"
              className="text-sm font-semibold text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
            >
              Or check your ATS score first — no account needed
            </Link>
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Saaf</span>
            <Link href="/audit" className="transition-colors hover:text-foreground">Index audit, updated daily</Link>
            <Link href="/tools/ats-checker" className="transition-colors hover:text-foreground">Free ATS checker</Link>
            <Link href="/tools/paste-jd" className="transition-colors hover:text-foreground">Should I apply?</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">How we handle your data</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link href="/profile" className="transition-colors hover:text-foreground">Delete your account</Link>
          </div>
          {/* Kept, shortened. Saying what we have NOT earned is the point of the
              line, so the clause naming the certifications survives the cut. */}
          <p className="mt-6 max-w-2xl text-xs leading-6 text-muted-foreground">
            No compliance badges: we hold no SOC 2 or GDPR certification and will not display marks
            we have not earned.
          </p>
        </div>
      </footer>
    </main>
  )
}
