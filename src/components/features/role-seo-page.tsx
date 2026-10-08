import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { PublicJobList } from '@/components/features/public-job-list'
import type { RolePageData } from '@/lib/services/public-jobs'
import { cityFromSlug, citySlug, isIndexable, MIN_ROLES_TO_INDEX, roleSlug } from '@/lib/seo-pages'
import type { City } from '@/lib/taxonomy/locations'
import { roleVocabulary } from '@/lib/ats-check'
import { postedAgo } from '@/lib/day'
import { siteUrl } from '@/lib/site'

/**
 * One role page ("Product Manager jobs in India") or role-in-city page ("…in Pune") — F-1203, TASK-158.
 * Everything on it is Jobinko's own count of its own index, in Jobinko's words: the exact total, the newest
 * twenty postings (each a link to its public page, with the match score shown locked), the employers
 * and cities among the newest 300, and the terms postings for this role use most (measured across
 * the postings counted in src/lib/taxonomy/role-keywords.json). No pay figure, no demand claim, no
 * number Jobinko did not count. A page under the thin-content threshold still says what exists.
 */
export function RoleSeoPage({ role, city, data }: { role: string; city: City | null; data: RolePageData }) {
  const where = city ? city.name : 'India'
  const vocab = roleVocabulary(role)
  const url = `${siteUrl()}/roles/${roleSlug(role)}${city ? `/${citySlug(city)}` : ''}`
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${role} jobs in ${where}`,
    url,
    numberOfItems: data.latest.length,
    itemListElement: data.latest.map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: `${siteUrl()}/jobs/${j.id}`, name: `${j.title} at ${j.company}` })),
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} />
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.03em] text-primary" aria-label="Jobinko home">
            <span className="bg-brand-gradient flex size-8 items-center justify-center rounded-lg shadow-sm"><Sparkles className="size-4" /></span>
            Jobinko
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/jobs" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">Search jobs</Link>
            <Link href="/signin" className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-secondary/60">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-8 sm:px-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/roles" className="hover:text-primary">Roles</Link> / {city ? <><Link href={`/roles/${roleSlug(role)}`} className="hover:text-primary">{role}</Link> / {city.name}</> : role}
        </nav>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">{role} jobs in {where}</h1>
        <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">
          {data.total > 0
            ? <>Jobinko is tracking <strong className="text-primary">{data.total.toLocaleString('en-IN')}</strong> open {role} role{data.total === 1 ? '' : 's'} in {where}, read from company career pages{data.latest[0] && (data.latest[0].postedAt ?? data.latest[0].firstSeenAt) ? <> — the newest was {postedAgo(data.latest[0].postedAt ?? data.latest[0].firstSeenAt)?.toLowerCase() ?? 'posted recently'}</> : null}.</>
            : <>Jobinko has no open {role} roles in {where} right now. It checks company career pages every day, so this fills in as employers post.</>}
          {' '}Sign in free and each one is scored against your résumé, with the line from the posting behind every number.
        </p>
        {!isIndexable(data.total) && data.total > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">This is a small list (fewer than {MIN_ROLES_TO_INDEX}). <Link href={city ? `/roles/${roleSlug(role)}` : '/jobs'} className="font-semibold text-primary underline underline-offset-4">{city ? `All ${role} roles in India` : 'Search all roles'}</Link> has more.</p>
        ) : null}

        {data.latest.length ? (
          <section className="mt-8" aria-label={`Newest ${role} roles`}>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Newest {role} roles</h2>
            <div className="mt-3"><PublicJobList rows={data.latest} /></div>
            <p className="mt-3 text-xs text-muted-foreground"><Link href={`/jobs?q=${encodeURIComponent(role)}${city ? `&city=${encodeURIComponent(city.name)}` : ''}`} className="font-semibold text-primary underline underline-offset-4">Search these roles</Link> for more.</p>
          </section>
        ) : null}

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {data.employers.length ? (
            <section aria-label="Employers">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Employers with the most roles</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Among the newest {data.sampled} {role} roles.</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.employers.map((e) => <li key={e.company} className="flex justify-between gap-3"><span className="text-primary">{e.company}</span><span className="font-mono tabular-nums text-muted-foreground">{e.n}</span></li>)}
              </ul>
            </section>
          ) : null}
          {!city && data.cities.length ? (
            <section aria-label="Cities">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Where they are</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">Among the newest {data.sampled} {role} roles.</p>
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.cities.map((c) => {
                  const known = cityFromSlug(c.city.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
                  return (
                    <li key={c.city} className="flex justify-between gap-3">
                      {known ? <Link href={`/roles/${roleSlug(role)}/${citySlug(known)}`} className="text-primary underline-offset-4 hover:underline">{c.city}</Link> : <span className="text-primary">{c.city}</span>}
                      <span className="font-mono tabular-nums text-muted-foreground">{c.n}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
        </div>

        {vocab ? (
          <section className="mt-10" aria-label="What postings ask for">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">What {role} postings use most</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Terms counted across {vocab.postings.toLocaleString('en-IN')} {role} postings Jobinko measured — words to check your résumé for, not a promise about any one job.</p>
            <p className="mt-3 flex flex-wrap gap-2">
              {vocab.terms.slice(0, 12).map((t) => <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-primary">{t}</span>)}
            </p>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-primary">Is your résumé readable for {role} roles?</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">The free ATS checker shows what an applicant tracking system extracts from your résumé and what to change. No sign-up.</p>
          <Link href="/tools/ats-checker" className="bg-brand-gradient mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold">Check my résumé</Link>
        </section>
      </main>
    </div>
  )
}
