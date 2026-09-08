import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreRole, summarise, type ScoreBreakdown } from '@/match/score'
import type { CandidateProfile, Credential, RequirementKind, TypedRequirement } from '@/gates/types'

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
 * roles; at Stage B's target index size it would match thousands.
 *
 * The cap survived the move to relevance ordering; what changed is which 500
 * it keeps. It used to be the 500 freshest, which is the wrong 500 the moment
 * more than 500 match — see roles_for_candidate() below.
 */
export const MAX_ROLES_PER_CANDIDATE = 500

/**
 * PostgREST reports an absent function as PGRST202 (no matching function in the
 * schema cache) and Postgres as 42883. Matched on both because which one
 * surfaces depends on whether the schema cache has been reloaded.
 */
function isMissingFunction(e: { code?: string; message?: string }): boolean {
  return e.code === 'PGRST202' || e.code === '42883' ||
    /could not find the function|does not exist/i.test(e.message ?? '')
}

/** The columns COLUMNS selects, plus the embedded requirement rows. */
type RoleRow = {
  id: string
  title: string
  company_name: string | null
  apply_url: string | null
  description: string | null
  location_raw: string | null
  city: string | null
  unread_experience_mention: boolean | null
  role_requirements: {
    kind: RequirementKind
    min_years: number | null
    max_years?: number | null
    credential: Credential | null
    value_text: string | null
    source_quote: string
    confidence: number | string
  }[] | null
}

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
  /**
   * One list, or several — the same code path either way.
   *
   * `preferredRoles` is the array added in migration 0022; `preferredRole` is
   * the single column that predates it and is still written, so a profile works
   * whether or not the migration has been applied. Deduped case-insensitively
   * because the backfill copies the singular into the array and a candidate
   * editing afterwards can easily end up with both.
   */
  const roleList = [
    ...(candidate.preferredRoles ?? []),
    ...(candidate.preferredRole ? [candidate.preferredRole] : []),
  ]
    .map((r) => r.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const preferredAll = roleList.filter((r) => {
    const k = r.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (preferredAll.length === 0) return []
  const preferred = preferredAll[0]

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

  const adjacent = opts.openToAdjacent && terms.length > 1
  const cap = opts.limit ?? MAX_ROLES_PER_CANDIDATE

  // ONE string literal, deliberately long. Supabase infers the row type by
  // parsing this argument statically; splitting it with `+` defeats that and
  // every field below degrades to `GenericStringError`.
  // role_requirements(*) rather than a column list, deliberately. max_years
  // arrives with migration 0018, and a query naming it fails outright until
  // that migration is run — which would take the shortlist down in the window
  // between this deploying and the founder pasting the SQL. Selecting the
  // whole embedded row is valid on both sides of that. The extra columns are
  // id, role_id and created_at.
  const COLUMNS =
    'id, title, company_name, apply_url, description, location_raw, city, unread_experience_mention, role_requirements(*)'

  /**
   * Ranked in the database, then capped.
   *
   * The cap is not the problem; the ORDER the cap is applied to is. Selecting
   * the 500 freshest matches means a candidate whose best role was crawled a
   * week ago never sees it once the index is large enough that 500 newer ones
   * exist. So the ordering moved into roles_for_candidate(), which sorts by
   * ts_rank_cd over the existing title_tsv GIN index before the limit bites.
   * docs/CONFLICTS.md F3, supabase/migrations/0020.
   *
   * Same scoping, same cap, same tsquery shapes as the query it replaced —
   * only the ordering changed.
   */
  /**
   * The multi-role search, with two fallbacks beneath it.
   *
   * ⚠️ MIGRATIONS HERE ARE PASTED IN BY HAND, so there is always a window where
   * this code is deployed and the function is not. The degradation is ordered
   * by how much it costs:
   *
   *   1. roles_for_candidates(text[]) — one query, ranked across every role.
   *   2. roles_for_candidate(text) once PER ROLE, merged here. Correct results,
   *      N queries instead of one. The FEATURE still works before the migration
   *      is applied; only its efficiency waits.
   *   3. A plain textSearch, freshest-first, which silently hides the best
   *      match once the index exceeds the cap.
   *
   * Without (2) a candidate with two roles would have seen only the first until
   * someone remembered to run the SQL.
   */
  const ranked = await db
    .rpc('roles_for_candidates', {
      searches: preferredAll.map((r) =>
        adjacent ? r.toLowerCase().replace(/[^a-z0-9&+ ]+/g, ' ').trim() : r,
      ),
      adjacent,
      max_rows: cap,
    })
    .select(COLUMNS)

  // The RPC's returned shape is a union of row and row[] as far as the client's
  // static inference goes — it cannot know a SETOF function returns many. One
  // annotation here rather than a cast at every field below.
  let roles = (ranked.data ?? []) as unknown as RoleRow[]
  if (ranked.error) {
    // Migrations here are pasted into the Supabase SQL editor by hand, so there
    // is a real window where this code is deployed and the function is not.
    // A missing function must degrade to the old behaviour, not to an empty
    // shortlist — the ordering is a large improvement, and it is not worth the
    // product going dark for.
    if (!isMissingFunction(ranked.error)) throw ranked.error

    // ---- fallback 2: the single-role RPC, once per role ---------------------
    const perRole = await Promise.all(
      preferredAll.map((role) => {
        const t = role.toLowerCase().replace(/[^a-z0-9&+ ]+/g, ' ').split(/\s+/).filter(Boolean)
        return db
          .rpc('roles_for_candidate', {
            search: adjacent ? t.join(' | ') : role,
            adjacent,
            max_rows: cap,
          })
          .select(COLUMNS)
      }),
    )

    if (perRole.every((r) => !r.error)) {
      console.warn(
        'roles_for_candidates() is missing — run supabase/migrations/0022_multi_role_and_keywords.sql. ' +
        'Falling back to one query per role and merging here: correct, but N round trips instead of one.',
      )
      // Merged in the order the RPC returned them, first occurrence winning, so
      // the candidate's most-wanted role leads the list.
      const byId = new Map<string, RoleRow>()
      for (const res of perRole) {
        for (const row of (res.data ?? []) as unknown as RoleRow[]) {
          if (!byId.has(row.id)) byId.set(row.id, row)
        }
      }
      return scoreRows([...byId.values()].slice(0, cap), candidate)
    }

    // ---- fallback 3: no ranking function at all -----------------------------
    console.warn(
      'Neither roles_for_candidates() nor roles_for_candidate() is available — run the migrations in ' +
      'supabase/migrations/. Falling back to freshest-first, which silently hides the best match ' +
      'once the index exceeds the cap.',
    )

    const query = db.from('roles').select(COLUMNS).eq('in_india', true)
    // The ternary picks the tsquery SHAPE only. Ordering and the cap are
    // applied to whichever branch wins, deliberately outside it: they used to
    // chain off the else-expression alone, so an `open_to_adjacent` candidate
    // ran an unbounded, unordered query that pulled every matching role's full
    // description into memory.
    const scoped = adjacent
      ? query.textSearch('title_tsv', terms.join(' | '))
      : query.textSearch('title_tsv', preferred, { type: 'websearch', config: 'english' })

    const fallback = await scoped.order('last_seen_at', { ascending: false }).limit(cap)
    if (fallback.error) throw fallback.error
    roles = (fallback.data ?? []) as unknown as RoleRow[]
  }

  return scoreRows(roles, candidate)
}

/** Rows → scored roles. Extracted so every fallback path scores identically. */
function scoreRows(roles: RoleRow[], candidate: CandidateProfile): ScoredRole[] {
  return roles.map((role) => {
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
