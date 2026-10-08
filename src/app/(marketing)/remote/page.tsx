import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell } from '@/components/features/public-shell'
import { PublicJobList } from '@/components/features/public-job-list'
import { readRemoteHub } from '@/lib/services/public-jobs'
import { roleSlug } from '@/lib/seo-pages'
import { siteUrl } from '@/lib/site'

/**
 * Remote jobs in India (F-1205, TASK-203). ⚠️ "REMOTE" HERE MEANS WHAT THE POSTING'S OWN LOCATION SAYS —
 * "remote", "anywhere" or "work from home" — the same rule the feed's Remote filter uses
 * (src/gates/extract.ts isRemoteLocation), not a guess from the description. Counts are Saaf's own
 * and exact; the role mix is of the newest 300 remote roles and says so.
 */
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const d = await readRemoteHub()
  return {
    title: `Remote jobs in India${d.total ? ` — ${d.total.toLocaleString('en-IN')} open roles` : ''} | Saaf`,
    description: 'Remote jobs open to people in India, from company career pages, newest first. Sign in free and each one is scored against your résumé.',
    alternates: { canonical: '/remote' },
    robots: d.total >= 5 ? undefined : { index: false, follow: true },
  }
}

export default async function RemotePage() {
  const d = await readRemoteHub()
  const structured = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Remote jobs in India', url: `${siteUrl()}/remote`, numberOfItems: d.latest.length,
    itemListElement: d.latest.map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteUrl()}/jobs/${j.id}`, name: `${j.title} at ${j.company}` })),
  }
  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Remote jobs in India</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">
        {d.total > 0
          ? <>Saaf is tracking <strong className="text-primary">{d.total.toLocaleString('en-IN')}</strong> open roles whose location says remote, from company career pages.</>
          : <>No remote roles right now — Saaf checks company career pages every day.</>}
        {' '}A role is listed as remote only when the posting’s own location says so (“remote”, “anywhere” or “work from home”) — never on our guess.
        Sign in free and each one is scored against your résumé, with the line from the posting behind every number.
      </p>

      {d.latest.length ? (
        <section className="mt-8" aria-label="Newest remote roles">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Most recently posted</h2>
          <div className="mt-3"><PublicJobList rows={d.latest} /></div>
          <p className="mt-3 text-xs text-muted-foreground"><Link href="/jobs?q=remote" className="font-semibold text-primary underline underline-offset-4">Search for more</Link></p>
        </section>
      ) : null}

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {d.roles.length ? (
          <section aria-label="Roles">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Roles with the most remote openings</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Among the newest {d.sampled} remote roles.</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {d.roles.map((r) => <li key={r.role} className="flex justify-between gap-3"><Link href={`/roles/${roleSlug(r.role)}`} className="text-primary underline-offset-4 hover:underline">{r.role}</Link><span className="font-mono tabular-nums text-muted-foreground">{r.n}</span></li>)}
            </ul>
          </section>
        ) : null}
        {d.employers.length ? (
          <section aria-label="Employers">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Employers with the most remote roles</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Among the newest {d.sampled} remote roles.</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {d.employers.map((e) => <li key={e.company} className="flex justify-between gap-3"><span className="text-primary">{e.company}</span><span className="font-mono tabular-nums text-muted-foreground">{e.n}</span></li>)}
            </ul>
          </section>
        ) : null}
      </div>
    </PublicShell>
  )
}
