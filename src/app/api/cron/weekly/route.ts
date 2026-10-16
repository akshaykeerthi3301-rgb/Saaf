import { cronRoute } from '@/lib/cron-route'

/**
 * The weekly housekeeping: list what arrived this week, remove duplicates, delete the oldest.
 *
 * All the work is one database function, `weekly_housekeeping` (migration 0054), called from
 * ingest/weekly.ts — it counts the new listings BEFORE it deletes anything, removes
 * cross-site duplicates (smallest board id kept), then deletes postings older than the window,
 * oldest first, at most a quarter of the index per run, and writes the week's row in
 * `weekly_listing_reports`. The window is MAX_POSTING_AGE_DAYS (90 by default), the same number
 * the ingest uses to refuse old postings, so what is deleted is not re-added.
 *
 * Reachable only with the cron bearer secret (lib/cron-route.ts).
 */
export const maxDuration = 60

export const GET = cronRoute('weekly', async () => {
  const { runWeekly } = await import('../../../../../ingest/weekly')
  return runWeekly()
})
