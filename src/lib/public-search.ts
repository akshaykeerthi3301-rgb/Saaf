/**
 * The public job search (F-1202, TASK-202): what a stranger's query may become.
 *
 * ⚠️ THE QUERY NEVER REACHES THE DATABASE AS TYPED. It becomes up to five plain word-tokens made only
 * of letters, digits, `+` and `#` (so "c++", "c#" and "node.js" → "node js" survive), and each is
 * matched against the title and the employer. Nothing with a comma, a bracket, a quote or a percent
 * sign can survive, which is what makes it safe to place inside PostgREST's `or(...)` filter.
 *
 * ⚠️ THE LIST IS DELIBERATELY SHALLOW: 20 a page, three pages. The job pages are public by the
 * founder's decision (2026-09-25), but a search that could be paged without end would hand over the
 * whole index in a loop — the exact thing that decision weighed. Sixty results is enough for a person
 * and tedious for a scraper.
 */
export const PAGE_SIZE = 20
export const MAX_PAGE = 3
const MAX_TOKENS = 5

export function searchTokens(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  return raw.slice(0, 120).toLowerCase()
    .split(/[^\p{L}\p{N}+#]+/u)
    .map((t) => t.replace(/^[+#]+/, '').slice(0, 30))
    .filter((t) => t.length >= 2)
    .slice(0, MAX_TOKENS)
}

/** 1-based page, clamped to what the list allows. */
export function cleanPage(raw: unknown): number {
  const n = Number.parseInt(typeof raw === 'string' ? raw : '', 10)
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_PAGE) : 1
}
