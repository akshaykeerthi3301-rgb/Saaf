import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * The frame for the two public tools — the surfaces a stranger lands on from a
 * search result.
 *
 * ⚠️ THIS EXISTS BECAUSE `DocPage` IS THE WRONG SHELL FOR IT, AND SAYS SO.
 * DocPage's own comment reads "deliberately narrower and quieter than the
 * landing page: these are read, not sold." That is exactly right for privacy,
 * terms and the index audit — and exactly wrong for the highest-intent page in
 * the product. Both tools were wrapped in it, so someone arriving from a search
 * for "ATS score checker" met a page dressed as a legal document, with three
 * paragraphs of promises above the input they came to use.
 *
 * DocPage is untouched and still frames the three documents it was built for.
 *
 * WHAT THIS DOES DIFFERENTLY, and each is a deliberate reversal:
 *
 *  1. THE TOOL IS ABOVE THE FOLD. The heading is one line, the promises sit
 *     BESIDE the input on a wide screen and below it on a phone. A visitor who
 *     typed a query into Google has already decided they want this; making them
 *     read three paragraphs first is asking them to re-decide.
 *  2. IT IS WIDER — max-w-5xl against DocPage's max-w-3xl — because a result
 *     panel with a score, a ledger and a findings list needs room to establish
 *     a hierarchy. At 3xl everything queues into one column at one weight.
 *  3. IT CARRIES A REAL WAY IN. DocPage's header links to the documents. This
 *     one links to the other tool and to sign-in, because the whole reason the
 *     page exists is that some fraction of its visitors should end up inside
 *     the product.
 *
 * The heading is an <h1> here rather than inside the caller, so every tool page
 * has exactly one and a crawler reads a consistent document outline.
 */
export function ToolPage({
  eyebrow,
  title,
  standfirst,
  promises,
  children,
  footer,
}: {
  eyebrow: string
  /** The h1. One per page — a crawler reads this first. */
  title: string
  /** One sentence under the h1. Says what they get, not how it works. */
  standfirst: string
  /** The trust answers. Rendered beside the tool on desktop, under it on mobile. */
  promises: React.ReactNode
  /** The tool itself. */
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary"
          aria-label="Jobinko home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          Jobinko
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link
            href="/tools"
            className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Free tools
          </Link>
          <Link
            href="/signin"
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:border-foreground/30 hover:bg-secondary/60"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-4 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.08] tracking-[-0.05em] text-primary sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{standfirst}</p>

        {/* The tool first in the DOM as well as on the page: a screen reader and
            a crawler both meet the thing the page is for before the reassurance
            about it. lg:col-span keeps the promises alongside on a wide screen
            without pushing the input down on a phone. */}
        {/*
          ⚠️ THE PROMISES STAND DOWN ONCE THERE IS A RESULT, AND THE LAYOUT
          NEEDS THEM TO. Measured at 1280px with both sidebars up, the pane that
          holds the report and the résumé preview is 368px wide — too narrow to
          read a document in, which made the whole point of showing one moot.

          They are also spent by then. Every line in that column is about what
          happens BEFORE you paste — nothing stored, no sign-up, no model
          deciding your score — and a reader looking at their own findings has
          already taken the step those sentences exist to reassure them about.

          Done with `:has()` rather than state because this shell is a server
          component and the step lives inside the client one. A browser without
          `:has()` support simply keeps the narrower layout; nothing breaks.
        */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-10 [&:has([data-report])>aside]:hidden lg:[&:has([data-report])]:grid-cols-[minmax(0,1fr)]">
          <div className="min-w-0">{children}</div>
          <aside className="lg:sticky lg:top-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Before you paste
            </p>
            <ul className="mt-3 space-y-3 border-l-2 border-accent/30 pl-4 text-sm leading-6 text-muted-foreground">
              {promises}
            </ul>
          </aside>
        </div>

        {footer && (
          <div className="mt-16 border-t border-border pt-8">{footer}</div>
        )}
      </main>
    </div>
  )
}
