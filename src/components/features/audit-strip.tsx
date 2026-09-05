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

  if (!data || data.roles_indexed === 0) return <div style={{ height: 44 }} />

  const fmt = (n: number) => n.toLocaleString('en-IN')
  const today = new Date().toISOString().slice(0, 10)
  const when = data.day === today ? 'today' : `on ${data.day}`

  return (
    <p style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body-sm-size)',
      fontVariantNumeric: 'tabular-nums', color: 'var(--color-on-surface-variant)',
      borderTop: '1px solid var(--color-outline-variant)',
      borderBottom: '1px solid var(--color-outline-variant)',
      padding: 'var(--space-md) 0', textAlign: 'center', margin: 'var(--space-xl) 0 0',
    }}>
      {fmt(data.roles_indexed)} roles indexed {when} &middot;{' '}
      {fmt(data.boards_active)} company boards &middot; every score shows its working
    </p>
  )
}
