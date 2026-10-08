import Link from 'next/link'
import { Lock, MapPin, Zap } from 'lucide-react'
import type { PublicSearchRow } from '@/lib/services/public-jobs'
import { postedAgo } from '@/lib/day'

/**
 * The rows of every public job list (/jobs, the role pages, the remote hub): a link to the posting's public page,
 * where it is and when it was posted, and the match score shown LOCKED — a score belongs to a signed-in
 * candidate's own résumé, so none is read or computed on a public page.
 */
export function PublicJobList({ rows }: { rows: PublicSearchRow[] }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((r) => {
        const posted = postedAgo(r.postedAt ?? r.firstSeenAt)
        return (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <Link href={`/jobs/${r.id}`} className="block text-base font-semibold leading-snug tracking-[-0.02em] text-primary hover:underline">{r.title}</Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-primary/90">{r.company}</span>
                {r.city ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" />{r.city}</span> : null}
                {posted ? <span>{posted}</span> : null}
                {r.easyApply ? <span className="inline-flex items-center gap-1"><Zap className="size-3" aria-hidden="true" />Easy apply</span> : null}
              </p>
            </div>
            <Link href="/signin" title="Sign in free to see how well this role fits your résumé" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-accent/60 hover:text-primary">
              <Lock className="size-3" aria-hidden="true" /> Your match — sign in
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
