import Link from 'next/link'
import { PublicShell } from '@/components/features/public-shell'
import { POSTS } from '@/lib/blog'

export const metadata = {
  title: 'Saaf data blog — numbers counted from real job postings | Saaf',
  description: 'What the job postings on Indian company career pages actually say: how many state a salary, where the jobs are, how much experience they ask for — counted, with the method and the date.',
  alternates: { canonical: '/blog' },
}

export default function BlogIndex() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Saaf data blog</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">Numbers Saaf counted itself from real job postings — each with the day it was counted, how, and what it does not show.</p>
      <ul className="mt-8 space-y-4">
        {POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20">
              <p className="text-xs text-muted-foreground">Counted {p.measuredAt}</p>
              <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-primary">{p.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  )
}
