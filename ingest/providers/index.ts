import { toText, str, USER_AGENT, type Adapter, type NormalisedRole } from './types'

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {})
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : [])

/**
 * One adapter per provider, deliberately. A generic parser looks tempting and
 * breaks constantly: Greenhouse nests under `jobs`, Lever returns a bare array,
 * Ashby uses different keys again, and each names its apply URL differently.
 */
export const ADAPTERS: Adapter[] = [
  {
    provider: 'greenhouse',
    url: (t) => `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`,
    parse: (raw) =>
      arr(rec(raw).jobs).map<NormalisedRole>((j) => ({
        externalId: str(j.id),
        title: str(j.title),
        locationRaw: str(rec(j.location).name),
        description: toText(str(j.content)),
        applyUrl: str(j.absolute_url),
        postedAt: (j.updated_at as string) ?? null,
      })),
  },
  {
    provider: 'lever',
    url: (t) => `https://api.lever.co/v0/postings/${t}?mode=json`,
    parse: (raw) =>
      arr(raw).map<NormalisedRole>((j) => ({
        externalId: str(j.id),
        title: str(j.text),
        locationRaw: str(rec(j.categories).location),
        description: toText(str(j.descriptionPlain ?? j.description)),
        applyUrl: str(j.hostedUrl),
        postedAt: j.createdAt ? new Date(Number(j.createdAt)).toISOString() : null,
      })),
  },
  {
    provider: 'ashby',
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${t}`,
    parse: (raw) =>
      arr(rec(raw).jobs).map<NormalisedRole>((j) => ({
        externalId: str(j.id),
        title: str(j.title),
        locationRaw: str(j.location),
        description: toText(str(j.descriptionPlain ?? j.descriptionHtml)),
        applyUrl: str(j.jobUrl ?? j.applyUrl),
        postedAt: (j.publishedAt as string) ?? null,
      })),
  },
  {
    provider: 'workable',
    url: (t) => `https://apply.workable.com/api/v1/widget/accounts/${t}?details=true`,
    parse: (raw, token) =>
      arr(rec(raw).jobs).map<NormalisedRole>((j) => ({
        externalId: str(j.shortcode ?? j.id),
        title: str(j.title),
        // Workable puts city/state/country at the TOP level, not under a
        // `location` object. Reading j.location.city returns undefined and
        // silently drops every role — 162 Indian roles from one board.
        locationRaw: [j.city, j.state, j.country].filter(Boolean).map(String).join(', '),
        description: toText(str(j.description)),
        applyUrl: str(j.url ?? j.shortlink ?? `https://apply.workable.com/${token}/j/${str(j.shortcode)}/`),
        postedAt: (j.published_on as string) ?? null,
      })),
  },
  {
    provider: 'recruitee',
    url: (t) => `https://${t}.recruitee.com/api/offers/`,
    parse: (raw) =>
      arr(rec(raw).offers).map<NormalisedRole>((j) => ({
        externalId: str(j.id),
        title: str(j.title),
        locationRaw: [j.city, j.country].filter(Boolean).map(String).join(', '),
        description: toText(str(j.description)),
        applyUrl: str(j.careers_url ?? j.careers_apply_url),
        postedAt: (j.published_at as string) ?? null,
      })),
  },
  {
    provider: 'smartrecruiters',
    url: (t) => `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`,
    parse: (raw, token) =>
      arr(rec(raw).content).map<NormalisedRole>((j) => ({
        externalId: str(j.id),
        title: str(j.name),
        locationRaw: [rec(j.location).city, rec(j.location).country]
          .filter(Boolean).map(String).join(', '),
        // Filled by detailUrl/parseDetail below — the list endpoint has no body.
        description: '',
        // The public posting URL is /{company identifier}/{id}. An ID alone
        // resolves to a generic landing page rather than the job — `ref` is an
        // API URL, not a jobAd object, so the old fallback silently produced
        // links that opened the wrong page.
        applyUrl: `https://jobs.smartrecruiters.com/${str(rec(j.company).identifier) || token}/${str(j.id)}`,
        postedAt: (j.releasedDate as string) ?? null,
      })),

    detailUrl: (t, id) => `https://api.smartrecruiters.com/v1/companies/${t}/postings/${id}`,

    // jobDescription + qualifications only. companyDescription is boilerplate
    // ("Swiggy is India's leading...") and actively harmful here: it is the
    // exact prose the extractor's company-tenure filter has to fight, and it
    // buries the one section that carries the requirement — qualifications is
    // where "0-2 years in B2B sales" lives.
    parseDetail: (raw) => {
      const sections = rec(rec(rec(raw).jobAd).sections)
      return ['jobDescription', 'qualifications']
        .map((k) => toText(str(rec(sections[k]).text)))
        .filter(Boolean)
        .join('\n\n')
    },
  },
]

/**
 * Workday.
 *
 * The token is "host/site" — nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite
 * — because the endpoint needs both and neither is derivable from the other.
 * The tenant is the host's first label.
 *
 * WHY IT IS SHAPED DIFFERENTLY FROM THE OTHERS. The listing is a POST with a
 * JSON body and pages 20 at a time (50 and 100 were tried; both return an empty
 * body), and the listing carries no job description at all — every field the
 * scorer reads comes from the per-posting detail call. So this adapter both
 * pages and hydrates.
 *
 * `searchText: 'India'` narrows server-side, which is what keeps a 5,000-role
 * tenant from costing 250 requests. It is a text search, not a location facet,
 * so it is a cheap pre-filter and NOT the authority: run.ts still decides what
 * counts as an India role through resolveInIndia(locationRaw), exactly as it
 * does for every other provider. The cost of that choice is a posting listing
 * several locations without naming India in its text — it will be missed. The
 * alternative, paging every posting a tenant has, does not fit the ingest's
 * 38-second budget.
 */
