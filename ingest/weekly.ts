import { createClient } from '@supabase/supabase-js'
import { maxPostingAgeDays } from './lifecycle'

/**
 * The weekly housekeeping — see supabase/migrations/0055_weekly_housekeeping_batches.sql.
 *
 * (1) lists what arrived this week, BEFORE deleting anything; (2) removes cross-site duplicates
 * (smallest board id kept) in batches; (3) deletes the oldest postings past the window in batches,
 * at most `maxEvictFraction` of the open jobs per run; (4) writes the week's row in
 * `weekly_listing_reports`. The database refuses one statement that runs long, so the work is many
 * small calls — each safe to repeat. A run that hits its time budget stops cleanly and reports what
 * it did; the next run carries on.
 */
export type Rpc = (name: string, args?: Record<string, unknown>) => Promise<unknown>

export type WeeklyOptions = { days?: number; batch?: number; maxEvictFraction?: number; budgetMs?: number; now?: () => number }

export async function runWeeklyWith(rpc: Rpc, opts: WeeklyOptions = {}): Promise<Record<string, unknown>> {
  const days = opts.days ?? maxPostingAgeDays()
  const batch = opts.batch ?? 1000
  const fraction = opts.maxEvictFraction ?? 0.25
  const now = opts.now ?? Date.now
  const deadline = now() + (opts.budgetMs ?? 600_000)

  const listing = (await rpc('weekly_new_listings')) as { open_now: number; new_roles: number; new_by_provider: unknown; new_top_employers: unknown }
  const openBefore = listing.open_now

  let duplicates = 0
  while (now() < deadline) {
    const n = Number(await rpc('weekly_dedupe_batch', { batch }))
    duplicates += n
    if (n < batch) break
  }

  const cap = Math.floor((openBefore - duplicates) * fraction)
  let evicted = 0
  while (evicted < cap && now() < deadline) {
    const take = Math.min(batch, cap - evicted)
    const n = Number(await rpc('weekly_evict_batch', { max_age_days: days, batch: take }))
    evicted += n
    if (n < take) break
  }

  const after = (await rpc('weekly_counts', { max_age_days: days })) as { open_now: number; old_remaining: number }
  return {
    new_roles: listing.new_roles, new_by_provider: listing.new_by_provider, new_top_employers: listing.new_top_employers,
    duplicates_deleted: duplicates, old_deleted: evicted, old_remaining: after.old_remaining,
    open_before: openBefore, open_after: after.open_now, max_age_days: days, stopped_for_time: now() >= deadline,
  }
}

export async function runWeekly(budgetMs?: number): Promise<Record<string, unknown>> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const rpc: Rpc = async (name, args) => {
    const { data, error } = await db.rpc(name, args)
    if (error) throw new Error(`${name}: ${error.message}`)
    return data
  }
  const report = await runWeeklyWith(rpc, { budgetMs })

  // History: one row a week; a re-run in the same week adds to the deletions, keeps the first open_before.
  const week = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10) // IST date
  const { data: prior } = await db.from('weekly_listing_reports').select('duplicates_deleted, old_deleted, open_before').eq('week_start', week).maybeSingle()
  const { error } = await db.from('weekly_listing_reports').upsert({
    week_start: week,
    new_roles: report.new_roles, new_by_provider: report.new_by_provider, new_top_employers: report.new_top_employers,
    duplicates_deleted: Number(prior?.duplicates_deleted ?? 0) + Number(report.duplicates_deleted),
    old_deleted: Number(prior?.old_deleted ?? 0) + Number(report.old_deleted),
    old_remaining: report.old_remaining,
    open_before: Math.min(Number(prior?.open_before ?? Infinity), Number(report.open_before)),
    open_after: report.open_after, max_age_days: report.max_age_days,
  })
  if (error) throw new Error(`weekly_listing_reports: ${error.message}`)
  return { week_start: week, ...report }
}

if (process.argv[1]?.includes('ingest/weekly')) {
  runWeekly().then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0) }).catch((e) => { console.error(e); process.exit(1) })
}
