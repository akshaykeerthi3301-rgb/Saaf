/**
 * Company facts from open data (Phase 16, 2026-09-25). Jobright's company tab
 * (OBSERVED) carries founded, HQ, size, funding, leadership and news from a
 * licensed Crunchbase feed. Saaf has no licence, so this reads two free, open
 * sources instead:
 *
 *  - Wikidata (CC0): founded, headquarters, employees, industry, website, CEO,
 *    stock exchange, logo.
 *  - GDELT (free, public): recent news articles that mention the company.
 *
 * Funding rounds and investors are NOT here — no free source carries them
 * reliably. That stays a licensing decision (Crunchbase) for the founder.
 *
 * ⚠️ THE WRONG COMPANY IS WORSE THAN NO COMPANY. "Zeta" is an insect genus and
 * "Postman" a mail carrier on Wikidata (probed 2026-09-25). So facts are shown
 * only when EXACTLY ONE search result has the same normalised name and is a
 * business. Anything else returns null and the panel shows our own index facts
 * only. Every fact links back to its Wikidata page so a reader can check it.
 *
 * Cached for 7 days per company (Next's fetch cache): company facts change
 * slowly, and both sources ask callers to be gentle.
 */

const UA = 'SaafBot/1.0 (https://saaf-ten.vercel.app; job-seeker tool)'
const WEEK = 7 * 24 * 3600
const TIMEOUT_MS = 4000

export type CompanyFacts = {
  wikidataUrl: string
  label: string
  description: string | null
  founded: number | null
  headquarters: string | null
  employees: number | null
  industries: string[]
  website: string | null
  ceo: string | null
  publiclyListed: boolean
  logoUrl: string | null
}

export type CompanyNews = { title: string; url: string; source: string; date: string }[]

/** Entity kinds that make something a company rather than a word. */
const BUSINESS = new Set([
  'Q4830453', 'Q783794', 'Q6881511', 'Q891723', 'Q167037', 'Q1058914', 'Q18388277', 'Q219577', 'Q658255',
  'Q1589009', 'Q210167', 'Q2995256', 'Q17127659', 'Q22687', 'Q740752', 'Q15911314', 'Q3477381',
])

export function normaliseCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(inc|incorporated|ltd|limited|pvt|private|plc|llc|llp|corp|corporation|co|company|gmbh|bv|sa|ag|technologies|technology|india)\b/g, ' ')
    .replace(/\s+/g, '')
}

type Claim = { rank?: 'preferred' | 'normal' | 'deprecated'; mainsnak?: { datavalue?: { value?: unknown } }; qualifiers?: Record<string, unknown> }
type Entity = {
  id: string
  labels?: Record<string, { value: string }>
  descriptions?: Record<string, { value: string }>
  aliases?: Record<string, { value: string }[]>
  claims?: Record<string, Claim[]>
  /** Wikipedia editions covering it — how prominent it is. */
  sitelinks?: Record<string, unknown>
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: WEEK },
    })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

