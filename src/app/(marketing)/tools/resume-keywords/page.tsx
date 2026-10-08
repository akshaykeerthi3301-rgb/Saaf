import Link from 'next/link'
import { PublicShell } from '@/components/features/public-shell'
import { keywordRoleSlug, KEYWORD_ROLES } from '@/lib/role-keywords'

export const metadata = {
  title: 'Résumé keywords by role — measured from real postings | Jobinko',
  description: 'For each role, the words its job postings use most and the share of postings containing each — counted from company career pages, not guessed.',
  alternates: { canonical: '/tools/resume-keywords' },
}

/** The front door for the per-role keyword pages (F-1207): every role Jobinko has a measurement for. */
export default function ResumeKeywordsIndex() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">Résumé keywords by role</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">Pick a role to see the words its job postings use most — counted across real postings, with the share that contains each. Then check your résumé for them, free.</p>
      <ul className="mt-8 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {KEYWORD_ROLES.map((r) => <li key={r}><Link href={`/tools/resume-keywords/${keywordRoleSlug(r)}`} className="text-primary underline-offset-4 hover:underline">{r}</Link></li>)}
      </ul>
    </PublicShell>
  )
}
