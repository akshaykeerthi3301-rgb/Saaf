import { toText, str, USER_AGENT, type Adapter, type FetchResult, type NormalisedRole } from './types'
import { employmentTypeFrom } from './fields'

/**
 * Amazon's own careers site (amazon.jobs) — the first COMPANY career site read
 * directly rather than through a shared ATS (founder decision 2026-10-15,
 * PROJECT-STATE Stage BP).
 *
 * THE SOURCE. `https://www.amazon.jobs/en/search.json` is the JSON the site's own
 * search page calls; it is not a documented API. That is the same posture as the
 * Workday adapter (supabase/migrations/0019): robots.txt disallows only
 * `/internal*` (MEASURED 2026-10-15), no login or token is bypassed, and the
 * apply link sends the candidate to Amazon. ⚠️ AMAZON'S SITE TERMS WERE NOT FOUND
 * (amazon.jobs/en/terms 404s; /en/legal 404s), so "forbidden or not" is UNREAD —
 * the founder chose to build it anyway, behind the switch below.
 *
 * ⚠️ OFF BY DEFAULT. Nothing is fetched unless CAREER_SITE_AMAZON=1. Unset it to
 * stop; the adapter then reports an INCOMPLETE empty read, so run.ts keeps the
 * stored roles and prunes nothing.
 *
 * The token is the country filter ("IND"); one board per country. The listing
 * already carries the whole posting, so there is no per-posting detail call.
 * `hits` is capped at 10,000 by the site — far above India's 2,386 (MEASURED).
 *
 * A job open in several cities appears once with a primary `location`; only that
 * one is stored (ceiling: a Hyderabad-only listing of the same title is a
 * separate Amazon record anyway, as with every other provider's repeats).
 */
const FEED = 'https://www.amazon.jobs/en/search.json'
const PAGE = 100
/** 120 × 100 = 12,000: past the site's own 10,000-hit cap. */
const MAX_PAGES = 120
/** Courtesy pause between pages — one visitor, not a crawler. */
const PAUSE_MS = 600

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {})
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** "October 14, 2026" → ISO instant, or null. Read as UTC so the date never shifts with the machine's zone. */
function postedAt(s: string): string | null {
  const t = Date.parse(`${s} UTC`)
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

export function parseAmazon(raw: unknown): NormalisedRole[] {
  const jobs = Array.isArray(rec(raw).jobs) ? (rec(raw).jobs as Rec[]) : []
  const out: NormalisedRole[] = []
  for (const j of jobs) {
    const id = str(j.id_icims) || str(j.id)
    const path = str(j.job_path)
    if (!id || !path) continue
    // The qualifications are where "3+ years of …" lives, so they are part of the
    // body the extractor reads, labelled the way the posting itself labels them.
    const description = [
      toText(str(j.description)),
      str(j.basic_qualifications) && `Basic qualifications: ${toText(str(j.basic_qualifications))}`,
      str(j.preferred_qualifications) && `Preferred qualifications: ${toText(str(j.preferred_qualifications))}`,
    ].filter(Boolean).join('\n\n')
    out.push({
      externalId: id,
      title: str(j.title).trim(),
      // normalized_location reads "Bengaluru, Karnataka, India"; the plain `location`
      // reads "IN, KA, Bengaluru", whose country is a LEADING code that
      // isIndianLocation does not read — 107 of 2,386 India roles failed the India
      // filter on it (MEASURED 2026-10-15).
      locationRaw: str(j.normalized_location) || str(j.location),
      description,
      applyUrl: `https://www.amazon.jobs${path}`,
      postedAt: postedAt(str(j.posted_date)),
      employmentType: employmentTypeFrom(j.job_schedule_type),
    })
  }
  return out
}

export const amazonAdapter: Adapter = {
  provider: 'amazon',
  url: (country) => `${FEED}?normalized_country_code%5B%5D=${encodeURIComponent(country)}&result_limit=${PAGE}&offset=0`,
  parse: (raw) => parseAmazon(raw),

  fetchAll: async (country, opts): Promise<FetchResult> => {
    if (process.env.CAREER_SITE_AMAZON !== '1') return { roles: [], complete: false }

    const roles: NormalisedRole[] = []
    let total = Infinity
    for (let page = 0; page < MAX_PAGES; page++) {
      if (opts?.deadline && Date.now() > opts.deadline) return { roles, complete: false }
      const res = await fetch(
        `${FEED}?normalized_country_code%5B%5D=${encodeURIComponent(country)}&result_limit=${PAGE}&offset=${page * PAGE}`,
        { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = rec(await res.json())
      if (page === 0) total = Number(body.hits ?? 0)
      const batch = parseAmazon(body)
      roles.push(...batch)
      if (batch.length < PAGE || roles.length >= total) return { roles, complete: true }
      await sleep(PAUSE_MS)
    }
    return { roles, complete: roles.length >= total }
  },
}