const values = (e: Entity, p: string): unknown[] => (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated').map((c) => c.mainsnak?.datavalue?.value).filter((v) => v !== undefined)

/**
 * The CURRENT value of a property that changes over time (CEO, headquarters,
 * headcount): the claim Wikidata ranks "preferred", else the only one with no
 * end date. More than one candidate → null.
 *
 * ⚠️ FOUND BY MEASURING, 2026-09-25: taking the last listed value showed John
 * Warnock as Adobe's CEO and William Hawkins as Medtronic's — both long gone.
 */
function current(e: Entity, p: string): unknown | null {
  const live = (e.claims?.[p] ?? []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value !== undefined)
  const preferred = live.filter((c) => c.rank === 'preferred')
  const pool = preferred.length ? preferred : live.filter((c) => !c.qualifiers?.P582)
  return pool.length === 1 ? pool[0].mainsnak!.datavalue!.value! : null
}
const currentId = (e: Entity, p: string): string | undefined => (current(e, p) as { id?: string } | null)?.id

/** English label, or Wikidata's language-neutral "mul" label, which many companies now carry instead. */
const nameOf = (e: Entity | undefined): string | undefined => e?.labels?.en?.value ?? e?.labels?.mul?.value
const aliasesOf = (e: Entity): string[] => [...(e.aliases?.en ?? []), ...(e.aliases?.mul ?? [])].map((a) => a.value)
const ids = (e: Entity, p: string): string[] => values(e, p).map((v) => (v as { id?: string })?.id).filter((x): x is string => Boolean(x))

/** A company by its own class — the strict test, used when only a nickname matched. */
const isBusinessClass = (e: Entity) => ids(e, 'P31').some((q) => BUSINESS.has(q))

/**
 * A company: classed as one, or listed on a stock exchange. An industry or a
 * headcount alone is NOT enough — measured 2026-09-25, "DBS" otherwise matched
 * a Dutch field-hockey club.
 */
export function isBusiness(e: Entity): boolean {
  return isBusinessClass(e) || (e.claims?.P414 ?? []).length > 0
}

const prominence = (e: Entity) => Object.keys(e.sitelinks ?? {}).length

/**
 * The single business whose name matches, or null. Exported for tests.
 *
 * Exact names first; nicknames (aliases) only when no name matched, and then
 * only for things classed as companies. Found by measuring 2026-09-25: alias
 * matching sent "RSM" to the Sisters of Mercy (a religious order) and
 * "Walmart" to Walmart Canada.
 */
export function pickCompany(name: string, candidates: Entity[]): Entity | null {
  const want = normaliseCompany(name)
  if (!want) return null
  const matches = candidates.filter((e) =>
    isBusiness(e) && [nameOf(e) ?? '', ...aliasesOf(e)].some((n) => normaliseCompany(n) === want))
  if (matches.length <= 1) return matches[0] ?? null
  // Several companies answer to the name ("ABB" the group vs a Czech "ABB";
  // Walmart vs Walmart Canada, both measured). Take the far more prominent one
  // — covered by at least 3× as many Wikipedia editions — or nothing.
  const [top, next] = [...matches].sort((a, b) => prominence(b) - prominence(a))
  return prominence(top) >= 5 && prominence(top) >= 3 * prominence(next) ? top : null
}

export async function readCompanyFacts(name: string): Promise<CompanyFacts | null> {
  if (!name.trim()) return null
  const search = await getJson<{ search?: { id: string }[] }>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=7&format=json`,
  )
  const qids = (search?.search ?? []).map((s) => s.id)
  if (!qids.length) return null
  const full = await getJson<{ entities?: Record<string, Entity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=labels|aliases|descriptions|claims|sitelinks&languages=en|mul&format=json`,
  )
  const e = pickCompany(name, Object.values(full?.entities ?? {}))
  if (!e) return null

  // One more call for the labels of the things the facts point at.
  const hq = currentId(e, 'P159')
  const ceo = currentId(e, 'P169')
  const refs = [...(hq ? [hq] : []), ...ids(e, 'P452').slice(0, 3), ...(ceo ? [ceo] : [])]
  const labels = refs.length
    ? await getJson<{ entities?: Record<string, Entity> }>(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${refs.join('|')}&props=labels&languages=en|mul&format=json`,
      )
    : null
  const label = (q: string | undefined) => (q ? nameOf(labels?.entities?.[q]) ?? null : null)

  const inception = values(e, 'P571')[0] as { time?: string } | undefined
  const year = inception?.time ? Number(inception.time.slice(1, 5)) : null
  const headcount = current(e, 'P1128') as { amount?: string } | null
  const employees = headcount?.amount ? Math.abs(Number(headcount.amount)) || null : null
  const website = (values(e, 'P856')[0] as string | undefined) ?? null
  const logo = values(e, 'P154')[0] as string | undefined

  return {
    wikidataUrl: `https://www.wikidata.org/wiki/${e.id}`,
    label: nameOf(e) ?? name,
    description: e.descriptions?.en?.value ?? null,
    founded: year && year > 1600 && year <= new Date().getFullYear() ? year : null,
    headquarters: label(hq),
    employees,
    industries: ids(e, 'P452').slice(0, 3).map(label).filter((x): x is string => Boolean(x)),
    website: website && /^https?:\/\//.test(website) ? website : null,
    ceo: label(ceo),
    publiclyListed: (e.claims?.P414 ?? []).length > 0,
    logoUrl: logo ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(logo)}?width=96` : null,
  }
}

/**
 * Recent articles that mention the company, from GDELT. Only called once the
 * company resolved on Wikidata, and searched by that exact label in quotes —
 * so "Zeta" never pulls news about Catherine Zeta-Jones.
 */
export async function readCompanyNews(label: string): Promise<CompanyNews> {
  const data = await getJson<{ articles?: { title: string; url: string; domain: string; seendate: string }[] }>(
    `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`"${label}"`)}&mode=artlist&maxrecords=5&format=json&sort=datedesc&sourcelang=english`,
  )
  return (data?.articles ?? [])
    .filter((a) => /^https?:\/\//.test(a.url))
    .slice(0, 3)
    .map((a) => ({
      title: a.title.replace(/\s+([,.:;!?])/g, '$1').trim(),
      url: a.url,
      source: a.domain,
      date: `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}`,
    }))
}
