/**
 * Today's date in India, as YYYY-MM-DD.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date, and for this product
 * that is the wrong day for most of the day. The ingest cron fires at 21:30 UTC
 * — 03:00 IST — so a run that an Indian reader would call Monday morning was
 * stamped Sunday, and `/api/audit/today` then compared it against a UTC "today"
 * and declared its own freshest data stale for 21.5 hours out of every 24.
 *
 * That figure is published on the landing page. An India-first product that
 * tells Indian visitors its index is a day old, every day, because of a
 * timezone it does not operate in, is wrong in the one place it asks to be
 * believed.
 */
const IST = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function istDay(at: Date = new Date()): string {
  return IST.format(at)
}

const DAY_MS = 86_400_000

const IST_DATE = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/**
 * "Posted 3 days ago", from the date the employer's board gave the posting.
 * Null when there is no usable date — the card then shows nothing, because an
 * invented freshness is worse than none (Greenhouse's `updated_at` was stored
 * as this field until 2026-09-23 and made months-old roles read as days old).
 *
 * Whole days elapsed, not calendar days: Workday gives a bare date, so a finer
 * reading would be precision the source does not have.
 */
export function postedAgo(iso: string | null | undefined, now: Date = new Date()): string | null {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return null
  const days = Math.max(0, Math.floor((now.getTime() - t) / DAY_MS))
  if (days === 0) return 'Posted today'
  if (days === 1) return 'Posted yesterday'
  if (days < 60) return `Posted ${days} days ago`
  if (days < 365) return `Posted ${Math.floor(days / 30)} months ago`
  return 'Posted over a year ago'
}

/** The exact posting date in IST, for the tooltip behind `postedAgo`. */
export function postedOn(iso: string): string {
  return IST_DATE.format(new Date(iso))
}
