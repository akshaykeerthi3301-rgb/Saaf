'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { DOMAINS, ALL_ROLES } from '@/lib/taxonomy/roles'
import { suggestRoles } from '@/lib/taxonomy/suggest'

export type CatalogueDomain = {
  key: string
  label: string
  /** Sorted by count, descending — real options first, empty ones last. */
  roles: { role: string; count: number }[]
  total: number
}

/**
 * Every taxonomy role with the number of postings it actually returns.
 *
 * COUNTS COME FROM THE QUERY THE MATCHER RUNS, not an approximation of it.
 * evaluate-user.ts scopes a candidate's shortlist with
 * `textSearch('title_tsv', preferred_role, { type: 'websearch' })`, so this
 * runs exactly that, per role. Postgres does the stemming; counting in
 * JavaScript would drift from it the moment a plural or a participle appeared,
 * and a number this product shows has to be the number the candidate gets.
 *
 * That is one query per role, which is why it is cached rather than cheap. The
 * index only changes when the daily ingest runs, so an hour-stale count is
 * still an honest count.
 *
 * A failure returns counts of -1 rather than 0. Zero is a claim about our
 * coverage; "we could not check" is a different statement and the UI says so.
 */
const TTL_MS = 60 * 60 * 1000
const CONCURRENCY = 8

let cache: { at: number; value: CatalogueDomain[] } | null = null

async function countQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  websearch: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('roles')
    .select('id', { count: 'exact', head: true })
    .eq('in_india', true)
    .is('closed_at', null)
    .textSearch('title_tsv', websearch, { type: 'websearch', config: 'english' })
  return error ? -1 : count ?? 0
}

/** A domain's own count is a DISTINCT count, not the sum of its roles.
 *
 *  Summing double-counted every posting that matches two of them — "Senior
 *  Product Manager" answers both "Product Manager" and "Product Management" —
 *  and produced a domain total larger than the index itself in one case. A
 *  number this product shows has to survive being checked, so the domain runs
 *  its own OR query. */
const domainQuery = (roles: string[]) => roles.map((r) => `"${r}"`).join(' OR ')

export async function roleCatalogue(): Promise<CatalogueDomain[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value

  const supabase = await createClient()
  const counts = new Map<string, number>()

  // Bounded fan-out. Unbounded, this is ~80 simultaneous connections on a cold
  // start for a dropdown nobody has opened yet.
  const queue = [...ALL_ROLES]
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let role = queue.pop(); role; role = queue.pop()) {
        counts.set(role, await countQuery(supabase, role))
      }
    }),
  )

  const totals = await Promise.all(DOMAINS.map((d) => countQuery(supabase, domainQuery(d.roles))))

  const value: CatalogueDomain[] = DOMAINS.map((d, i) => ({
    key: d.key,
    label: d.label,
    roles: d.roles
      .map((role) => ({ role, count: counts.get(role) ?? -1 }))
      .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
    total: totals[i],
  }))

  cache = { at: Date.now(), value }
  return value
}

// ------------------------------------------------------------ typed titles (TASK-173)

export type RoleTitleCheck = {
  /** Live postings the matcher would return for this title exactly as typed; null = could not check. */
  count: number | null
  /** The closest taxonomy roles, each with its own live count. */
  suggestions: { role: string; count: number | null }[]
}

const titleSchema = z.string().trim().min(2).max(60)
const CHECK_TTL_MS = 60 * 60 * 1000
const CHECK_MAX = 300
const checks = new Map<string, { at: number; value: RoleTitleCheck }>()

/**
 * What a typed title would return, and what on the list is closest to it.
 *
 * The count is asked of the same websearch query the matcher runs on the raw
 * title (src/lib/score-candidate.ts), so "0" here means the shortlist would be
 * empty — said BEFORE the candidate commits. Nothing is refused: a title with no
 * postings is still accepted, and the answer is attributed to coverage, never to
 * the candidate. Like roleCatalogue() this reads only `roles`, whose policy is
 * "authenticated read"; an unauthenticated caller gets zero rows from the database.
 */
export async function checkRoleTitle(input: string): Promise<RoleTitleCheck> {
  const parsed = titleSchema.safeParse(input)
  if (!parsed.success) return { count: null, suggestions: [] }
  const title = parsed.data
  const key = title.toLowerCase()

  const hit = checks.get(key)
  if (hit && Date.now() - hit.at < CHECK_TTL_MS) return hit.value

  const supabase = await createClient()
  const near = suggestRoles(title, ALL_ROLES, 3).filter((s) => s.role.toLowerCase() !== key)
  const [count, ...counts] = await Promise.all([
    countQuery(supabase, title),
    ...near.map((s) => countQuery(supabase, s.role)),
  ])
  const value: RoleTitleCheck = {
    count: count < 0 ? null : count,
    suggestions: near.map((s, i) => ({ role: s.role, count: counts[i] < 0 ? null : counts[i] })),
  }
  if (checks.size >= CHECK_MAX) checks.delete(checks.keys().next().value as string)
  checks.set(key, { at: Date.now(), value })
  return value
}
