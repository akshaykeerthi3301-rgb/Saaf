/**
 * How long a posting may be before the index stops carrying it (founder, 2026-10-16:
 * "delete the oldest ones every week").
 *
 * Two halves that must agree on the same number:
 *   - the ingest does not ADMIT a posting older than this (so a deleted role is not simply
 *     re-added the next night while its employer still lists it);
 *   - the weekly job DELETES stored roles older than this (supabase/migrations/0054,
 *     `weekly_housekeeping`, run by /api/cron/weekly) — oldest first, capped per run.
 *
 * The date used is the employer's own (`postedAt`). A posting with no date is never called
 * stale here — the weekly job falls back to the day we first saw it instead.
 * 90 days by default: older than that is usually an evergreen or ghost posting. Override with
 * MAX_POSTING_AGE_DAYS (the weekly route reads the same variable).
 */
export const maxPostingAgeDays = (): number => Number(process.env.MAX_POSTING_AGE_DAYS) || 90

export function isStalePosting(postedAt: string | null | undefined, now: number = Date.now(), days: number = maxPostingAgeDays()): boolean {
  if (!postedAt) return false
  const t = Date.parse(postedAt)
  return Number.isFinite(t) && now - t > days * 86_400_000
}
