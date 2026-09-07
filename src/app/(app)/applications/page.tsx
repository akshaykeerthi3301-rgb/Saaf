import { redirect } from 'next/navigation'
import { CalendarClock } from 'lucide-react'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ApplicationBoard, type Application } from '@/components/features/application-board'
import { istDay } from '@/lib/day'

/**
 * The tracker.
 *
 * Where the shortlist used to dead-end: a candidate decided a role was worth
 * their next forty minutes and then left for a spreadsheet. Parity item 1 in
 * docs/PARITY.md.
 *
 * Read through the request client, so RLS is doing the filtering. The .eq on
 * user_id is deliberately absent — the "own applications" policy already
 * restricts this to the caller, and a query that filters by user itself invites
 * the belief that the filter is the protection.
 */
export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data, error } = await supabase
    .from('applications')
    .select('id, company, title, apply_url, status, note, follow_up_on')
    .order('updated_at', { ascending: false })

  const rows: Application[] = (data ?? []).map((r) => ({
    id: r.id,
    company: r.company,
    title: r.title,
    applyUrl: r.apply_url,
    status: r.status,
    note: r.note,
    followUpOn: r.follow_up_on,
  }))

  // From the signed-in address rather than a second query just for two letters.
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()

  const due = rows.filter(
    (r) => r.followUpOn && r.followUpOn <= istDay()
      && r.status !== 'closed',
  ).length

  return (
    <AppShell title="Applications" initials={initials}>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {/* The header above already says "Applications". A headline, an
                eyebrow and a subtitle repeating it were three labels for one
                page. The empty state stays — it tells you what to do next. */}
            {rows.length === 0 ? (
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                Nothing tracked yet. Track a role from today’s list, or add one you found anywhere.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {due > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                <CalendarClock className="size-3.5" />
                {due} to follow up on
              </span>
            )}
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {rows.length} tracked
            </span>
          </div>
        </div>

        {/* A backend failure must never render as a verdict — an empty board would
            read as "you have applied to nothing", which is a statement about the
            candidate rather than about our read. */}
        {error ? (
          <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            We couldn&apos;t load your applications. That&apos;s our problem, not a result — try again shortly.
          </p>
        ) : (
          <ApplicationBoard initial={rows} />
        )}
      </div>
    </AppShell>
  )
}
