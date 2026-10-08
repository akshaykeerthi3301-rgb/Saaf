import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase/service'
import { jobPostingFields, structureJob } from '@/lib/job-sections'
import { cultureTags, formatDescription, isEasyApply, titleSeniority, type JdBlock, type TitleSeniority } from '@/lib/job-facts'
import { displayCity, displayEmployer } from '@/lib/display-names'
import { findStatedPay, type StatedPay } from '@/lib/stated-pay'
import { payFromRow, ROLE_FACT_COLUMNS, type RoleFactsRow } from '@/lib/role-facts'
import { MAX_PAGE, PAGE_SIZE, searchTokens } from '@/lib/public-search'
import { cityPatterns, MIN_ROLES_TO_INDEX, roleSlug, rolePhrase, titleIsRole, citySlug } from '@/lib/seo-pages'
import { ALL_ROLES } from '@/lib/taxonomy/roles'
import { resolveCity, type City } from '@/lib/taxonomy/locations'

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
  /** Pay as the posting states it, or null. Never estimated. */
  pay: StatedPay | null
  /** What the employer's own system says about contract type and work mode (0041), or null. */
  employmentType: RoleFactsRow['employment_type']
  workMode: RoleFactsRow['work_mode']
  description: JdBlock[]
  /** schema.org JobPosting fields for the sections we could read; each present only when its section is. */
  postingFields: { responsibilities?: string; qualifications?: string; jobBenefits?: string }
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
    .select('id, title, company_name, description, city, location_raw, in_india, apply_url, posted_at, first_seen_at, closed_at')
    .eq('id', id)
    .maybeSingle()
  // Taken down by the employer (the ingest stamps closed_at, migration 0035): not served, as the doc above says.
  if (!data || (data as unknown as { closed_at: string | null }).closed_at) return null
  const r = data as unknown as RoleRow

  const companyName = r.company_name ?? ''
  const { data: siblings, count } = companyName
    ? await db
        .from('roles')
        .select('id, title, city', { count: 'exact' })
        .eq('company_name', companyName)
        .eq('in_india', true)
        .is('closed_at', null)
        .order('first_seen_at', { ascending: false })
        .limit(200)
    : { data: [], count: 0 }
  const sib = (siblings ?? []) as { id: string; title: string; city: string | null }[]
  const blocks = formatDescription(r.description ?? '')
  // What the provider itself states about pay (0041); its own query so a missing column costs nothing.
  const factsRes = await db.from('roles').select(ROLE_FACT_COLUMNS).eq('id', id).maybeSingle()
  const facts = factsRes.error ? null : ((factsRes.data ?? {}) as unknown as RoleFactsRow)
  const providerPay = facts ? payFromRow(facts) : null

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
    pay: providerPay ?? findStatedPay(r.description ?? ''),
    employmentType: facts?.employment_type ?? null,
    workMode: facts?.work_mode ?? null,
    description: blocks,
    postingFields: jobPostingFields(structureJob(r.description ?? '').sections),
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
      .is('closed_at', null)
      .order('first_seen_at', { ascending: false })
      .order('id')
      .range(from, Math.min(from + 999, cap - 1))
    const rows = (data ?? []) as { id: string; last_seen_at: string }[]
    out.push(...rows.map((r) => ({ id: r.id, lastSeenAt: r.last_seen_at })))
    if (rows.length < 1000) break
  }
  return out
}

export type PublicSearchRow = { id: string; title: string; company: string; city: string | null; postedAt: string | null; firstSeenAt: string; easyApply: boolean }

/**
 * The public job search (F-1202). ⚠️ SERVICE CLIENT, CONTAINED BY SHAPE like the rest of this file:
 * it reads `roles` only, returns a fixed set of display fields, and the query is first reduced to a few
 * plain word-tokens (src/lib/public-search.ts), so nothing a stranger types can widen what is read. ORDER IS THE
 * EMPLOYER'S OWN POSTED DATE, undated roles last: `first_seen_at` is the same instant for a whole daily ingest
 * batch (measured 2026-10-08: the newest eight rows share one second), so it cannot say which role is newer. At
 * most PAGE_SIZE rows a page and MAX_PAGE pages. No score is read or computed: a score belongs to a
 * signed-in candidate, which is why the page shows it locked.
 */
