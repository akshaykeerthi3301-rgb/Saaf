import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/features/public-shell'
import { COMPARISONS, comparisonBySlug } from '@/lib/compare'

/** One comparison (F-1204): six questions to ask any tool in the category, and Saaf's checkable answer to each. Claims about Saaf only — see src/lib/compare.ts. */
export function generateStaticParams() { return COMPARISONS.map((c) => ({ slug: c.slug })) }
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = comparisonBySlug((await params).slug)
  if (!c) return { title: 'Not found | Saaf', robots: { index: false } }
  return { title: `${c.metaTitle} | Saaf`, description: c.description, alternates: { canonical: `/compare/${c.slug}` } }
}

export default async function ComparePage({ params }: Props) {
  const c = comparisonBySlug((await params).slug)
  if (!c) notFound()
  return (
    <PublicShell>
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground"><Link href="/compare" className="hover:text-primary">How Saaf compares</Link> / {c.title}</nav>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">{c.title}</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">{c.standfirst}</p>
      {c.note ? <p role="note" className="mt-4 max-w-[62ch] rounded-xl border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">{c.note}</p> : null}
      <ol className="mt-8 space-y-5">
        {c.questions.map((q, i) => (
          <li key={q.q} className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-primary"><span className="mr-2 font-mono text-sm text-muted-foreground">{i + 1}.</span>{q.q}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-primary">Saaf: </span>{q.saaf}</p>
            <p className="mt-3 text-xs"><Link href={q.check.href} className="font-semibold text-primary underline underline-offset-4">{q.check.label} →</Link></p>
          </li>
        ))}
      </ol>
    </PublicShell>
  )
}
