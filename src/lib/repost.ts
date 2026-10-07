/**
 * The "Reposted" chip — F-117. Drawn only where ingest recorded one
 * (roles.first_posted_at + roles.repost_count, migration 0032), never inferred
 * at read time.
 *
 * ⚠️ A SECOND COPY IS NOT A REPOST. An employer with 61 identical vacancies has
 * 61 copies and no repost. The evidence is a copy that was listed EARLIER than
 * this one, by at least a week — below that the dates are within the noise of
 * how boards stamp them. ponytail: a fixed 7-day gap; tune from the live
 * distribution once a few weeks of ingest have recorded it.
 */
export const REPOST_MIN_GAP_DAYS = 7
const DAY_MS = 86_400_000

export type RepostRecord = { firstPostedAt: string; count: number }
export type RepostChip = { label: string; title: string }

export function repostChip(postedAt: string | null | undefined, rec: RepostRecord | null | undefined): RepostChip | null {
  if (!rec || rec.count < 1) return null
  const first = Date.parse(rec.firstPostedAt)
  const now = postedAt ? Date.parse(postedAt) : NaN
  if (!Number.isFinite(first) || !Number.isFinite(now)) return null
  const gap = Math.floor((now - first) / DAY_MS)
  if (gap < REPOST_MIN_GAP_DAYS) return null
  const times = rec.count === 1 ? 'once before' : `${rec.count} times before`
  return {
    label: 'Reposted',
    title: `The employer listed this title in this place ${times}; the earliest listing we saw was ${gap} days before this one (${new Date(first).toISOString().slice(0, 10)}).`,
  }
}
