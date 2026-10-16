import { createClient } from '@supabase/supabase-js'
import { maxPostingAgeDays } from './lifecycle'

/**
 * The weekly housekeeping — see supabase/migrations/0054_weekly_housekeeping.sql.
 *
 * Lists what arrived this week, removes cross-site duplicates (smallest board id kept) and
 * deletes the oldest postings past the window, capped at a quarter of the index per run.
 * Returns the report row so the cron response and `npm run weekly` can show it.
 */
export async function runWeekly(): Promise<Record<string, unknown>> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data, error } = await db.rpc('weekly_housekeeping', { max_age_days: maxPostingAgeDays(), max_evict_fraction: 0.25 })
  if (error) throw new Error(`weekly_housekeeping: ${error.message}`)
  return data as Record<string, unknown>
}

if (process.argv[1]?.includes('ingest/weekly')) {
  runWeekly().then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0) }).catch((e) => { console.error(e); process.exit(1) })
}
