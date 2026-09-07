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
