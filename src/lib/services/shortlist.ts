import { findStatedPay } from '@/lib/stated-pay'
import { createClient } from '@/lib/supabase/server'
import type { ScoreBreakdown } from '@/match/score'
import type { ArrangeableRow } from '@/lib/shortlist'

/**
 * The reads behind /today, in two steps. Moved out of the page 2026-09-23
 * (TASK-093, docs/QA-AUDIT.md QA-02).
 *
 * ⚠️ THE WHOLE LIST IS READ THIN; ONLY THE CARDS ON SCREEN ARE READ WHOLE.
 * The page used to select every scored role (~500) with its full breakdown,
 * its role and `role_requirements(*)` embedded: 1,045 KB of JSON, 9,954 ms on
 * a cold database against 492 ms warm. A candidate who opens Saaf once a day
 * always arrives cold. But every count and every section on the page needs
 * only the score and two standings out of the breakdown — measured, that is
 * 74 KB for the same 500 rows, and no join to `roles` at all. The reason, the
 * breakdown's components (318 of those 1,045 KB), the role and its quoted
 * requirements are needed only for the ~40 cards that render, so they are
 * read for exactly those.
 *
 * Runs on the caller's client, so RLS scopes every read to auth.uid(); the
 * user_id filters are for correctness, the policies are the security.
 */

/** One card's worth — read only for what renders. */
export type ShortlistCard = {
  id: string
  role_id: string
  reason: string
  score: number | null
  score_breakdown: ScoreBreakdown | null
  roles: {
    title: string
    city: string | null
    apply_url: string
    company_name: string | null
    posted_at: string | null
  } | null
  /** Pay exactly as the posting states it, or null (0.7% of Indian postings, measured 2026-09-25). */
  stated_pay: string | null
}

export type RequirementRow = {
  role_id: string
  kind: string
  min_years: number | null
  credential: string | null
  value_text: string | null
  source_quote: string
  confidence: number
}

export type Shortlist = {
  rows: ArrangeableRow[]
  /** A failed read must render as a failure, never as an empty list. */
  failed: boolean
  indexed: number
  firstShownAt: Map<string, string>
}

type ThinRow = {
  id: string
  role_id: string
  score: number | null
  location: ScoreBreakdown['location'] | null
  experience: ScoreBreakdown['experience'] | null
}

export async function readShortlist(userId: string): Promise<Shortlist> {
  const supabase = await createClient()
  const [results, indexed, firstShown] = await Promise.all([
    supabase
      .from('gate_results')
      .select('id, role_id, score, location:score_breakdown->>location, experience:score_breakdown->>experience')
      .eq('user_id', userId)
      .order('score', { ascending: false, nullsFirst: false }),
    supabase.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true),
    // Insert-once, survives gate_results being deleted and recreated by the
    // sweep in evaluate-user.ts. See supabase/migrations/0007_role_first_shown.sql.
    supabase.from('role_first_shown').select('role_id, first_shown_at').eq('user_id', userId),
  ])

  return {
    rows: ((results.data ?? []) as unknown as ThinRow[]).map((r) => ({
      id: r.id,
      role_id: r.role_id,
      score: r.score,
      score_breakdown: { location: r.location ?? undefined, experience: r.experience ?? undefined },
    })),
    failed: Boolean(results.error),
    indexed: indexed.count ?? 0,
    firstShownAt: new Map((firstShown.data ?? []).map((r) => [r.role_id, r.first_shown_at])),
  }
}

/** Chunked so an expanded section cannot build a URL long enough to be refused. */
const IN_CHUNK = 100

function chunks(ids: string[]): string[][] {
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) out.push(ids.slice(i, i + IN_CHUNK))
  return out
}

/**
 * Everything a rendered card needs, for the given gate_results rows: the card
 * itself by gate_results.id, and its quoted requirements by role_id.
 */
