import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PublicShell } from '@/components/features/public-shell'
import { keywordRoleFromSlug, roleKeywordFacts } from '@/lib/role-keywords'
import { roleSlug as rolePageSlug, roleFromSlug } from '@/lib/seo-pages'
import { slugify } from '@/lib/seo-pages'

/**
 * "Resume keywords for <role>" (F-1207, TASK-203) — a tool landing page made of Saaf's own measurement:
 * the terms postings for that role use most and the share of them that contain each, with the posting
 * count they were measured across. The slug must be one of the roles Saaf measured or the page is a 404.
 */
export const revalidate = 86400
export const dynamicParams = true
export function generateStaticParams() { return [] }

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).role
  const role = keywordRoleFromSlug(slug)
  const facts = role ? roleKeywordFacts(role) : null
  if (!role || !facts) return { title: 'Not found | Saaf', robots: { index: false } }
  return {
    title: `${role} resume keywords — measured across ${facts.postings.toLocaleString('en-IN')} postings | Saaf`,
    description: `The words ${facts.postings.toLocaleString('en-IN')} ${role} job postings use most, and the share of postings containing each — then check your résumé for them, free, no sign-up.`,
    alternates: { canonical: `/tools/resume-keywords/${slug}` },
  }
}

export default async function RoleKeywordsPage({ params }: Props) {
  const slug = (await params).role
  const role = keywordRoleFromSlug(slug)
  const facts = role ? roleKeywordFacts(role) : null
  if (!role || !facts) notFound()
  const hasRolePage = roleFromSlug(slugify(role)) !== null
  return (
    <PublicShell>
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground"><Link href="/tools" className="hover:text-primary">Free tools</Link> / <Link href="/tools/resume-keywords" className="hover:text-primary">Résumé keywords</Link> / {role}</nav>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">{role} résumé keywords</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">
        Saaf read {facts.postings.toLocaleString('en-IN')} {role} postings from company career pages and counted the words they use. These are the most common, and the share of
        those postings that contain each one.{' '}
        {facts.medianYears !== null ? <>Among the postings that state an experience requirement, the middle value is <strong className="text-primary">{facts.medianYears} years</strong>. </> : null}
        It is a count, not advice: a word is worth putting on your résumé only if it is true of you.
      </p>

      <table className="mt-8 w-full text-left text-sm">
        <caption className="sr-only">Terms used in {role} postings</caption>
        <thead className="text-xs uppercase tracking-[0.1em] text-muted-foreground"><tr><th scope="col" className="py-2 pr-3">Term</th><th scope="col" className="py-2 pr-3">Postings that use it</th><th scope="col" className="py-2 text-right">Share</th></tr></thead>
        <tbody className="divide-y divide-border rounded-2xl border border-border">
          {facts.terms.map((t) => (
            <tr key={t.term}>
              <th scope="row" className="py-2.5 pr-3 font-semibold text-primary">{t.term}</th>
              <td className="py-2.5 pr-3">
                <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, t.pct)}%` }} /></div>
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-muted-foreground">{t.pct}% <span className="text-[11px]">({t.count}/{facts.postings})</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-10 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-primary">See which of these your résumé already has</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">The free ATS checker compares your résumé against this exact list and shows what a parser reads out of it. No sign-up, nothing stored.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link href={`/tools/ats-checker?role=${encodeURIComponent(role)}`} className="bg-brand-gradient inline-flex rounded-xl px-4 py-2 text-sm font-semibold">Check my résumé for {role}</Link>
          {hasRolePage ? <Link href={`/roles/${rolePageSlug(role)}`} className="text-sm font-semibold text-primary underline underline-offset-4">Open {role} jobs</Link> : null}
        </div>
      </section>
    </PublicShell>
  )
}
