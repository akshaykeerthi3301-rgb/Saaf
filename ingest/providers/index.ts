import { toText, str, type Adapter, type NormalisedRole } from './types'

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

export const adapterFor = (p: string) => ADAPTERS.find((a) => a.provider === p)
export * from './types'