export async function readCards(
  userId: string,
  rows: Pick<ArrangeableRow, 'id' | 'role_id'>[],
): Promise<{ cards: Map<string, ShortlistCard>; requirements: Map<string, RequirementRow[]> }> {
  const cards = new Map<string, ShortlistCard>()
  const requirements = new Map<string, RequirementRow[]>()
  if (rows.length === 0) return { cards, requirements }

  const supabase = await createClient()
  const [cardResults, reqResults] = await Promise.all([
    Promise.all(
      chunks(rows.map((r) => r.id)).map((ids) =>
        supabase
          .from('gate_results')
          .select('id, role_id, reason, score, score_breakdown, roles(title, city, apply_url, company_name, posted_at, description)')
          .eq('user_id', userId)
          .in('id', ids),
      ),
    ),
    Promise.all(
      chunks(rows.map((r) => r.role_id)).map((ids) =>
        supabase
          .from('role_requirements')
          .select('role_id, kind, min_years, credential, value_text, source_quote, confidence')
          .in('role_id', ids),
      ),
    ),
  ])

  // The description is read only to find stated pay, then dropped — it is
  // untrusted text of several KB and nothing on the card renders it.
  for (const { data } of cardResults) {
    for (const raw of (data ?? []) as unknown as (Omit<ShortlistCard, 'stated_pay' | 'roles'> & { roles: (NonNullable<ShortlistCard['roles']> & { description?: string }) | null })[]) {
      const { description, ...role } = raw.roles ?? ({} as { description?: string })
      cards.set(raw.id, {
        ...raw,
        roles: raw.roles ? (role as NonNullable<ShortlistCard['roles']>) : null,
        stated_pay: description ? findStatedPay(description)?.text ?? null : null,
      })
    }
  }
  for (const { data } of reqResults) {
    for (const r of (data ?? []) as unknown as RequirementRow[]) {
      const list = requirements.get(r.role_id) ?? []
      list.push(r)
      requirements.set(r.role_id, list)
    }
  }
  return { cards, requirements }
}

/**
 * role_id → the board's posting date, for the given roles. Read only when the
 * candidate sorts by Newest: the thin shortlist read carries no `roles` join,
 * and adding one for every view would put back the cold-cache cost TASK-093
 * removed.
 */
export async function readPostedDates(roleIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (roleIds.length === 0) return out
  const supabase = await createClient()
  const results = await Promise.all(
    chunks(roleIds).map((ids) => supabase.from('roles').select('id, posted_at').in('id', ids).not('posted_at', 'is', null)),
  )
  for (const { data } of results) {
    for (const r of (data ?? []) as { id: string; posted_at: string }[]) out.set(r.id, r.posted_at)
  }
  return out
}

/**
 * role_id → apply URL, for the Easy Apply filter. Read only when that filter is
 * on, for the same reason as readPostedDates: the thin read has no roles join.
 */
export async function readApplyUrls(roleIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (roleIds.length === 0) return out
  const supabase = await createClient()
  const results = await Promise.all(
    chunks(roleIds).map((ids) => supabase.from('roles').select('id, apply_url').in('id', ids)),
  )
  for (const { data } of results) {
    for (const r of (data ?? []) as { id: string; apply_url: string }[]) out.set(r.id, r.apply_url)
  }
  return out
}

/**
 * How many roles in the index match the candidate's search — the number the
 * scorer's 500-row cap is taken from. Asked of roles_for_candidates() itself,
 * with the same arguments the scorer passed (candidateSearch() in
 * src/lib/score-candidate.ts), so the count and the list cannot disagree
 * about what matches.
 *
 * ⚠️ NULL IS AN ANSWER, NOT AN ERROR. Measured 2026-09-23: ~0.25 s warm, 3.2 s
 * on the first call of a cold connection. /today must not wait on that, so
 * past `timeoutMs` the page says the list is capped without the number rather
 * than holding the whole render. A missing function (unapplied migration)
 * lands here too.
 */
export async function countMatchingRoles(
  searches: string[],
  adjacent: boolean,
  timeoutMs = 1500,
): Promise<number | null> {
  const supabase = await createClient()
  // ⚠️ TWO ARGUMENTS, NOT AN OBJECT, ON PURPOSE. candidateSearch() returns more
  // than the function takes, and PostgREST resolves an RPC by its argument
  // NAMES: the first version spread that object and asked for
  // roles_for_candidates(adjacent, max_rows, preferred, …), which does not
  // exist. As a HEAD request that failed silently — 204, no count, no error —
  // and the page said "500+" for everyone. The type checker accepted the wider
  // object structurally; positional parameters make the mistake unwritable.
  const counted = supabase
    .rpc(
      'roles_for_candidates',
      { searches, adjacent, max_rows: 100_000 },
      { count: 'exact', head: true },
    )
    .select('id')
    .then(({ count, error }) => (error ? null : count ?? null))
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs) })
  return Promise.race([counted, late]).finally(() => clearTimeout(timer))
}

/**
 * How many scored roles meet the candidate's work-mode preference. Needs the
 * breakdown's components for every row, so it is read only for a candidate who
 * set a preference — and runs alongside the card read rather than before it.
 */
export async function countWorkModeMatches(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gate_results')
    .select('components:score_breakdown->components')
    .eq('user_id', userId)
  type Component = { key: string; points: number; max: number }
  return ((data ?? []) as unknown as { components: Component[] | null }[]).filter((r) => {
    const c = r.components?.find((x) => x.key === 'work_mode')
    return c ? c.points === c.max : false
  }).length
}
