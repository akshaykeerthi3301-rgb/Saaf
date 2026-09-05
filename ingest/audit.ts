import { createClient } from '@supabase/supabase-js'

/**
 * Write today's public audit row.
 *
 * Both published figures were wrong, and this is the fix.
 *
 * `roles_indexed` was handed the RAW count of postings fetched from every
 * board worldwide, before the India filter and before the corporate filter —
 * 933 published against 650 actually in the index, a 43% overstatement on the
 * one number the brand rests on. It is now counted from the table.
 *
 * `roles_withheld` summed withheld rows across EVERY user's gate_results, so
 * it described the userbase rather than the index and grew as users joined
 * while supply stayed flat. Under ranking nothing is withheld at all, so it is
 * retired: written as 0 and no longer displayed anywhere.
 *
 * `by_reason` was the refusal-reason distribution. With no refusals it becomes
 * what the index actually supports: how many roles state each kind of
 * requirement. That keeps the page checkable — the point was never the
 * refusals themselves, it was publishing something a reader can verify.
 */
export async function writeAudit(): Promise<void> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { count: boardsActive } = await db
    .from('boards').select('id', { count: 'exact', head: true }).eq('active', true)

  const { count: rolesIndexed } = await db
    .from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)

  const { data: reqs, error } = await db
    .from('role_requirements').select('kind, role_id')
  if (error) throw error

  // Roles stating each requirement kind, not requirement rows — a posting
  // repeating "5+ years" three times states one experience floor, not three.
  const rolesPerKind = new Map<string, Set<string>>()
  for (const r of reqs ?? []) {
    if (!rolesPerKind.has(r.kind)) rolesPerKind.set(r.kind, new Set())
    rolesPerKind.get(r.kind)!.add(r.role_id)
  }
  const byReason = Object.fromEntries(
    [...rolesPerKind.entries()].map(([kind, roles]) => [kind, roles.size])
  )

  const day = new Date().toISOString().slice(0, 10)
  const { error: wErr } = await db.from('audit_daily').upsert({
    day,
    roles_indexed: rolesIndexed ?? 0,
    roles_withheld: 0,
    boards_active: boardsActive ?? 0,
    by_reason: byReason,
  }, { onConflict: 'day' })
  if (wErr) throw wErr

  console.log(`  audit ${day}: ${rolesIndexed} indexed · ${boardsActive} boards · ${JSON.stringify(byReason)}`)
}
