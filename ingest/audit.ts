import { createClient } from '@supabase/supabase-js'

/**
 * Write today's public audit row.
 *
 * P0 even though the audit PAGE is P1: the landing page's only proof depends on
 * these counts, and they are a free by-product of work the gate engine has
 * already done.
 */
export async function writeAudit(rolesIndexed: number): Promise<void> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { count: boardsActive } = await db
    .from('boards').select('id', { count: 'exact', head: true }).eq('active', true)

  const { data: results, error } = await db
    .from('gate_results').select('outcome, refused_on')
  if (error) throw error

  const withheld = (results ?? []).filter((r) => r.outcome === 'withheld')
  const byReason: Record<string, number> = {}
  for (const r of withheld) {
    const k = r.refused_on ?? 'unstated'
    byReason[k] = (byReason[k] ?? 0) + 1
  }

  const day = new Date().toISOString().slice(0, 10)
  const { error: wErr } = await db.from('audit_daily').upsert({
    day,
    roles_indexed: rolesIndexed,
    roles_withheld: withheld.length,
    boards_active: boardsActive ?? 0,
    by_reason: byReason,
  }, { onConflict: 'day' })
  if (wErr) throw wErr

  console.log(`  audit ${day}: ${rolesIndexed} indexed · ${withheld.length} withheld · ${JSON.stringify(byReason)}`)
}
