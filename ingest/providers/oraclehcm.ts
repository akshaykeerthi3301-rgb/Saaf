import { toText, str, USER_AGENT, careerSiteOn, type Adapter, type FetchResult, type NormalisedRole } from './types'
import { workModeFrom } from './fields'

/**
 * Oracle Recruiting Cloud (Oracle HCM) career sites — one platform, many large
 * employers (JPMorgan Chase first; Oracle, banks and manufacturers use it).
 *
 * THE SOURCE. `/hcmRestApi/resources/latest/recruitingCEJobRequisitions` is the
 * REST resource the hosted "Candidate Experience" career page itself calls; no
 * login or token. Same posture as Workday (0019) and Amazon (0053): not a
 * documented syndication feed, nothing bypassed, apply link goes to the employer.
 * ⚠️ NO robots.txt IS READABLE on these hosts (the WAF answers with an HTML block
 * page), and the employer's terms are UNREAD — the founder chose to proceed on
 * 2026-10-15, behind the CAREER_SITES switch. A WAF block (HTTP 403, or an HTML
 * body) is treated as "no" and surfaced as an error; it is never worked around.
 *
 * The token is "host/siteNumber", e.g. jpmc.fa.oraclecloud.com/CX_1001.
 * The listing carries only a one-line summary, so the description is hydrated per
 * posting by the shared detail pass (detailUrl / parseDetail).
 *
 * `locationsFacet` offers a country-level entry named "India"; asking for it is
 * how this reads India only, like Workday's facet. No such entry = the employer
 * lists nothing in India, answered as a COMPLETE empty read.
 */
const PAGE = 100
const MAX_PAGES = 100
const PAUSE_MS = 600

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {})
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : [])
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const parts = (token: string) => {
  const i = token.indexOf('/')
  return { host: token.slice(0, i), site: token.slice(i + 1) }
}
const base = (host: string) => `https://${host}/hcmRestApi/resources/latest`

const listUrl = (token: string, limit: number, offset: number, locationId?: string) => {
  const { host, site } = parts(token)
  return `${base(host)}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations` +
    `&finder=findReqs;siteNumber=${site},facetsList=LOCATIONS,limit=${limit},offset=${offset}` +
    (locationId ? `,locationId=${locationId}` : '')
}

async function getJson(url: string): Promise<Rec> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  // A WAF block page answers 200 with HTML. Stop; never retry around it.
  if (text.trimStart().startsWith('<')) throw new Error('blocked by the site (HTML, not JSON)')
  return rec(JSON.parse(text))
}

/** The country-level "India" entry of the locations facet, or null when the employer lists none. */
export function indiaFacet(first: unknown): { id: string; count: number } | null {
  const facets = arr(rec(arr(rec(first).items)[0]).locationsFacet)
  const hit = facets.find((f) => str(f.Name).toLowerCase() === 'india')
  return hit ? { id: String(hit.Id), count: Number(hit.TotalCount ?? 0) } : null
}

export function parseOracle(raw: unknown, token: string): NormalisedRole[] {
  const { host, site } = parts(token)
  const list = arr(rec(arr(rec(raw).items)[0]).requisitionList)
  const out: NormalisedRole[] = []
  for (const r of list) {
    const id = str(r.Id)
    if (!id) continue
    out.push({
      externalId: id,
      title: str(r.Title).trim(),
      locationRaw: str(r.PrimaryLocation),
      description: '', // hydrated by the detail pass
      applyUrl: `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${id}`,
      postedAt: str(r.PostedDate) ? `${str(r.PostedDate)}T00:00:00.000Z` : null,
      workMode: workModeFrom(r.WorkplaceType),
    })
  }
  return out
}

export const oracleHcmAdapter: Adapter = {
  provider: 'oraclehcm',
  url: (t) => listUrl(t, PAGE, 0),
  parse: (raw, t) => parseOracle(raw, t),

  fetchAll: async (token, opts): Promise<FetchResult> => {
    if (!careerSiteOn('oraclehcm')) return { roles: [], complete: false }
    const facet = indiaFacet(await getJson(listUrl(token, 1, 0)))
    if (!facet) return { roles: [], complete: true }
    const india = facet.id

    const roles: NormalisedRole[] = []
    let total = Infinity
    for (let page = 0; page < MAX_PAGES; page++) {
      if (opts?.deadline && Date.now() > opts.deadline) return { roles, complete: false }
      const body = await getJson(listUrl(token, PAGE, page * PAGE, india))
      if (page === 0) {
        total = Number(rec(arr(body.items)[0]).TotalJobsCount ?? 0)
        // ⚠️ A tenant whose location filter does not apply answers with EVERY job it has —
        // eubt.fa.us6 (a test tenant) offered 14,895 India jobs and returned 78,431 jobs
        // worldwide, which paged 10,000 non-India rows. Refuse rather than read them.
        if (total > facet.count * 1.1 + 5) throw new Error(`India filter not applied (${total} returned, ${facet.count} expected)`)
      }
      const batch = parseOracle(body, token)
      roles.push(...batch)
      if (batch.length < PAGE || roles.length >= total) return { roles, complete: true }
      await sleep(PAUSE_MS)
    }
    return { roles, complete: roles.length >= total }
  },

  detailUrl: (token, id) => {
    const { host, site } = parts(token)
    return `${base(host)}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%22${id}%22,siteNumber=${site}`
  },
  // The corporate/organisation blurbs are boilerplate ("JPMorgan Chase is a leading…")
  // and are left out for the reason SmartRecruiters' companyDescription is.
  parseDetail: (raw) => {
    const d = rec(arr(rec(raw).items)[0] ?? raw)
    return toText([str(d.ExternalDescriptionStr), str(d.ExternalResponsibilitiesStr), str(d.ExternalQualificationsStr)].filter(Boolean).join(' '))
  },
}
