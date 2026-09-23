import { redirect } from 'next/navigation'
import { AppShell } from '@/components/features/app-shell'
import { createClient } from '@/lib/supabase/server'
import { ApplicationBoard, type Application } from '@/components/features/application-board'

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
    .select('id, company, title, apply_url, status, note, follow_up_on, role_id')
    .order('updated_at', { ascending: false })

  /**
   * The match score for each tracked role, so a card carries the same number
   * the shortlist gave it.
   *
   * Read separately rather than joined: applications.role_id is nullable —
   * a role tracked by hand has none — and an inner join would silently drop
   * exactly those rows. A card without a score simply shows no badge.
   */
  const roleIds = [...new Set((data ?? []).map((r) => r.role_id).filter(Boolean))] as string[]
  const scoreFor = new Map<string, number>()
  if (roleIds.length) {
    const { data: scored } = await supabase
      .from('gate_results')
      .select('role_id, score')
      .in('role_id', roleIds)
    for (const g of scored ?? []) if (g.score !== null) scoreFor.set(g.role_id, g.score)
  }

  const rows: Application[] = (data ?? []).map((r) => ({
    id: r.id,
    company: r.company,
    title: r.title,
    applyUrl: r.apply_url,
    status: r.status,
    note: r.note,
    followUpOn: r.follow_up_on,
    score: r.role_id ? scoreFor.get(r.role_id) : undefined,
  }))

  // From the signed-in address rather than a second query just for two letters.
  const initials = (user.email ?? 'you').slice(0, 2).toUpperCase()


  return (
    <AppShell title="Job Tracker" initials={initials}>
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
        {/* The empty state, the follow-up badge and the tracked count live in
            ApplicationBoard now, counted from its own state — computed here
            they stayed stale after every add or remove (QA-15). */}
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
