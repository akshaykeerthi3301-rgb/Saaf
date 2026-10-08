import type { Metadata } from 'next'
import Link from 'next/link'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { Search, Sparkles } from 'lucide-react'
import { PublicJobList } from '@/components/features/public-job-list'
import { searchPublicJobs } from '@/lib/services/public-jobs'
import { checkRateLimit } from '@/lib/rate-limit'
import { cleanPage, searchTokens } from '@/lib/public-search'

/**
 * Public job search (F-1202, TASK-202) — anyone can look; the score is the reason to sign in.
 *
 * ⚠️ NO SCORE IS READ OR COMPUTED HERE. A match score belongs to a signed-in candidate's own résumé;
 * every row shows it locked, with the way to unlock it, rather than an invented number. The list is
 * shallow on purpose (20 a page, three pages — src/lib/public-search.ts) and a query page is
 * `noindex`: only the plain /jobs list is for search engines, so thousands of query URLs do not
 * compete with the job pages themselves.
 *
 * The page is public: src/proxy.ts's matcher does not cover /jobs.
 */
type Props = { searchParams: Promise<{ q?: string; city?: string; page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams
  const plain = !p.q && !p.city && !p.page
  return {
    title: 'Jobs in India — newest roles, scored against your résumé | Jobinko',
    description: 'Search the newest jobs from company career pages across India. Sign in free and Jobinko scores every one against your résumé, with the reason for each number.',
    alternates: { canonical: '/jobs' },
    robots: plain ? undefined : { index: false, follow: true },
  }
}

// 40 searches / 10 minutes / IP: generous for a person, tedious for a scraper.
const LIMIT = { scope: 'public-search', limit: 40, windowMs: 10 * 60_000 }
async function callerKey(): Promise<string> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export default async function PublicJobsPage({ searchParams }: Props) {
  const p = await searchParams
  const q = (p.q ?? '').slice(0, 120)
  const city = (p.city ?? '').slice(0, 60)
  const page = cleanPage(p.page)
  const limited = !checkRateLimit(await callerKey(), LIMIT).ok
  const { rows, more } = limited ? { rows: [], more: false } : await searchPublicJobs({ q, city, page })
  const searching = searchTokens(q).length > 0 || searchTokens(city).length > 0
  const link = (n: number) => `/jobs?${new URLSearchParams({ ...(q ? { q } : {}), ...(city ? { city } : {}), ...(n > 1 ? { page: String(n) } : {}) })}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Jobinko home">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg shadow-sm"><Sparkles className="size-4" /></span>
            Jobinko
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/tools/ats-checker" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">ATS checker</Link>
            <Link href="/signin" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/60">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8">
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Jobs in India</h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-6 text-muted-foreground">
          The newest roles from company career pages. Anyone can search. Sign in free and Jobinko scores every one of them against your résumé —
          with the line from the posting behind each number.
        </p>

        <form action="/jobs" method="get" className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto]" role="search">
          <label className="sr-only" htmlFor="q">Job title or company</label>
          <input id="q" name="q" defaultValue={q} maxLength={120} placeholder="Job title or company — Product Analyst, Razorpay…" className="rounded-xl border border-input bg-card px-4 py-3 text-sm text-primary outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/10" />
          <label className="sr-only" htmlFor="city">City</label>
          <input id="city" name="city" defaultValue={city} maxLength={60} placeholder="City" className="rounded-xl border border-input bg-card px-4 py-3 text-sm text-primary outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/10" />
          <button type="submit" className="bg-brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"><Search className="size-4" aria-hidden="true" /> Search</button>
        </form>

        {limited ? (
          <p role="status" className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">You have searched a lot in a short while. Try again in a few minutes — or sign in, where the search has no such limit.</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
            {searching ? 'No roles match that. Try fewer or simpler words.' : 'Nothing to show right now.'}
          </p>
        ) : (
          <>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{searching ? 'Matches, newest first' : 'Newest roles'}</p>
            <div className="mt-3"><PublicJobList rows={rows} /></div>
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
              {page > 1 ? <Link href={link(page - 1)} className="font-semibold text-primary underline underline-offset-4">← Newer</Link> : <span />}
              {more ? <Link href={link(page + 1)} className="font-semibold text-primary underline underline-offset-4">Older →</Link> : <span />}
            </nav>
            <p className="mt-6 text-xs leading-5 text-muted-foreground">
              Showing at most {60} roles per search. <Link href="/signin" className="font-semibold text-primary underline underline-offset-4">Sign in</Link> to search all of them, scored for you.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
