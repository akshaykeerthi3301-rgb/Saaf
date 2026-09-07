import { createClient } from '@supabase/supabase-js'
import { istDay } from '@/lib/day'

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
 *
 * That last figure was itself wrong until 2026-09-06. It was computed by
 * selecting every role_requirements row and aggregating in JS, and PostgREST
 * caps a response at 1,000 rows against 1,496 in the table — so every kind was
 * published roughly a third low (location 431 against a true 652). The
 * aggregation now happens in SQL. See migration 0016.
 *
 * If the function is missing, this writes NO audit row rather than a wrong
 * one. A stale row renders with its own date and reads honestly; a fresh row
 * carrying a number we could not actually compute does not.
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

  const { data: kinds, error } = await db.rpc('audit_requirement_kinds')
  if (error) {
    console.error(
      `  audit: audit_requirement_kinds() unavailable (${error.message}). ` +
      'Apply supabase/migrations/0016_audit_requirement_kinds.sql. ' +
      'No audit row written — a wrong figure is worse than a stale one.'
    )
    return
  }

  const byReason = Object.fromEntries(
    (kinds as { kind: string; roles: number }[]).map((k) => [k.kind, Number(k.roles)])
  )

  const day = istDay()
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
