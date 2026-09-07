/**
 * Reading past PostgREST's row cap, and writing under it.
 *
 * ⚠️ POSTGREST RETURNS AT MOST 1,000 ROWS AND SAYS NOTHING WHEN IT TRUNCATES.
 * There is no error, no flag, no short-read signal — a query that should return
 * 4,000 rows returns 1,000 and looks exactly like a query that had 1,000 rows.
 * This repo has already been bitten by it once: `/audit` published figures
 * computed over 1,000 of 1,496 rows and was wrong by a third on the one page
 * whose purpose is "check our work" (docs/CONFLICTS.md C1).
 *
 * Every unbounded read in the ingest goes through pageAll, and every write
 * whose returned representation is depended on is chunked below the cap.
 */

/** PostgREST's hard ceiling on rows per request. */
export const PAGE = 1000

/** Split a list into fixed-size chunks. Used for every `.in(...)` filter and
 *  every write batch — a 2,000-element `.in()` builds a URL no proxy accepts. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Read every row a query matches.
 *
 * The caller supplies the range because the query it wants to page differs
 * every time. ⚠️ Paging is only stable under a TOTAL order — two rows that sort
 * equally can swap between requests, which returns one of them twice and the
 * other never. So every caller must end its ordering on a unique column.
 */
export async function pageAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
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
