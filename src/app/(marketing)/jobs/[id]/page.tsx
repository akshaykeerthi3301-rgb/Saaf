import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, BarChart3, Building2, FileSearch, MapPin, Quote, Sparkles, Tag, Zap } from 'lucide-react'
import { readPublicJob } from '@/lib/services/public-jobs'
import { postedAgo } from '@/lib/day'
import { siteUrl } from '@/lib/site'

/**
 * A public page for one indexed role — Jobright's job page, Saaf's data
 * (founder decision 2026-09-25, PROJECT-STATE Stage AF).
 *
 * PUBLIC ON PURPOSE: src/proxy.ts's matcher does not cover /jobs. A signed-out
 * visitor reads the posting; the match score is the reason to sign in.
 *
 * ⚠️ THE POSTING IS UNTRUSTED THIRD-PARTY TEXT (roles.description's column
 * comment). It is rendered as text nodes only, and the JSON-LD block escapes
 * `<` so a posting containing "</script>" cannot end the tag early.
 *
 * Cached for an hour: crawlers will hit these far more than people, and a
 * posting changes at most once a day when the ingest runs. A role the ingest
 * has deleted (closed) 404s into ./not-found.tsx.
 */
export const revalidate = 3600

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const job = await readPublicJob(id)
  if (!job) return { title: 'Role closed | Saaf', robots: { index: false } }
  const where = job.city ? ` in ${job.city}` : ''
  const summary = job.plainDescription.replace(/\s+/g, ' ').slice(0, 155)
  return {
    title: `${job.title} at ${job.company}${where} | Saaf`,
    description: summary,
    alternates: { canonical: `/jobs/${job.id}` },
    openGraph: { title: `${job.title} at ${job.company}`, description: summary, url: `/jobs/${job.id}`, type: 'website' },
  }
}

export default async function PublicJobPage({ params }: Props) {
  const { id } = await params
  const job = await readPublicJob(id)
  if (!job) notFound()

  const posted = postedAgo(job.postedAt)
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.plainDescription,
    datePosted: (job.postedAt ?? job.firstSeenAt).slice(0, 10),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.city ?? job.location ?? undefined, addressCountry: job.inIndia ? 'IN' : undefined },
    },
    ...(job.pay ? { baseSalary: { '@type': 'MonetaryAmount', currency: job.pay.currency, value: { '@type': 'QuantitativeValue', minValue: job.pay.low, maxValue: job.pay.high, unitText: job.pay.period === 'year' ? 'YEAR' : 'MONTH' } } } : {}),
    directApply: false,
    url: `${siteUrl()}/jobs/${job.id}`,
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        // Escaped: a posting is untrusted text and "</script>" inside it must not close this tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }}
      />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Saaf home">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg shadow-sm">
              <Sparkles className="size-4" />
            </span>
            Saaf
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/tools" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">Free tools</Link>
            <Link href="/signin" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/60">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 pb-28 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-8">
        <article className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{job.company}</span>
              {posted ? <> · {posted}</> : null}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em] text-primary sm:text-3xl">{job.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-primary">
              {job.city || job.location ? <Chip icon={MapPin}>{job.city ?? job.location}</Chip> : null}
              {job.seniority ? <Chip icon={BarChart3}>{job.seniority}</Chip> : null}
              {job.easyApply ? <Chip icon={Zap}>Easy Apply</Chip> : null}
              {job.pay ? <Chip icon={Tag}>{job.pay.text}</Chip> : null}
            </div>
            {job.culture.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {job.culture.map((c) => (
                  <span key={c.tag} title={`From the posting: “${c.evidence}”`} className="rounded-full border border-score-high/30 bg-score-high/10 px-3 py-1 text-xs text-score-high">
                    {c.tag}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <FileSearch className="size-3.5 text-accent" /> The posting
            </h2>
            {job.description.length ? (
              <>
                <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="size-2 rounded-sm bg-brand" /> key requirement, as the employer wrote it
                </p>
                <div className="mt-4 space-y-2.5 text-sm leading-6 text-muted-foreground">
                  {job.description.map((b, i) =>
                    b.kind === 'heading' ? (
                      <h3 key={i} className="pt-3 text-sm font-semibold text-primary">{b.text}</h3>
                    ) : (
                      <p key={i} className={`${b.kind === 'bullet' ? 'pl-4' : ''} ${b.requirement ? 'rounded-r-lg border-l-2 border-brand bg-brand/10 py-1 pl-3 pr-2 text-primary' : ''}`}>
                        {b.kind === 'bullet' && !b.requirement ? <span className="-ml-3 mr-1.5 text-accent">•</span> : null}
                        {b.requirement ? <Quote className="mr-1.5 inline size-3 text-accent" aria-hidden="true" /> : null}
                        {b.text}
                      </p>
                    ),
                  )}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">The employer&apos;s board sent no description for this role.</p>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
              <Building2 className="size-3.5 text-accent" /> {job.company}
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Open roles in India" value={String(job.employer.openRolesInIndia)} />
              <Stat label="Hiring in" value={job.employer.cities.join(', ') || '—'} />
              <Stat label="Applications through" value={job.employer.ats ?? 'Their own site'} />
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">Counted from the roles we read off {job.company}&apos;s own hiring page today — no third-party data.</p>
            {job.more.length ? (
              <div className="mt-5">
                <p className="text-xs font-semibold text-primary">More at {job.company}</p>
                <ul className="mt-2 divide-y divide-border">
                  {job.more.map((m) => (
                    <li key={m.id}>
                      <Link href={`/jobs/${m.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm text-primary hover:text-accent">
                        <span className="min-w-0 truncate">{m.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{m.city ?? ''}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="glow-hover rounded-3xl border border-border bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Free</p>
            <h2 className="mt-1 text-base font-semibold text-primary">Your match score for this role</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Upload your résumé once. We score you against this posting and every other role we read today, and show which sentence of the posting each point came from.
            </p>
            {/* Through /today so the sign-in gate remembers where to come back to (src/proxy.ts). */}
            <Link href={`/today?role=${job.id}`} className="bg-brand-gradient mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
              <Sparkles className="size-4" /> See my match score
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-primary">Check without signing up</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Paste this posting and your résumé into the free match checker. Nothing is stored.</p>
            <Link href="/tools/paste-jd" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              Open the match checker <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-primary"><Tag className="size-3.5 text-accent" /> Apply</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Applications go to {job.company} directly. Saaf never applies for you.</p>
            <a href={job.applyUrl} target="_blank" rel="nofollow noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              Apply on {job.company}&apos;s site <ArrowUpRight className="size-3.5" />
            </a>
          </div>
        </aside>
      </main>

      {/* Phones: the rail sits below a long posting, so the two actions that
          matter are pinned to the bottom of the screen instead. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/85 p-3 backdrop-blur-md lg:hidden">
        <Link href={`/today?role=${job.id}`} className="bg-brand-gradient flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
          <Sparkles className="size-4" /> My match score
        </Link>
        <a href={job.applyUrl} target="_blank" rel="nofollow noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary">
          Apply <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function Chip({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1">
      <Icon className="size-3" aria-hidden="true" />
      {children}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-primary">{value}</dd>
    </div>
  )
}
