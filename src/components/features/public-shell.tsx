import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * The frame for Jobinko's public content pages (remote hub, comparisons, blog, keyword pages): the mark,
 * two quiet links and Sign in, then a readable column. The pages are read, not sold — the same restraint
 * as DocPage, but wide enough for a list.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Jobinko home">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg shadow-sm"><Sparkles className="size-4" /></span>
            Jobinko
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/jobs" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">Search jobs</Link>
            <Link href="/tools/ats-checker" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">ATS checker</Link>
            <Link href="/signin" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/60">Sign in</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-8 sm:px-8">{children}</main>
    </div>
  )
}
