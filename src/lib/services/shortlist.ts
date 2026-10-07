import { findStatedPay } from '@/lib/stated-pay'
import { createClient } from '@/lib/supabase/server'
import { experienceFloor } from '@/gates/evaluate'
import { CONFIDENCE_THRESHOLD, type TypedRequirement } from '@/gates/types'
import type { ScoreBreakdown } from '@/match/score'
import type { ArrangeableRow } from '@/lib/shortlist'
import type { RepostRecord } from '@/lib/repost'
import { payFromRow, ROLE_FACT_COLUMNS, type RoleFactsRow } from '@/lib/role-facts'

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
  /**
   * `requirements: false` skips the role_requirements read. The feed card stopped
   * showing requirement quotes in the 2026-10-08 redesign (they live in the detail
   * panel, which reads its own), so the page no longer pays for ~40 rows of quotes
   * it does not render.
   */
  opts: { requirements?: boolean } = {},
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
    opts.requirements === false
      ? Promise.resolve([] as { data: unknown[] | null }[])
      : Promise.all(
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
 * role_id → the repost evidence the ingest recorded (migration 0032), for the
 * cards on screen only. Its own query so that a database without the update
 * costs the page nothing: an unknown column fails a whole select (the reason
 * workspace.ts keeps its 0028 fields apart), and here that is caught as "no
 * evidence", which is also the truth.
 */
export async function readReposts(roleIds: string[]): Promise<Map<string, RepostRecord>> {
  const out = new Map<string, RepostRecord>()
  if (roleIds.length === 0) return out
  const supabase = await createClient()
  const results = await Promise.all(
    chunks(roleIds).map((ids) => supabase.from('roles').select('id, first_posted_at, repost_count').in('id', ids).gt('repost_count', 0)),
  )
  for (const { data, error } of results) {
    if (error) return out
    for (const r of (data ?? []) as { id: string; first_posted_at: string | null; repost_count: number }[]) {
      if (r.first_posted_at) out.set(r.id, { firstPostedAt: r.first_posted_at, count: r.repost_count })
    }
  }
  return out
}

/**
 * role_id → how many Saaf candidates are tracking it, only where 3 or more
 * (migration 0033). The function does the privacy work; a missing function, or
 * any error, reads as "no counts" — the chip simply does not draw.
 */
export async function readInterest(roleIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (roleIds.length === 0) return out
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('role_interest', { role_ids: roleIds.slice(0, 200) })
  if (error) return out
  for (const r of (data ?? []) as { role_id: string; trackers: number }[]) out.set(r.role_id, r.trackers)
  return out
}

/**
 * role_id → what the role's own provider stated: pay, work mode, contract type
 * (migration 0041). Its own query, so a database without the update costs the
 * page nothing and `stored: false` lets a filter say what is missing. Only roles
 * that state something appear in the map.
 */
export async function readRoleFacts(roleIds: string[]): Promise<{ facts: Map<string, RoleFactsRow>; stored: boolean }> {
  const facts = new Map<string, RoleFactsRow>()
  if (roleIds.length === 0) return { facts, stored: true }
  const supabase = await createClient()
  const results = await Promise.all(
    chunks(roleIds).map((ids) => supabase.from('roles').select(`id, ${ROLE_FACT_COLUMNS}`).in('id', ids)),
  )
  for (const { data, error } of results) {
    if (error) return { facts: new Map(), stored: false }
    for (const r of (data ?? []) as unknown as (RoleFactsRow & { id: string })[]) {
      if (r.pay_min !== null || r.pay_max !== null || r.work_mode || r.employment_type) facts.set(r.id, r)
    }
  }
  return { facts, stored: true }
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
 * role_id → the years of experience the posting asks for, for the Experience
 * level filter. Only roles with a CONFIDENT requirement appear in the map — the
 * same 0.7 bar the scorer uses — and the strictest floor wins, through the same
 * experienceFloor() the scorer calls, so the filter and the score cannot read
 * one posting two ways. A role absent from the map states nothing, and the
 * filter keeps it. Read only when that filter is on, for the reason above.
 */
export async function readExperienceFloors(roleIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (roleIds.length === 0) return out
  const supabase = await createClient()
  const results = await Promise.all(
    chunks(roleIds).map((ids) =>
      supabase
        .from('role_requirements')
        .select('role_id, kind, min_years, confidence')
        .in('role_id', ids)
        .in('kind', ['experience_years', 'title_seniority'])
        .gte('confidence', CONFIDENCE_THRESHOLD),
    ),
  )
  const byRole = new Map<string, TypedRequirement[]>()
  for (const { data } of results) {
    for (const r of (data ?? []) as { role_id: string; kind: TypedRequirement['kind']; min_years: number | null; confidence: number }[]) {
      if (r.min_years === null) continue
      const list = byRole.get(r.role_id) ?? []
      list.push({ kind: r.kind, minYears: Number(r.min_years), sourceQuote: '', confidence: Number(r.confidence) })
      byRole.set(r.role_id, list)
    }
  }
  for (const [roleId, reqs] of byRole) out.set(roleId, experienceFloor(reqs).required)
  return out
}

/**
 * role_id → stated annual pay in rupees, for the minimum-pay filter. A posting
 * that states no pay, or states it in another currency, is absent from the map.
 *
 * ⚠️ THIS READS DESCRIPTIONS — SEVERAL KB EACH — which TASK-093 took out of the
 * list read. It is therefore run only when the pay filter is on, over the rows
 * already narrowed by every other filter, and never for the plain feed. Pay is
 * stated on ~0.7–2.2% of postings (PROJECT-STATE Stages T and AI), so this
 * filter returns few roles by nature; the drawer says so.
 */
export async function readStatedPays(roleIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (roleIds.length === 0) return out
  // What the provider's own fields say comes first — and spares reading those roles' descriptions.
  const { facts } = await readRoleFacts(roleIds)
  for (const [id, row] of facts) {
    const pay = payFromRow(row)
    if (pay && pay.currency === 'INR' && pay.period !== 'hour') out.set(id, pay.period === 'month' ? pay.low * 12 : pay.low)
  }
  const supabase = await createClient()
  const rest = roleIds.filter((id) => !facts.get(id) || payFromRow(facts.get(id)!) === null)
  const results = await Promise.all(
    chunks(rest).map((ids) => supabase.from('roles').select('id, description').in('id', ids)),
  )
  for (const { data } of results) {
    for (const r of (data ?? []) as { id: string; description: string | null }[]) {
      const pay = r.description ? findStatedPay(r.description) : null
      if (pay && pay.currency === 'INR' && pay.period !== 'hour') out.set(r.id, pay.period === 'month' ? pay.low * 12 : pay.low)
    }
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
