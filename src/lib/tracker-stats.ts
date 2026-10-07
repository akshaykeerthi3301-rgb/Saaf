/**
 * The tracker's header counters and the two per-card signals (F-805, F-804,
 * F-713). Pure, so the arithmetic is tested apart from the board.
 */
export type Stage = 'saved' | 'applying' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'closed'

type Row = { status: Stage; appliedOn: string | null; appliedVia?: string | null; roleClosedAt?: string | null }

const ORDER: Stage[] = ['saved', 'applying', 'applied', 'interviewing', 'offer', 'rejected', 'closed']
export const STAGE_NAME: Record<Stage, string> = {
  saved: 'Saved', applying: 'Applying', applied: 'Applied', interviewing: 'Interviewing',
  offer: 'Offer', rejected: 'Rejected', closed: 'Archived',
}

export type TrackerStats = {
  total: number
  /** Stages with at least one card, pipeline order — an empty stage is not a counter. */
  stages: { stage: Stage; label: string; count: number }[]
  /** Applications dated in the last 7 days, today included; null-dated ones cannot be counted. */
  appliedThisWeek: number
  /** Applied by "Apply for me" (the employer's confirmation was seen). */
  appliedBySaaf: number
  /** Cards whose posting the employer has taken down and that are still open for the candidate. */
  postingClosed: number
}

/** `today` is an IST date (YYYY-MM-DD). */
export function trackerStats(rows: Row[], today: string): TrackerStats {
  const counts = new Map<Stage, number>()
  for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  const weekAgo = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10)
  const live = (r: Row) => r.status !== 'closed' && r.status !== 'rejected'
  return {
    total: rows.length,
    stages: ORDER.filter((s) => counts.get(s)).map((s) => ({ stage: s, label: STAGE_NAME[s], count: counts.get(s)! })),
    appliedThisWeek: rows.filter((r) => r.appliedOn && r.appliedOn >= weekAgo && r.appliedOn <= today).length,
    appliedBySaaf: rows.filter((r) => r.appliedVia === 'apply-for-me' && r.status !== 'saved' && r.status !== 'applying').length,
    postingClosed: rows.filter((r) => r.roleClosedAt && live(r)).length,
  }
}

/**
 * The line a card shows when the employer's board no longer lists the role.
 * A card the candidate has already archived or been rejected from needs no
 * warning; one they are interviewing for still does — the call may be about a
 * role that has been filled, and they would want to know.
 */
export function closedNote(r: Pick<Row, 'status' | 'roleClosedAt'>): { label: string; title: string } | null {
  if (!r.roleClosedAt || r.status === 'closed' || r.status === 'rejected') return null
  const when = r.roleClosedAt.slice(0, 10)
  return {
    label: 'Posting closed',
    title: `The employer's job board stopped listing this role on ${when} (checked daily). It may still be open elsewhere, or filled — worth confirming before you spend time on it.`,
  }
}
