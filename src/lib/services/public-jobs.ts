import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { cultureTags, formatDescription, isEasyApply, titleSeniority, type JdBlock, type TitleSeniority } from '@/lib/job-facts'
import { displayCity, displayEmployer } from '@/lib/display-names'

/**
 * Public job pages — one indexed role, readable without an account.
 *
 * ⚠️ THIS REVERSES A DELIBERATE DECISION, BY FOUNDER DIRECTION (2026-09-25,
 * Jobright parity; PROJECT-STATE Stage AF). Until then titles, companies and
 * apply URLs stayed behind sign-in because a public list "would give away the
 * index one query at a time" (index-match.ts) — and the index largely
 * reconstructs the curated registry (`boards`). The founder weighed that
 * against Google traffic, the way Jobright acquires most of its users, and
 * chose publishing. The registry file itself stays private; what becomes
 * copyable is which employers we read, one page at a time.
 *
 * ⚠️ SERVICE CLIENT, CONTAINED BY SHAPE. `roles` is readable only by candidate
 * accounts under RLS (0026), so an anon client reads nothing. Each function
 * here takes an id or a count, reads `roles` only, writes nothing, and returns
 * a fixed set of display fields — no parameter can widen what is read. The
 * `boards` table (the registry) is never touched.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PublicJob = {
  id: string
  title: string
  company: string
  city: string | null
  location: string | null
  inIndia: boolean
  applyUrl: string
  postedAt: string | null
  firstSeenAt: string
  easyApply: boolean
  seniority: TitleSeniority | null
  description: JdBlock[]
  /** The posting's own text as plain lines, for the JobPosting structured data. */
  plainDescription: string
  culture: { tag: string; evidence: string }[]
  employer: { openRolesInIndia: number; cities: string[]; ats: string | null }
  /** Other open roles at the same employer, for the "more at" list. */
  more: { id: string; title: string; city: string | null }[]
}

const ATS: [RegExp, string][] = [
  [/greenhouse\.io$/, 'Greenhouse'], [/lever\.co$/, 'Lever'], [/ashbyhq\.com$/, 'Ashby'],
  [/workable\.com$/, 'Workable'], [/recruitee\.com$/, 'Recruitee'], [/smartrecruiters\.com$/, 'SmartRecruiters'],
  [/myworkdayjobs\.com$/, 'Workday'],
]
function atsOf(url: string): string | null {
  try {
    const host = new URL(url).hostname
    return ATS.find(([re]) => re.test(host))?.[1] ?? null
  } catch {
    return null
  }
}

type RoleRow = {
  id: string
  title: string
  company_name: string | null
  description: string
  city: string | null
  location_raw: string | null
  in_india: boolean
  apply_url: string
  posted_at: string | null
  first_seen_at: string
}

/**
 * One role, or null when the id is malformed or the role has closed (ingest deletes closed roles).
 * Wrapped in React `cache()`: generateMetadata and the page both ask for the same
 * role in one request, and without it that was two database round trips (scorecard, 2026-09-25).
 */
export const readPublicJob = cache(async (id: string): Promise<PublicJob | null> => {
  if (!UUID.test(id)) return null
  const db = createServiceClient()
  const { data } = await db
    .from('roles')
    .select('id, title, company_name, description, city, location_raw, in_india, apply_url, posted_at, first_seen_at')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const r = data as unknown as RoleRow

  const companyName = r.company_name ?? ''
  const { data: siblings, count } = companyName
    ? await db
        .from('roles')
        .select('id, title, city', { count: 'exact' })
        .eq('company_name', companyName)
        .eq('in_india', true)
        .order('first_seen_at', { ascending: false })
        .limit(200)
    : { data: [], count: 0 }
  const sib = (siblings ?? []) as { id: string; title: string; city: string | null }[]
  const blocks = formatDescription(r.description ?? '')

  return {
    id: r.id,
    title: r.title,
    company: displayEmployer(r.company_name),
    city: displayCity(r.city) || null,
    location: r.location_raw,
    inIndia: r.in_india,
    applyUrl: r.apply_url,
    postedAt: r.posted_at,
    firstSeenAt: r.first_seen_at,
    easyApply: isEasyApply(r.apply_url),
    seniority: titleSeniority(r.title),
    description: blocks,
    plainDescription: blocks.map((b) => (b.kind === 'bullet' ? `• ${b.text}` : b.text)).join('\n'),
    culture: cultureTags(r.description ?? ''),
    employer: {
      openRolesInIndia: count ?? 0,
      cities: [...new Set(sib.map((s) => displayCity(s.city)).filter(Boolean))].slice(0, 6) as string[],
      ats: atsOf(r.apply_url),
    },
    more: sib.filter((s) => s.id !== r.id).slice(0, 5).map((s) => ({ id: s.id, title: s.title, city: displayCity(s.city) || null })),
  }
})

/**
 * The newest roles in India, for the sitemap. Capped: a sitemap file holds
 * 50,000 URLs, and a crawler spends its budget on the freshest pages first.
 */
export async function listPublicJobsForSitemap(limit = 5000): Promise<{ id: string; lastSeenAt: string }[]> {
  const db = createServiceClient()
  const cap = Math.min(Math.max(1, limit), 50000)
  const out: { id: string; lastSeenAt: string }[] = []
  // ⚠️ PAGED, because PostgREST returns at most 1,000 rows per request whatever
  // .limit() says — a single query silently yields a 1,000-URL sitemap.
  for (let from = 0; from < cap; from += 1000) {
    const { data } = await db
      .from('roles')
      .select('id, last_seen_at')
      .eq('in_india', true)
      .order('first_seen_at', { ascending: false })
      .order('id')
      .range(from, Math.min(from + 999, cap - 1))
    const rows = (data ?? []) as { id: string; last_seen_at: string }[]
    out.push(...rows.map((r) => ({ id: r.id, lastSeenAt: r.last_seen_at })))
    if (rows.length < 1000) break
  }
  return out
}
