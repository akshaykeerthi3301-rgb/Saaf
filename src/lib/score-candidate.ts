import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreRole, summarise, type ScoreBreakdown } from '@/match/score'
import { chunk, mapLimit, pageAll } from '@/lib/paging'
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
 * The most roles scored per candidate, best title match first.
 *
 * 500 until 2026-10-08, 3,000 that night, then 5,000 on 2026-10-09 (founder direction: 'we don't need to limit ourselves
 * to a small number of jobs … raise the job volume to maximum, expect 20 people').
 *
 * WHY 5,000 IS THE MAXIMUM ON THE FREE DATABASE, MEASURED 2026-10-09: the database is 205 MB of 500 MB; a stored match
 * costs ~2.05 KB (gate_results 1.9 KB incl. indexes + role_first_shown 0.13 KB); 20 people each holding 5,000 =
 * 100,000 rows ≈ 205 MB, leaving the database near 380 MB (76%). Above that, or with the four held SmartRecruiters
 * boards (+~80 MB), the free tier runs out and Supabase turns the database read-only — raise it only with the paid plan.
 * MEASURED before the change on the three profiles that have matches: jobs scoring 50+ went 38 -> 80,
 * 224 -> 431 and 107 -> 207 when the ceiling doubled, so there are many good matches past the 500th by title
 * relevance. Cost: scoring 1,000 roles took 1-2 s; stored matches are ~2.9 KB a row, so 3,000 is ~8.7 MB a person.
 *
 * ⚠️ THE CONSTANT WAS NOT THE ONLY CEILING. PostgREST returns at most 1,000 rows per request, silently, so a limit
 * of 2,000 or 5,000 still scored 1,000. The ranked ids are therefore read in pages (src/lib/paging.ts) and the
 * roles — with their descriptions, the heavy part — are fetched in small batches by id.
 */
export const MAX_ROLES_PER_CANDIDATE = 5000

/** Roles fetched per request when reading descriptions by id, and how many of those requests run at once. */
const ROLE_FETCH_CHUNK = 150
const ROLE_FETCH_PARALLEL = 2

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
export type RoleRow = {
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

/**
 * The candidate's profile → the search the index is scoped by.
 *
 * Exported so the shortlist's "of N" count (src/lib/services/shortlist.ts)
 * asks the database the SAME question the scorer asked. Two derivations of
 * which roles match would let the count and the list disagree about the same
 * candidate. Null when the profile names no role.
 */
export function candidateSearch(
  candidate: Pick<CandidateProfile, 'preferredRole' | 'preferredRoles'>,
  openToAdjacent: boolean,
) {
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
  if (preferredAll.length === 0) return null
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

  const adjacent = openToAdjacent && terms.length > 1

  /** What roles_for_candidates() is called with. */
  const searches = preferredAll.map((r) =>
    adjacent ? r.toLowerCase().replace(/[^a-z0-9&+ ]+/g, ' ').trim() : r,
  )
  return { preferredAll, preferred, terms, adjacent, searches }
}

export async function scoreAgainstIndex(
  db: SupabaseClient,
  candidate: CandidateProfile,
  opts: { openToAdjacent: boolean; limit?: number },
): Promise<ScoredRole[]> {
  const search = candidateSearch(candidate, opts.openToAdjacent)
  if (!search) return []
  const { preferredAll, preferred, terms, adjacent } = search
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
  let roles: RoleRow[] = []
  let rankedError: { code?: string; message?: string } | null = null
  try {
    // Ids first (a light column, paged past the 1,000-row ceiling), then the roles by id in small batches. A role
    // the employer has taken down (closed_at, 0035) is not an opportunity; 0050 made the function skip them and the
    // filter stays as a second line of defence.
    const ranked = await pageAll<{ id: string }>(async (from, to) => {
      const r = await db
        .rpc('roles_for_candidates', { searches: search.searches, adjacent, max_rows: cap })
        .select('id')
        .is('closed_at', null)
        .range(from, to)
      // The client types a SETOF function's result as row-or-rows; it is rows.
      return { data: r.data as unknown as { id: string }[] | null, error: r.error }
    })
    const batches = chunk([...new Set(ranked.map((r) => r.id))], ROLE_FETCH_CHUNK)
    // ⚠️ TWO SIMPLE QUERIES PER BATCH, NOT ONE WITH `role_requirements(*)` EMBEDDED. MEASURED 2026-10-09 on 1,800 roles:
    // embedded 3.8 s, separate 1.1 s + 0.7 s — the database's join-and-aggregate was the cost, and on the free tier's
    // shared CPU more parallelism made it slower, not faster (2 at a time 5 s, 6 at a time 18 s). Same rows either way.
    const got = await mapLimit(batches, ROLE_FETCH_PARALLEL, async (part) => {
      const [r, q] = await Promise.all([
        db.from('roles').select('id, title, company_name, apply_url, description, location_raw, city, unread_experience_mention').in('id', part).is('closed_at', null),
        db.from('role_requirements').select('*').in('role_id', part),
      ])
      if (r.error) throw r.error
      if (q.error) throw q.error
      const reqs = new Map<string, RoleRow['role_requirements']>()
      for (const row of (q.data ?? []) as unknown as (NonNullable<RoleRow['role_requirements']>[number] & { role_id: string })[]) {
        const list = (reqs.get(row.role_id) ?? []) as NonNullable<RoleRow['role_requirements']>
        list.push(row)
        reqs.set(row.role_id, list)
      }
      return ((r.data ?? []) as unknown as RoleRow[]).map((role) => ({ ...role, role_requirements: reqs.get(role.id) ?? [] }))
    })
    for (const batch of got) roles.push(...batch)
  } catch (e) {
    // Migrations here are pasted into the Supabase SQL editor by hand, so there
    // is a real window where this code is deployed and the function is not.
    // A missing function must degrade to the old behaviour, not to an empty
    // shortlist — the ordering is a large improvement, and it is not worth the
    // product going dark for.
    if (!isMissingFunction(e as { code?: string; message?: string })) throw e
    rankedError = e as { code?: string; message?: string }
  }
  if (rankedError) {

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
          .is('closed_at', null)
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

    const query = db.from('roles').select(COLUMNS).eq('in_india', true).is('closed_at', null)
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
export function scoreRows(roles: RoleRow[], candidate: CandidateProfile): ScoredRole[] {
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
