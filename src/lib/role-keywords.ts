import keywords from '@/lib/taxonomy/role-keywords.json'
import { slugify } from '@/lib/seo-pages'

/**
 * Per-role résumé keyword facts (F-1207, TASK-203): what Jobinko measured, in Jobinko's own numbers.
 * `role-keywords.json` is built by `npm run` scripts/build-role-keywords.ts from the postings in the index:
 * for each role, the terms its postings use most, how many of the role's postings contain each, and — only
 * when at least eight postings state one — the median years of experience asked. Nothing here is estimated
 * and nothing is a promise about any one job.
 */
type Entry = { terms: string[]; postings: number; coverage: Record<string, number>; medianYears?: number }
const DATA = keywords as unknown as Record<string, Entry>

export const KEYWORD_ROLES: string[] = Object.keys(DATA).sort()
const BY_SLUG = new Map(KEYWORD_ROLES.map((r) => [slugify(r), r]))
export const keywordRoleFromSlug = (slug: string): string | null => BY_SLUG.get(slug) ?? null
export const keywordRoleSlug = (role: string) => slugify(role)

export type RoleKeywordFacts = { role: string; postings: number; medianYears: number | null; terms: { term: string; count: number; pct: number }[] }

/** The facts for one role, most common term first; null for a role Jobinko has no measurement for. */
export function roleKeywordFacts(role: string): RoleKeywordFacts | null {
  const e = DATA[role]
  if (!e || !e.postings) return null
  const terms = e.terms
    .map((term) => ({ term, count: e.coverage[term] ?? 0, pct: Math.round(((e.coverage[term] ?? 0) / e.postings) * 100) }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
  return { role, postings: e.postings, medianYears: e.medianYears ?? null, terms }
}
