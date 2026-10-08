/**
 * Reading past PostgREST's row cap — the same helper as ingest/paging.ts, duplicated on purpose: ingest runs
 * under the service role outside the web app's import graph and an ESLint rule keeps src/ from reaching into it.
 *
 * ⚠️ POSTGREST RETURNS AT MOST 1,000 ROWS PER REQUEST AND SAYS NOTHING WHEN IT TRUNCATES. A query that should
 * return 3,000 rows returns 1,000 and looks exactly like one that had 1,000. Measured 2026-10-08: scoring with a
 * limit of 2,000 and of 5,000 both returned exactly 1,000 roles. Every unbounded read of per-person matches goes
 * through pageAll; every `.in(...)` filter goes through chunk.
 */

/** PostgREST's hard ceiling on rows per request. */
export const PAGE = 1000

/** Split a list into fixed-size chunks (a 3,000-element `.in()` builds a URL no proxy accepts). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Read every row a query matches. ⚠️ Paging is only stable under a TOTAL order — two rows that sort equally can
 * swap between requests, returning one twice and the other never — so end every ordering on a unique column.
 */
export async function pageAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

/**
 * Like pageAll, but after the first page the rest are requested TOGETHER. The first request asks for the exact
 * total (`count`), so the remaining ranges are known up front. Three pages of 1,000 cost one round trip of waiting
 * instead of three. Same rule as pageAll: end the ordering on a unique column.
 */
export async function pageAllParallel<T>(
  page: (from: number, to: number, withCount: boolean) => PromiseLike<{ data: T[] | null; error: unknown; count?: number | null }>,
): Promise<T[]> {
  const first = await page(0, PAGE - 1, true)
  if (first.error) throw first.error
  const head = first.data ?? []
  const total = first.count ?? head.length
  if (head.length < PAGE || total <= PAGE) return head
  const starts: number[] = []
  for (let from = PAGE; from < total; from += PAGE) starts.push(from)
  const rest = await Promise.all(starts.map((from) => page(from, from + PAGE - 1, false)))
  const out = [...head]
  for (const r of rest) {
    if (r.error) throw r.error
    out.push(...(r.data ?? []))
  }
  return out
}

/**
 * Run `fn` over `items` with at most `limit` in flight at once, results in input order.
 *
 * Why this exists: the free database has two shared CPU cores and cancels any single statement that runs past its
 * timeout (code 57014). Firing 8 description fetches or 10 upserts at once did not make them 8x faster, it made
 * each of them slower until some crossed the timeout — measured 2026-10-09 on the profiles holding 5,000 matches.
 * A small window keeps every statement short.
 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => PromiseLike<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}
