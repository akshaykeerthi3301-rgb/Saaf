import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * The frame for the three standing documents — privacy, terms and the index
 * audit. They had no chrome at all before, which meant a candidate who followed
 * a link into one had no way back out.
 *
 * Deliberately narrower and quieter than the landing page: these are read, not
 * sold. The header is the same mark, so it reads as the same product.
 */
export function DocPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary"
          aria-label="Saaf home"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="size-4" />
          </span>
          Saaf AI
        </Link>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/audit" className="transition-colors hover:text-foreground">Index audit</Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">Terms</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.05em] text-primary sm:text-4xl">
          {title}
        </h1>
        {children}
      </main>
    </div>
  )
}