const WD_PAGE = 20
/** 20 pages = 400 India postings a board. The largest tenant probed holds 244. */
const WD_MAX_PAGES = 20

const wdParts = (token: string) => {
  const slash = token.indexOf('/')
  const host = slash === -1 ? token : token.slice(0, slash)
  const site = slash === -1 ? '' : token.slice(slash + 1)
  return { host, site, tenant: host.split('.')[0] }
}

const wdBase = (token: string) => {
  const { host, site, tenant } = wdParts(token)
  return `https://${host}/wday/cxs/${tenant}/${site}`
}

async function wdPost(token: string, body: unknown): Promise<Rec> {
  const res = await fetch(`${wdBase(token)}/jobs`, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return rec(await res.json())
}

/**
 * The tenant's own id for "India", read from its facets.
 *
 * IDs ARE PER-TENANT, which cost an hour to learn: NVIDIA's India id returns
 * 244 postings on NVIDIA and nothing at all on Adobe or PayPal. So it is
 * discovered per board rather than hard-coded, at a cost of one extra request.
 *
 * Worth it several times over. Filtering server-side on the country facet
 * returns 244 real India postings for NVIDIA; the obvious alternative,
 * `searchText: 'India'`, returns 280 rows of which only 2 are actually located
 * in India — it matches any description that mentions the word.
 */
async function wdIndiaFacet(token: string): Promise<string | null> {
  const body = await wdPost(token, { appliedFacets: {}, limit: 1, offset: 0, searchText: '' })

  // THE PARAMETER NAME IS NOT FIXED EITHER. NVIDIA groups locations under
  // `locationHierarchy1`; Adobe uses `locationCountry` and `locations`. Looking
  // only for the first found NVIDIA's 244 postings and reported Adobe — which
  // has India roles — as having none. So: any group, anywhere in the facets,
  // holding a value named exactly "India".
  const hits: { param: string; id: string; count: number }[] = []
  for (const facet of arr(body.facets)) {
    for (const group of arr(facet.values)) {
      const param = str(group.facetParameter)
      if (!param) continue
      for (const v of arr(group.values)) {
        if (str(v.descriptor).trim().toLowerCase() !== 'india') continue
        hits.push({ param, id: str(v.id), count: Number(v.count ?? 0) })
      }
    }
  }
  if (hits.length === 0) return null

  // A country-level group beats a city-level one, and where a tenant offers
  // both, the one carrying more postings wins — "India" as a country holds
  // every city under it, "India, Bengaluru" holds one.
  hits.sort((a, b) =>
    Number(/country|hierarchy1/i.test(b.param)) - Number(/country|hierarchy1/i.test(a.param)) ||
    b.count - a.count)
  return `${hits[0].param}|${hits[0].id}`
}

/**
 * Workday.
 *
 * The token is "host/site" — nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite
 * — because the endpoint needs both and neither is derivable from the other.
 * The tenant is the host's first label.
 *
 * WHY IT IS SHAPED DIFFERENTLY FROM THE OTHERS. The listing is a POST with a
 * JSON body, pages 20 at a time (50 and 100 were tried; both return an empty
 * body), and carries no job description at all — every field the scorer reads
 * comes from the per-posting detail call. So this adapter pages AND hydrates.
 *
 * `total` IS ONLY REPORTED ON THE FIRST PAGE. Every later page returns 0 for
 * it, so a loop that re-reads it stops after 40 rows believing it is done.
 * Captured once, deliberately.
 */
ADAPTERS.push({
  provider: 'workday',
  url: (t) => `${wdBase(t)}/jobs`,
  // Never called — fetchAll below replaces url+parse for this provider.
  parse: () => [],

  fetchAll: async (token) => {
    const { host, site } = wdParts(token)
    const facet = await wdIndiaFacet(token)

    // No India facet means the tenant posts nothing in India. Returning empty
    // is the honest answer and costs one request, rather than paging 400
    // postings to discover the same thing.
    if (!facet) return []

    const [param, id] = facet.split('|')
    const out: NormalisedRole[] = []
    let total = Infinity

    for (let page = 0; page < WD_MAX_PAGES; page++) {
      const body = await wdPost(token, {
        appliedFacets: { [param]: [id] },
        limit: WD_PAGE,
        offset: page * WD_PAGE,
        searchText: '',
      })
      if (page === 0) total = Number(body.total ?? 0)

      const postings = arr(body.jobPostings)
      if (postings.length === 0) break

      for (const j of postings) {
        const path = str(j.externalPath)
        if (!path) continue
        out.push({
          // The path carries the requisition id (…_JR2024311) and is what the
          // detail call needs, so it doubles as the identity.
          externalId: path,
          title: str(j.title),
          locationRaw: str(j.locationsText),
          // Filled by fillDescriptions() — the listing has no body.
          description: '',
          applyUrl: `https://${host}/${site}${path}`,
          // "Posted 3 Days Ago" is not a date, and is not going to be parsed
          // out of English prose. The detail call carries a real startDate.
          postedAt: null,
        })
      }
      if (out.length >= total || postings.length < WD_PAGE) break
    }
    return out
  },

  detailUrl: (token, externalId) => `${wdBase(token)}${externalId}`,
  parseDetail: (raw) => toText(str(rec(rec(raw).jobPostingInfo).jobDescription)),
})

export const adapterFor = (p: string) => ADAPTERS.find((a) => a.provider === p)
export * from './types'
