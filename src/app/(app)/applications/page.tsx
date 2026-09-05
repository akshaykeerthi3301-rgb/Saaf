import { redirect } from 'next/navigation'
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

  const due = rows.filter(
    (r) => r.followUpOn && r.followUpOn <= new Date().toISOString().slice(0, 10)
      && r.status !== 'closed',
  ).length

  return (
    <main className="measure" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', gap: 'var(--space-md)', flexWrap: 'wrap',
      }}>
        <h1 style={{ fontSize: 'var(--type-headline-lg-size)', fontWeight: 400, margin: '0 0 8px' }}>
          Your applications
        </h1>
        <nav style={{ display: 'flex', gap: 'var(--space-md)', fontSize: 'var(--type-label-md-size)' }}>
          <a href="/today">Today</a>
          <a href="/profile">Profile</a>
        </nav>
      </div>

      {/* A backend failure must never render as a verdict — an empty board would
          read as "you have applied to nothing", which is a statement about the
          candidate rather than about our read. */}
      {error ? (
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          We couldn&apos;t load your applications. That&apos;s our problem, not a result — try again shortly.
        </p>
      ) : (
        <p style={{
          color: 'var(--color-on-surface-variant)',
          fontSize: 'var(--type-body-sm-size)', margin: '0 0 var(--space-md)',
        }}>
          {rows.length === 0
            ? 'Nothing tracked yet. Track a role from today’s list, or add one you found anywhere.'
            : `${rows.length} tracked${due > 0 ? ` · ${due} to follow up on` : ''}. Only you can see this — nothing here is shared with an employer.`}
        </p>
      )}

      <ApplicationBoard initial={rows} />
    </main>
  )
}
