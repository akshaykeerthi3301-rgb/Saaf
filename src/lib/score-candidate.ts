import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreRole, summarise, type ScoreBreakdown } from '@/match/score'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'

/**
 * Score one candidate against the live index, and return the result.
 *
 * Extracted from evaluateUser() so the developer bench can run the REAL
 * pipeline instead of a lookalike. That matters more here than the usual
 * argument for sharing code: the bench exists to judge whether scoring is
 * right, and a bench that scores through its own copy of the query can only
 * ever tell you about the copy. Same scoping, same ordering, same cap, same
 * scoreRole call — the only difference is that this returns rows and
 * evaluateUser writes them.
 *
 * Reads only. It takes the client as an argument rather than choosing one:
 * evaluateUser passes the service client, the bench passes the request client
 * so its reads stay under RLS.
 */

/**
 * Most recent roles scored per candidate.
 *
 * Descriptions are pulled for skill matching, so an unbounded query is both a
 * memory and a time cost. A broad preferred role already matches 229 of 652
 * roles; at Stage B's target index size it would match thousands. Freshest
 * first, because a stale posting is the least useful thing to rank.
 */
export const MAX_ROLES_PER_CANDIDATE = 500

export type ScoredRole = {
  roleId: string
  title: string
  company: string | null
  city: string | null
  locationRaw: string | null
  applyUrl: string | null
  reason: string
  score: number
  breakdown: ScoreBreakdown
}

export async function scoreAgainstIndex(
  db: SupabaseClient,
  candidate: CandidateProfile,
  opts: { openToAdjacent: boolean; limit?: number },
): Promise<ScoredRole[]> {
  const preferred = candidate.preferredRole?.trim()
  if (!preferred) return []

  // Strict by default, and that default is the product decision: a candidate
  // who asked for "Product Manager" is not shown a credit analyst role unless
  // they said they wanted adjacent ones. websearch_to_tsquery ANDs the terms,
  // so every word must appear in the title. Opting in switches to an OR of the
  // same terms, which widens the net and costs precision — the candidate makes
  // that trade knowingly. See supabase/migrations/0012_open_to_adjacent.sql.
  const terms = preferred
    .toLowerCase()
    .replace(/[^a-z0-9&+ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const query = db
    .from('roles')
    // ONE string literal, deliberately long. Supabase infers the row type by
    // parsing this argument statically; splitting it with `+` defeats that and
    // every field below degrades to `GenericStringError`.
    // role_requirements(*) rather than a column list, deliberately. max_years
    // arrives with migration 0018, and a query naming it fails outright until
    // that migration is run — which would take the shortlist down in the window
    // between this deploying and the founder pasting the SQL. Selecting the
    // whole embedded row is valid on both sides of that. The extra columns are
    // id, role_id and created_at.
    .select('id, title, company_name, apply_url, description, location_raw, city, unread_experience_mention, role_requirements(*)')
    .eq('in_india', true)

  // The ternary picks the tsquery SHAPE only. Ordering and the cap are applied
  // to whichever branch wins, deliberately outside it: they used to chain off
  // the else-expression alone, so an `open_to_adjacent` candidate ran an
  // unbounded, unordered query that pulled every matching role's full
  // description into memory.
  const scoped = opts.openToAdjacent && terms.length > 1
    ? query.textSearch('title_tsv', terms.join(' | '))
    : query.textSearch('title_tsv', preferred, { type: 'websearch', config: 'english' })

  const { data: roles, error } = await scoped
    .order('last_seen_at', { ascending: false })
    .limit(opts.limit ?? MAX_ROLES_PER_CANDIDATE)
  if (error) throw error

  return (roles ?? []).map((role) => {
    // Shape inferred from the select above, exactly as evaluateUser did it.
    const reqs: TypedRequirement[] = (role.role_requirements ?? []).map((q) => ({
      kind: q.kind,
      minYears: q.min_years ?? undefined,
      // Absent until migration 0018 lands, which reads as "no ceiling stated" —
      // the same thing a "5+ years" posting means, so the fallback is correct
      // rather than merely safe.
      maxYears: q.max_years ?? undefined,
      credential: q.credential ?? undefined,
      valueText: q.value_text ?? undefined,
      sourceQuote: q.source_quote,
      confidence: Number(q.confidence),
    }))

    const breakdown = scoreRole(
      candidate,
      {
        title: role.title,
        description: role.description ?? undefined,
        locationRaw: role.location_raw ?? undefined,
        city: role.city ?? undefined,
        unreadExperienceMention: role.unread_experience_mention === true,
      },
      reqs,
    )

    return {
      roleId: role.id,
      title: role.title,
      company: role.company_name ?? null,
      city: role.city ?? null,
      locationRaw: role.location_raw ?? null,
      applyUrl: role.apply_url ?? null,
      reason: summarise(breakdown),
      score: breakdown.total,
      breakdown,
    }
  })
}
