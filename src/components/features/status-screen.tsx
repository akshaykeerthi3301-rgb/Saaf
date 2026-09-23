import type { ReactNode } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * The frame for a page that is not the page the visitor asked for: an error,
 * a missing route. The same centred card as /signin, so a failure still looks
 * like Saaf rather than like the framework (docs/QA-AUDIT.md QA-12 — a 413
 * used to render Next's unbranded "This page couldn't load").
 *
 * Server-safe: no hooks, so error.tsx (client) and not-found.tsx (server) can
 * both use it.
 */
export function StatusScreen({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12 text-foreground">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary"
        aria-label="Saaf home"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-4" />
        </span>
        Saaf
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold leading-[1.15] tracking-[-0.045em] text-primary">{title}</h1>
        <div className="mt-3 text-sm leading-6 text-muted-foreground">{children}</div>
        <div className="mt-6 flex flex-wrap items-center gap-4">{actions}</div>
      </div>
    </main>
  )
}

/** The in-app secondary link style — same as the empty states on /interview-prep. */
export const STATUS_LINK = 'text-sm font-semibold text-primary hover:text-accent'
