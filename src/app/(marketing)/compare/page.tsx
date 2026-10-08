import Link from 'next/link'
import { PublicShell } from '@/components/features/public-shell'
import { COMPARISONS } from '@/lib/compare'

export const metadata = {
  title: 'How Jobinko compares — questions to ask any job tool | Jobinko',
  description: 'Six questions to ask any job site, ATS résumé checker or auto-apply tool — and Jobinko’s checkable answer to each.',
  alternates: { canonical: '/compare' },
}

export default function CompareIndex() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold tracking-[-0.04em] text-primary sm:text-4xl">How Jobinko compares</h1>
      <p className="mt-3 max-w-[62ch] text-sm leading-6 text-muted-foreground">
        Rather than tell you what other products do — which we cannot keep current — these pages list the questions worth asking of any tool in each category, with Jobinko’s answer to each and where you can check it.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {COMPARISONS.map((c) => (
          <li key={c.slug}>
            <Link href={`/compare/${c.slug}`} className="block h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20">
              <p className="text-base font-semibold tracking-[-0.02em] text-primary">{c.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.standfirst}</p>
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  )
}
