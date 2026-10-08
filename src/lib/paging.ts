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
