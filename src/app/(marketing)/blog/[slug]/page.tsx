import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/features/public-shell'
import { POSTS, postBySlug } from '@/lib/blog'
import { siteUrl } from '@/lib/site'

export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })) }
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = postBySlug((await params).slug)
  if (!p) return { title: 'Not found | Jobinko', robots: { index: false } }
  return { title: `${p.title} | Jobinko`, description: p.description, alternates: { canonical: `/blog/${p.slug}` }, openGraph: { title: p.title, description: p.description, type: 'article', url: `/blog/${p.slug}` } }
}

export default async function BlogPost({ params }: Props) {
  const p = postBySlug((await params).slug)
  if (!p) notFound()
  const structured = { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.description, datePublished: p.date, dateModified: p.date, author: { '@type': 'Organization', name: 'Jobinko' }, mainEntityOfPage: `${siteUrl()}/blog/${p.slug}` }
  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground"><Link href="/blog" className="hover:text-primary">Data blog</Link></nav>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">{p.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Counted {p.measuredAt}</p>
      <div className="mt-6 max-w-[62ch] space-y-5 text-sm leading-7 text-muted-foreground">
        {p.blocks.map((b, i) => (
          <section key={i}>
            {b.h ? <h2 className="mb-2 text-lg font-semibold tracking-[-0.03em] text-primary">{b.h}</h2> : null}
            {b.p.map((t, j) => <p key={j} className={j ? 'mt-3' : ''}>{t}</p>)}
          </section>
        ))}
      </div>
      <aside className="mt-10 max-w-[62ch] rounded-2xl border border-border bg-card p-5 text-xs leading-6 text-muted-foreground" aria-label="Method">
        <p><span className="font-semibold text-primary">How it was counted. </span>{p.method}</p>
        <p className="mt-2"><span className="font-semibold text-primary">What it does not show. </span>{p.limits}</p>
      </aside>
      <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {p.related.map((r) => <Link key={r.href} href={r.href} className="font-semibold text-primary underline underline-offset-4">{r.label} →</Link>)}
      </p>
    </PublicShell>
  )
}
