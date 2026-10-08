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
 * can enumerate it). ~~Titles, companies and apply URLs stay behind sign-in.~~
 * **Superseded 2026-09-25:** the founder chose to publish one role per page
 * (/jobs/[id], src/lib/services/public-jobs.ts; PROJECT-STATE Stage AF). This
 * function still returns counts only — a bulk list from a public endpoint
 * remains the cheapest way to copy the index, and nothing here needs one.
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
  /** Postings scored: every title match, or the SCOPE_LIMIT closest when there are more. */
  scoped: number
  /**
   * True when `scoped` is the cap rather than everything that matched. The
   * card used to call these "the 150 postings we indexed" beside "we hold 199"
   * (docs/QA-AUDIT.md QA-05) — 150 is the closest title matches, not the index.
   */
  capped: boolean
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
    capped: scored.length >= SCOPE_LIMIT,
    strong: scored.filter((r) => r.score >= STRONG_MATCH).length,
    threshold: STRONG_MATCH,
  }
}

/**
 * How many roles we hold per function, for the day a candidate's shortlist
 * comes back thin.
 *
 * ⚠️ THE THIN-DAY MESSAGE USED TO SAY "our coverage, not a verdict on you" AND
 * STOP THERE. The sentiment is right and the candidate can do nothing with it.
 * Measured on 2026-09-14, this index is 39% engineering and 1.6% HR — so an HR
 * candidate seeing three roles is not having a thin DAY, they are in a function
 * we do not yet cover, and the honest thing is to say which functions we do.
 *
 * Counted rather than cached because it must not drift from the index it
 * describes, and only ever called on the thin path — a well-served shortlist
 * never pays for this.
 */
export type FunctionCoverage = { fn: string; label: string; roles: number }

/**
 * ⚠️ THIS LIST IS THE COVERAGE PANEL, SO AN OMISSION HERE READS AS A ZERO.
 *
 * It must name every function `ingest/classify.ts` can assign, or the panel
 * tells a candidate we have nothing in theirs. That is what it did until
 * 2026-09-14: sales, operations, support and design were all classified `other`
 * — 44.2% of the index — and a sales candidate on a thin shortlist was shown
 * five functions, none of them sales, against 1,390 live sales roles.
 *
 * `other` is deliberately absent. A row reading "Other 7,545" is not coverage a
 * candidate can act on, and it is the honest remainder rather than a function.
 */
const FUNCTION_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  consulting: 'Consulting',
  finance: 'Finance',
  sales: 'Sales',
  operations: 'Operations',
  marketing: 'Marketing',
  hr: 'HR',
  support: 'Customer Support',
  design: 'Design',
}

export async function coverageByFunction(): Promise<FunctionCoverage[]> {
  const db = createServiceClient()
  const entries = Object.entries(FUNCTION_LABELS)

  const counts = await Promise.all(
    entries.map(async ([fn]) => {
      const { count } = await db
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('function', fn)
        .eq('in_india', true)
        .is('closed_at', null)
      return count ?? 0
    }),
  )

  return entries
    .map(([fn, label], i) => ({ fn, label, roles: counts[i] }))
    .filter((c) => c.roles > 0)
    .sort((a, b) => b.roles - a.roles)
}
