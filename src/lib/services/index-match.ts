import { createServiceClient } from '@/lib/supabase/service'
import { scoreAgainstIndex } from '@/lib/score-candidate'
import type { CandidateProfile } from '@/gates/types'

/**
 * How many live postings a résumé would score well against, right now.
 *
 * ⚠️ THIS IS THE SENTENCE NO COMPETITOR CAN SAY. A résumé checker can tell you
 * your score went from 57 to 79. Only a product that also holds an index of
 * live postings can tell you what that DID: "26 → 41 roles scoring 50%+, out of
 * 199 Backend Engineer jobs indexed this week." The category leader buys its
 * job board from partner feeds and scores roles against a stored profile; it
 * cannot re-score a pasted résumé against the market in the same breath as
 * rewriting it, because the rewriting product and the job data are different
 * halves of a subscription rather than one pipeline.
 *
 * Both halves already existed here and had simply never been connected:
 * scoreAgainstIndex() is the exact function /today runs, and the rewrite
 * produces a new résumé. This is the wire between them.
 *
 * ⚠️ IT RETURNS COUNTS. NEVER ROLES. Called from a PUBLIC, unauthenticated
 * surface, so anything it returns is returned to anybody — and the registry is
 * the moat this whole product is built on (docs/PROJECT-STATE.md: "the registry
 * is the moat", `boards` has RLS enabled with zero policies precisely so nobody
 * can enumerate it). Titles, companies and apply URLs stay behind sign-in.
 * Publishing a count is what /api/audit/today already does; publishing the list
 * would give away the index one query at a time.
 *
 * ⚠️ IT USES THE SERVICE CLIENT, AND THAT NEEDS SAYING OUT LOUD. `roles` carries
 * an "authenticated read roles" policy, so an anon client legitimately reads
 * zero rows and the feature would silently report zero matches for everyone.
 * The privilege is contained by shape rather than by trust: this function takes
 * a candidate built in memory from text the caller just pasted, reads only
 * `roles` and `role_requirements`, writes nothing, and returns two integers.
 * There is no parameter through which a caller can widen it, which is the
 * property that makes a service-role read safe here and not elsewhere.
 */

/** The line /today draws between a strong match and a long shot. */
export const STRONG_MATCH = 50

/** Scoring is the expensive half; 150 is enough to make the count meaningful
 *  and small enough for a public endpoint to run repeatedly. */
const SCOPE_LIMIT = 150

export type IndexMatchCount = {
  /** Postings whose title matched the target role at all. */
  scoped: number
  /** Of those, how many the résumé scores at or above the True-Fit line. */
  strong: number
  /** Where the line sits, so the surface never hard-codes it. */
  threshold: number
}

export async function countIndexMatches(
  candidate: CandidateProfile,
): Promise<IndexMatchCount> {
  const db = createServiceClient()
  const scored = await scoreAgainstIndex(db, candidate, {
    openToAdjacent: false,
    limit: SCOPE_LIMIT,
  })
  return {
    scoped: scored.length,
    strong: scored.filter((r) => r.score >= STRONG_MATCH).length,
    threshold: STRONG_MATCH,
  }
}
