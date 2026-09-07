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
