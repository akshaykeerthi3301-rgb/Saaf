'use server'

import { createClient } from '@/lib/supabase/server'
import { DOMAINS, ALL_ROLES } from '@/lib/taxonomy/roles'

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
