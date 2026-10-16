import type { NormalisedRole } from './providers/types'

/**
 * Collapse the copies of a posting that a board publishes more than once.
 *
 * Large employers repost the same vacancy under fresh requisition ids rather
 * than editing the old one: measured over the first full-scale ingest, H&M
 * listed "Sales Advisor" 61 times and Solera "Principal Software Engineer" 52
 * times. Every copy carries a distinct external_id, so deduplicating on that
 * keeps them all, and the candidate's shortlist shows the same card repeatedly
 * — which is precisely the application spam this product exists to remove.
 *
 * ⚠️ THE SORT IS LOAD-BEARING AND IS NOT TIDINESS. A Map keeps the last value
 * written for a key, so without a defined order the surviving copy depends on
 * the order the ATS happened to return its postings — which differs between
 * runs. Each run then chose a different winner, upserted it as a new row, and
 * left the previous run's winner behind as a duplicate until the 30-day prune
 * removed it. The effect was that deduplicating produced MORE duplicates: 195
 * became 660 over a single sweep. Sorting by external_id fixes the winner, so a
 * board converges on one row per title+location instead of gaining one per run.
 *
 * ⚠️ LOCATION IS PART OF THE KEY, DELIBERATELY. A role open in Bengaluru and
 * again in Pune is two real choices to a candidate. Collapsing those would hide
 * a job rather than a duplicate, which is the opposite and worse failure.
 *
 * Any maintenance script that removes duplicates from the database must keep
 * the SAME row this keeps, or the two will fight and reintroduce the bug.
 */
export function collapseRepeats(roles: NormalisedRole[]): NormalisedRole[] {
  const ordered = [...roles].sort((a, b) => a.externalId.localeCompare(b.externalId))
  return [...new Map(
    ordered.map((r) => [`${r.title.toLowerCase()}||${r.locationRaw.toLowerCase()}`, r])
  ).values()]
}

/** The external_id collapseRepeats keeps, for a group sharing title+location. */
export function survivorId(externalIds: string[]): string {
  return [...externalIds].sort((a, b) => a.localeCompare(b))[externalIds.length - 1]
}

/** What the copies of one posting say about when it was first listed. */
export type RepostInfo = { count: number; firstPostedAt: string }

const repostKey = (title: string, location: string) => `${title.toLowerCase()}||${location.toLowerCase()}`

/** The key repostHistory uses, for the caller to look a survivor up by. */
export const repostKeyOf = repostKey

type StoredCopy = { externalId: string; title: string; locationRaw: string; postedAt: string | null; firstPostedAt?: string | null; repostCount?: number }

/**
 * title+location → how many EARLIER copies of the posting existed and the
 * earliest date any of them carried.
 *
 * collapseRepeats throws the other copies away, and with them the only evidence
 * that an employer lists the same job again and again. This is read from the
 * same two places it was thrown away from: the copies in today's fetch, and the
 * rows of this board already stored under a different external_id.
 *
 * ⚠️ A COPY IS NOT A REPOST BY ITSELF. H&M's 61 "Sales Advisor" rows can be 61
 * open vacancies. So only a copy that carries a date counts toward `firstPostedAt`,
 * and whether the gap is wide enough to call a repost is decided where the chip
 * is drawn (src/lib/repost.ts), not here — this just keeps the evidence.
 *
 * ⚠️ THE COUNT SURVIVES THE ORPHANS BEING DELETED. A stored row with
 * repost_count r stands for r+1 copies seen (itself and r before it). When its
 * successor replaces it, the successor's count must be r+1, not 1 — so the total
 * is the larger of "distinct ids seen now" and "the biggest stored tally plus
 * the ids that are new since".
 */
