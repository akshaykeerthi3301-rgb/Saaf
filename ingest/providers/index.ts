import { toText, str, USER_AGENT, type Adapter, type FetchResult, type NormalisedRole } from './types'

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {})
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : [])

const SR_LIST = 'https://api.smartrecruiters.com/v1/companies/'
/** SmartRecruiters' documented maximum page size. */
const SR_PAGE = 100
/** 100 pages = 10,000 postings a board, far past any real employer. */
const SR_MAX_PAGES = 100

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
        // NOT `updated_at`, which this read until 2026-09-23. That is the last
        // edit, and boards bulk-edit: on Okta's board all 328 postings carried
        // one identical `updated_at` two days old, including a role first
        // published seven months earlier. Labelled "Posted", it made every
        // Greenhouse role look fresh. `first_published` is the posting date.
        postedAt: (j.first_published as string) || null,
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
    /** Kept for the discovery scripts, which only need to know a board exists.
     *  The ingest goes through fetchAll below, which pages. */
    url: (t) => `${SR_LIST}${t}/postings?limit=${SR_PAGE}`,
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

    /**
     * SmartRecruiters pages, and the old adapter did not.
     *
     * The listing URL was pinned at `limit=100` with no offset, so **every
     * posting past the hundredth was invisible** — silently, since the payload
     * reports `totalFound` and nothing read it. Swiggy holds 67 today so the
     * bug never showed; a Big-4 or a large product company holds thousands.
     * docs/CONFLICTS.md F9.
     *
     * `totalFound` is reported on every page here (unlike Workday, where only
     * page 0 carries it), so the loop is a plain offset walk.
     */
    fetchAll: async (token, opts): Promise<FetchResult> => {
      const roles: NormalisedRole[] = []
      let total = Infinity

      for (let page = 0; page < SR_MAX_PAGES; page++) {
        // Out of time. Returning incomplete keeps run.ts from pruning what we
        // did not reach, and lets the board be stamped so rotation moves on.
        if (opts?.deadline && Date.now() > opts.deadline) return { roles, complete: false }
        const res = await fetch(`${SR_LIST}${token}/postings?limit=${SR_PAGE}&offset=${page * SR_PAGE}`, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(20000),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = rec(await res.json())
        total = Number(body.totalFound ?? total)

        const batch = ADAPTERS.find((a) => a.provider === 'smartrecruiters')!.parse(body, token)
        roles.push(...batch)
        if (batch.length < SR_PAGE || roles.length >= total) {
          return { roles, complete: true }
        }
      }
      // Ran out of pages before running out of postings. Reporting this
      // honestly is what stops run.ts pruning the ones we never reached.
      return { roles, complete: roles.length >= total }
    },

    detailUrl: (t, id) => `${SR_LIST}${t}/postings/${id}`,

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
/**
 * 150 pages = 3,000 India postings a board.
 *
 * Was 20 — a 400-role ceiling, chosen when a short read was indistinguishable
 * from a complete one and therefore dangerous: stopping early upserted a
 * partial list as if it were the whole board, and the prune deleted the rest.
 * Now that fetchAll reports `complete` and run.ts refuses to prune an
 * incomplete board, paging deeper costs requests and nothing else. The largest
 * tenant probed holds 244; Big-4 and big-tech tenants hold far more.
 *
 * Env-overridable for scripts/qualify-boards.ts, which only needs to know
 * whether a tenant has ANY India role and sets it to 1 — the difference
 * between two requests per candidate and a hundred, across thousands of them.
 */
/**
 * ⚠️ READ AT CALL TIME, NOT AT MODULE LOAD. As a module-level `const` this was
 * silently unoverridable: ES imports are evaluated before any statement in the
 * importing module's body, so scripts/qualify-boards.ts setting
 * `process.env.WD_MAX_PAGES = '1'` on its first line ran *after* this file had
 * already read the default. The qualification sweep was paging every Workday
 * tenant in full — a hundred requests a candidate across thousands of them —
 * while looking exactly like it was doing one.
 */
const wdMaxPages = () => Number(process.env.WD_MAX_PAGES) || 150

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

  fetchAll: async (token, opts) => {
    const { host, site } = wdParts(token)
    const facet = await wdIndiaFacet(token)

    // No India facet means the tenant posts nothing in India. Returning empty
    // is the honest answer and costs one request, rather than paging 400
    // postings to discover the same thing. Complete: we asked and got an
    // answer, so run.ts is entitled to deactivate the board on it.
    if (!facet) return { roles: [], complete: true }

    const [param, id] = facet.split('|')
    const out: NormalisedRole[] = []
    let total = Infinity
    let complete = false

    const maxPages = wdMaxPages()
    for (let page = 0; page < maxPages; page++) {
      // Same deadline contract as SmartRecruiters. A tenant with 3,000 India
      // postings pages for over a minute; the cron function has 52 seconds for
      // the entire registry.
      if (opts?.deadline && Date.now() > opts.deadline) return { roles: out, complete: false }
      const body = await wdPost(token, {
        appliedFacets: { [param]: [id] },
        limit: WD_PAGE,
        offset: page * WD_PAGE,
        searchText: '',
      })
      if (page === 0) total = Number(body.total ?? 0)

      const postings = arr(body.jobPostings)
      // An empty page means the listing ended, which is a complete read.
      if (postings.length === 0) { complete = true; break }

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
          // out of English prose — "30+ Days Ago" cannot be. The detail call
          // carries a real startDate; parseDetailPostedAt reads it.
          postedAt: null,
        })
      }
      if (out.length >= total || postings.length < WD_PAGE) { complete = true; break }
    }
    // Falling out of the loop having neither reached `total` nor seen a short
    // page means the page cap stopped us. run.ts must not prune this board.
    return { roles: out, complete }
  },

  detailUrl: (token, externalId) => `${wdBase(token)}${externalId}`,
  parseDetail: (raw) => toText(str(rec(rec(raw).jobPostingInfo).jobDescription)),
  parseDetailPostedAt: (raw) => str(rec(rec(raw).jobPostingInfo).startDate) || null,
})

export const adapterFor = (p: string) => ADAPTERS.find((a) => a.provider === p)
export * from './types'
