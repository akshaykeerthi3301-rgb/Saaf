import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { roleSlug, ROLE_GROUPS } from '@/lib/seo-pages'

export const metadata = {
  title: 'Jobs by role in India | Jobinko',
  description: 'Browse open jobs in India by role — software, data, product, design, sales, marketing, finance, operations, HR and more — from company career pages.',
  alternates: { canonical: '/roles' },
}

/** Every role Jobinko measures, grouped the way its own taxonomy groups them — the front door for the role pages (F-1203). */
export default function RolesIndexPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Jobinko home">
          <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg shadow-sm"><Sparkles className="size-4" /></span>
          Jobinko
        </Link>
        <Link href="/jobs" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Search jobs</Link>
      </header>
      <main className="mx-auto max-w-4xl px-5 pb-20 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Jobs by role</h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-6 text-muted-foreground">Pick a role to see the open jobs Jobinko is tracking for it across India, newest first.</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {ROLE_GROUPS.map((g) => (
            <section key={g.label}>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{g.label}</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {g.roles.map((r) => <li key={r}><Link href={`/roles/${roleSlug(r)}`} className="text-primary underline-offset-4 hover:underline">{r}</Link></li>)}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