export async function searchPublicJobs(input: { q?: string; city?: string; page?: number }): Promise<{ rows: PublicSearchRow[]; more: boolean }> {
  const page = Math.min(Math.max(Math.floor(input.page ?? 1), 1), MAX_PAGE)
  const db = createServiceClient()
  let query = db
    .from('roles')
    .select('id, title, company_name, city, apply_url, posted_at, first_seen_at')
    .eq('in_india', true)
    .is('closed_at', null)
  for (const t of searchTokens(input.q)) query = query.or(`title.ilike.%${t}%,company_name.ilike.%${t}%`)
  const city = searchTokens(input.city)
  if (city.length) query = query.ilike('city', `%${city.join(' ')}%`)
  const from = (page - 1) * PAGE_SIZE
  // One extra row says whether there is a next page without a count.
  const { data, error } = await query.order('posted_at', { ascending: false, nullsFirst: false }).order('first_seen_at', { ascending: false }).order('id').range(from, from + PAGE_SIZE)
  if (error || !data) return { rows: [], more: false }
  const rows = (data as unknown as { id: string; title: string; company_name: string | null; city: string | null; apply_url: string; posted_at: string | null; first_seen_at: string }[])
  return {
    rows: rows.slice(0, PAGE_SIZE).map((r) => ({
      id: r.id, title: r.title, company: displayEmployer(r.company_name), city: displayCity(r.city) || null,
      postedAt: r.posted_at, firstSeenAt: r.first_seen_at, easyApply: isEasyApply(r.apply_url),
    })),
    more: rows.length > PAGE_SIZE && page < MAX_PAGE,
  }
}

/** For the landing page's ticker: the count of roles Saaf first saw in the last 24 hours, and the six most recently POSTED roles (by the employer's date). Nothing estimated. Null on any failure. */
export async function readTicker(): Promise<{ last24h: number; latest: { id: string; title: string; company: string; city: string | null }[] } | null> {
  try {
    const db = createServiceClient()
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
    const [recent, latest] = await Promise.all([
      db.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true).is('closed_at', null).gte('first_seen_at', since),
      db.from('roles').select('id, title, company_name, city').eq('in_india', true).is('closed_at', null).order('posted_at', { ascending: false, nullsFirst: false }).limit(6),
    ])
    if (recent.error || latest.error || !latest.data?.length) return null
    return {
      last24h: recent.count ?? 0,
      latest: (latest.data as unknown as { id: string; title: string; company_name: string | null; city: string | null }[])
        .map((r) => ({ id: r.id, title: r.title, company: displayEmployer(r.company_name), city: displayCity(r.city) || null })),
    }
  } catch {
    return null
  }
}

export type RolePageData = {
  /** Live roles in India whose title has every word of the role (and is in the city, on a city page). */
  total: number
  latest: PublicSearchRow[]
  /** Counted among the newest `sampled` roles, not all of them — the page says so. */
  employers: { company: string; n: number }[]
  cities: { city: string; n: number }[]
  sampled: number
}

/**
 * One programmatic role page, or role-in-city page (F-1203). ⚠️ SERVICE CLIENT, CONTAINED BY SHAPE like
 * the rest of this file: `roles` only, a fixed set of display fields, and the filter comes from Saaf's
 * own taxonomy (role words and city spellings) — never from the visitor. The total is exact; the
 * employer and city breakdowns are of the newest 300 roles and are labelled that way.
 */
export async function readRolePage(role: string, city: City | null): Promise<RolePageData> {
  return readListing({ role, city })
}

/** The words that make a posting's location "remote" — the feed's own rule (src/gates/extract.ts isRemoteLocation). */
const REMOTE_LOCATION = 'location_raw.ilike.%remote%,location_raw.ilike.%anywhere%,location_raw.ilike.%work from home%'

/**
 * The remote hub (F-1205): roles whose location says remote, with the role mix of the newest 300 (counted by
 * Saaf's own role phrases). Same containment as the role pages.
 */