export function repostHistory(
  fetched: Pick<NormalisedRole, 'externalId' | 'title' | 'locationRaw' | 'postedAt'>[],
  stored: StoredCopy[] = [],
): Map<string, RepostInfo> {
  type G = { fetched: Set<string>; stored: Set<string>; maxTally: number; dates: number[] }
  const groups = new Map<string, G>()
  const group = (title: string, loc: string): G => {
    const k = repostKey(title, loc)
    let g = groups.get(k)
    if (!g) { g = { fetched: new Set(), stored: new Set(), maxTally: 0, dates: [] }; groups.set(k, g) }
    return g
  }
  const date = (g: G, d: string | null | undefined) => {
    const t = d ? Date.parse(d) : NaN
    if (Number.isFinite(t)) g.dates.push(t)
  }
  for (const r of fetched) { const g = group(r.title, r.locationRaw); g.fetched.add(r.externalId); date(g, r.postedAt) }
  for (const r of stored) {
    const g = group(r.title, r.locationRaw)
    g.stored.add(r.externalId)
    g.maxTally = Math.max(g.maxTally, (r.repostCount ?? 0) + 1)
    date(g, r.postedAt)
    date(g, r.firstPostedAt)
  }

  const out = new Map<string, RepostInfo>()
  for (const [k, g] of groups) {
    const distinct = new Set([...g.fetched, ...g.stored]).size
    const fresh = [...g.fetched].filter((id) => !g.stored.has(id)).length
    const count = Math.max(distinct, g.maxTally + fresh) - 1
    if (count < 1 || g.dates.length === 0) continue
    out.set(k, { count, firstPostedAt: new Date(Math.min(...g.dates)).toISOString() })
  }
  return out
}

/**
 * Which stored roles a COMPLETE fetch says the employer has taken down, and
 * which previously-closed ones it has put back.
 *
 * `listed` is the board's own list of external ids, BEFORE the India and
 * corporate filters — a role that merely stopped passing a filter is not closed.
 * `replaced` are stored copies the ingest is deleting in favour of a surviving
 * duplicate; they are not closed postings, they are the same posting.
 *
 * The caller must pass this only for a complete read: a short read proves nothing
 * about what was removed.
 */
export function closureChanges(
  stored: { id: string; external_id: string; closed_at?: string | null }[],
  listed: Set<string>,
  replaced: Set<string>,
): { gone: string[]; reopened: string[] } {
  return {
    gone: stored.filter((r) => !listed.has(r.external_id) && !r.closed_at && !replaced.has(r.id)).map((r) => r.id),
    reopened: stored.filter((r) => r.closed_at && listed.has(r.external_id)).map((r) => r.id),
  }
}

/**
 * ACROSS BOARDS — the same posting listed on two career sites of one employer.
 *
 * collapseRepeats works inside one board. An employer with several career sites
 * (PwC has four, State Street two, Mastercard three) can list the same job on each,
 * and every copy is a separate row. Measured 2026-10-16 over the live index: 520 extra
 * rows in 483 groups (1.2% of open jobs).
 *
 * THE RULE, AND WHY IT HAS TO BE THIS ONE: among boards of the SAME company_name, the
 * board with the smallest id is the one that holds a posting; every other board skips a
 * posting (same title + location) that a smaller-id sibling already stores. Without a
 * fixed winner, two boards would each see the other's copy and both drop it, or both keep
 * it — the failure ingest/dedupe.ts collapseRepeats documents (195 duplicates became 660).
 * It converges in one extra run: a bigger-id board that stored a copy first deletes it
 * once the smaller-id board has its own.
 *
 * Any maintenance script that removes these duplicates must keep the same row — the one on
 * the smallest board id.
 */
export const crossBoardKey = (title: string, location: string) =>
  `${title.toLowerCase().trim()}||${location.toLowerCase().trim()}`

export function dropHeldBySiblings<T extends { title: string; locationRaw: string }>(roles: T[], held: Set<string>): T[] {
  return held.size === 0 ? roles : roles.filter((r) => !held.has(crossBoardKey(r.title, r.locationRaw)))
}
