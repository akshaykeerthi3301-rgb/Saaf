import { createClient } from '@supabase/supabase-js'

/**
 * Above-the-fold proof, first-party.
 *
 * This replaces the canonical logo bar. Saaf has no customers to show, and the
 * reference playbook's own rule is "either show the logos or remove the
 * section" — so instead of borrowing credibility it publishes its own figures.
 *
 * Never renders zeros. If no run has completed it renders nothing at all —
 * a zero would read as a result rather than as missing data.
 */
export async function AuditStrip() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { data } = await db
    .from('audit_daily')
    .select('day, roles_indexed, boards_active')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data || data.roles_indexed === 0) return <div className="h-11" />

  const fmt = (n: number) => n.toLocaleString('en-IN')
  const today = new Date().toISOString().slice(0, 10)
  const when = data.day === today ? 'today' : `on ${data.day}`

  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card px-6 py-4 text-center">
      <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        <strong className="font-semibold text-foreground">{fmt(data.roles_indexed)}</strong>{' '}
        roles indexed {when} &middot;{' '}
        <strong className="font-semibold text-foreground">{fmt(data.boards_active)}</strong>{' '}
        company boards &middot; every score shows its working
      </p>
    </div>
  )
}