export async function readRemoteHub(): Promise<RolePageData & { roles: { role: string; n: number }[] }> {
  const d = await readListing({ remote: true, titles: true })
  return d
}

async function readListing(o: { role?: string; city?: City | null; remote?: boolean; titles?: boolean }): Promise<RolePageData & { roles: { role: string; n: number }[] }> {
  const db = createServiceClient()
  const patterns = o.city ? cityPatterns(o.city) : []
  const scope = <T extends { ilike: (c: string, p: string) => T; or: (f: string) => T }>(q: T): T => {
    let out = q
    if (o.role) out = out.ilike('title', `%${rolePhrase(o.role)}%`)
    if (patterns.length) out = out.or(patterns.map((p) => `city.ilike.%${p}%`).join(','))
    if (o.remote) out = out.or(REMOTE_LOCATION)
    return out
  }
  const [count, sample] = await Promise.all([
    scope(db.from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true).is('closed_at', null)),
    scope(db.from('roles').select('id, title, company_name, city, apply_url, posted_at, first_seen_at').eq('in_india', true).is('closed_at', null)).order('posted_at', { ascending: false, nullsFirst: false }).order('first_seen_at', { ascending: false }).order('id').limit(300),
  ])
  const rows = (sample.error ? [] : (sample.data ?? [])) as unknown as { id: string; title: string; company_name: string | null; city: string | null; apply_url: string; posted_at: string | null; first_seen_at: string }[]
  const tally = (keys: (r: (typeof rows)[number]) => string[]) => {
    const m = new Map<string, number>()
    for (const r of rows) for (const k of keys(r)) if (k) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8)
  }
  return {
    total: count.error ? rows.length : (count.count ?? rows.length),
    latest: rows.slice(0, 20).map((r) => ({ id: r.id, title: r.title, company: displayEmployer(r.company_name), city: displayCity(r.city) || null, postedAt: r.posted_at, firstSeenAt: r.first_seen_at, easyApply: isEasyApply(r.apply_url) })),
    employers: tally((r) => [displayEmployer(r.company_name)]).map(([company, n]) => ({ company, n })),
    cities: tally((r) => [resolveCity(r.city)?.name ?? '']).map(([city, n]) => ({ city, n })),
    roles: o.titles ? tally((r) => ALL_ROLES.filter((role) => titleIsRole(r.title, role))).map(([role, n]) => ({ role, n })) : [],
    sampled: rows.length,
  }
}

/**
 * Which role and role-in-city pages are worth a search engine's time, for the sitemap: one scan of the
 * newest 5,000 India roles (title and city only), counted in memory, kept when at least
 * MIN_ROLES_TO_INDEX. Counted from a sample, so it can only under-list, never list a thin page.
 */
export async function listSeoPagesForSitemap(): Promise<{ roles: string[]; pairs: { role: string; city: string }[] }> {
  const db = createServiceClient()
  const rows: { title: string; city: string | null }[] = []
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await db.from('roles').select('title, city').eq('in_india', true).is('closed_at', null).order('first_seen_at', { ascending: false }).order('id').range(from, from + 999)
    if (error || !data) break
    rows.push(...(data as unknown as { title: string; city: string | null }[]))
    if (data.length < 1000) break
  }
  const roleCount = new Map<string, number>()
  const pairCount = new Map<string, number>()
  for (const r of rows) {
    const city = resolveCity(r.city)
    for (const role of ALL_ROLES) {
      if (!titleIsRole(r.title, role)) continue
      roleCount.set(role, (roleCount.get(role) ?? 0) + 1)
      if (city) { const k = `${role}|${city.name}`; pairCount.set(k, (pairCount.get(k) ?? 0) + 1) }
    }
  }
  return {
    roles: [...roleCount].filter(([, n]) => n >= MIN_ROLES_TO_INDEX).map(([role]) => roleSlug(role)),
    pairs: [...pairCount].filter(([, n]) => n >= MIN_ROLES_TO_INDEX).map(([k]) => {
      const [role, cityName] = k.split('|')
      const c = resolveCity(cityName)!
      return { role: roleSlug(role), city: citySlug(c) }
    }),
  }
}
