/**
 * Harvest ATS company slugs from Common Crawl.
 *
 * WHY THIS EXISTS. The registry was built by typing company names into
 * scripts/discover-boards.ts — 219 hand-written slugs, of which 31 became
 * boards. That is the actual ceiling on this product's supply, and it is not
 * the sourcing method: the same public ATS endpoints this repo already has
 * adapters for serve over a million postings across 20,000+ companies. The
 * only missing piece was a list of who those companies are.
 *
 * Common Crawl's index is that list. It is a public, non-commercial archive of
 * the open web with its own URL index (CDX), so asking it "which
 * boards.greenhouse.io paths have you seen" costs a handful of HTTP requests
 * and touches no employer's server at all. Nothing here scrapes a job board;
 * it reads an index of URLs. The actual postings still come from each
 * company's own public ATS API, exactly as before — the LinkedIn/Naukri lock
 * in docs/PROJECT-STATE.md is untouched.
 *
 * WORKDAY IS THE REASON THIS MATTERS MOST. A Workday board is addressed by two
 * unguessable strings, host and site. scripts/discover-workday.ts brute-forced
 * an 8 × 12 grid per tenant and found 2 of 31 candidates; every Big 4 firm and
 * most of big tech was unreachable. Common Crawl has the real pairs.
 *
 * ⚠️ THIS WRITES registry/candidates.json AND NEVER registry/boards.json.
 * A crawled slug is a guess. scripts/qualify-boards.ts is what turns a guess
 * into a registry entry, and only after the live API returns real India roles.
 *
 * Usage:
 *   npx tsx scripts/harvest-common-crawl.ts [--crawls 3] [--provider greenhouse]
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { USER_AGENT } from '../ingest/providers/types'

const CDX = 'https://index.commoncrawl.org'
const OUT = 'registry/candidates.json'

/** How many recent crawl snapshots to read. Each is a separate three-monthly
 *  crawl, so more snapshots means more companies and diminishing returns. */
const DEFAULT_CRAWLS = 3

export type Candidate = {
  provider: string
  /** What the adapter needs: a slug, or "host/site" for Workday. */
  token: string
  /** Which crawl snapshots named it. Kept so a stale slug is identifiable. */
  seenIn: string[]
}

/**
 * One entry per ATS host shape, with the rule for turning a crawled URL into
 * the token its adapter takes.
 *
 * Returning null rejects the URL. That is doing real work: the crawl is full of
 * `/robots.txt`, `/embed/job_app`, static asset paths and numeric account ids,
 * none of which are company slugs.
 */
const HOSTS: {
  provider: string
  pattern: string
  token: (u: URL) => string | null
}[] = [
  // Greenhouse moved from boards.greenhouse.io to job-boards.greenhouse.io and
  // 301s the old host, so both are crawled and both carry the same slugs.
  { provider: 'greenhouse', pattern: 'boards.greenhouse.io/*', token: (u) => firstSegment(u) },
  { provider: 'greenhouse', pattern: 'job-boards.greenhouse.io/*', token: (u) => firstSegment(u) },
  // ⚠️ LEVER IS DELIBERATELY ABSENT. jobs.lever.co now serves a robots.txt
  // carrying Content-Signal directives, and Common Crawl has stopped indexing
  // it: CC-MAIN-2026-34 holds the robots file and nothing else. Older
  // snapshots (2025-38, 2024-38) still carry Lever URLs and could be mined,
  // and this repo is not going to. The signal says do not collect; reading an
  // archived copy to get around a current refusal is the same act with an
  // extra step, and this codebase's standing rule on LinkedIn/Naukri
  // (docs/PROJECT-STATE.md) is that a defensible-sounding workaround is still
  // a workaround.
  //
  // Cost: the ten Lever boards in the registry stay hand-curated and grow only
  // through scripts/discover-boards.ts. Lever's own public postings API is
  // unaffected and the ingest still reads it — that is a documented endpoint
  // the company publishes, not a crawl.
  { provider: 'ashby', pattern: 'jobs.ashbyhq.com/*', token: (u) => firstSegment(u) },
  { provider: 'workable', pattern: 'apply.workable.com/*', token: (u) => firstSegment(u) },
  { provider: 'smartrecruiters', pattern: 'jobs.smartrecruiters.com/*', token: (u) => firstSegment(u) },
  { provider: 'recruitee', pattern: '*.recruitee.com/*', token: (u) => subdomain(u, 'recruitee.com') },
  { provider: 'workday', pattern: '*.myworkdayjobs.com/*', token: workdayToken },
]

/** Path segments that are never a company. */
const RESERVED = new Set([
  '', 'robots.txt', 'favicon.ico', 'embed', 'api', 'static', 'assets', 'js', 'css',
  'images', 'img', 'sitemap.xml', 'search', 'jobs', 'job', 'login', 'signin',
  'privacy', 'terms', 'about', 'error', '404', 'health', 'index.html', 'wday',
])

function clean(seg: string | undefined): string | null {
  if (!seg) return null
  const s = decodeURIComponent(seg).trim().toLowerCase()
  if (RESERVED.has(s)) return null
  // A slug is a name. Purely numeric paths are Greenhouse's internal account
  // ids, which the boards API does not accept.
  if (/^\d+$/.test(s)) return null
  if (!/^[a-z0-9][a-z0-9._-]{1,60}$/.test(s)) return null
  return s
}

const firstSegment = (u: URL) => clean(u.pathname.split('/')[1])

function subdomain(u: URL, base: string): string | null {
  if (!u.hostname.endsWith(`.${base}`)) return null
  const sub = u.hostname.slice(0, -(base.length + 1))
  // `www.recruitee.com` is the vendor, not a customer.
  if (sub === 'www' || sub.includes('.')) return null
  return clean(sub)
}

/**
 * Workday: "host/site".
 *
 * Real shapes in the crawl:
 *   nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite
 *   nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/…
 *   3m.wd1.myworkdayjobs.com/Search
 *
 * The optional locale segment is the trap — reading it as the site name yields
 * "en-US" for every tenant, which is a board that does not exist.
 *
 * Case is preserved here, unlike every other provider: Workday site names are
 * case-sensitive and `nvidiaexternalcareersite` 404s.
 */
function workdayToken(u: URL): string | null {
  const host = u.hostname.toLowerCase()
  if (!/^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/.test(host)) return null

  const segments = u.pathname.split('/').filter(Boolean)
  const first = segments[0]
  const site = first && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(first) ? segments[1] : first
  if (!site) return null
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,60}$/.test(site)) return null
  if (RESERVED.has(site.toLowerCase())) return null
  return `${host}/${site}`
}

async function collections(n: number): Promise<string[]> {
  const res = await fetch(`${CDX}/collinfo.json`, { headers: { 'User-Agent': USER_AGENT } })
  const all = (await res.json()) as { id: string }[]
  return all.slice(0, n).map((c) => c.id)
}

/**
 * Pull every CDX page for one host pattern in one crawl.
 *
 * CDX returns NDJSON ordered by reversed-domain urlkey and paginates by index
 * block, so reading `page=0` alone returns only slugs beginning with digits and
 * `a`. Every page has to be read or the harvest is alphabetically biased —
 * which is the sort of defect that looks like "it works" on a spot check.
 */
async function* crawlPages(crawl: string, pattern: string): AsyncGenerator<string> {
  const base = `${CDX}/${crawl}-index?url=${encodeURIComponent(pattern)}&output=json`

  let pages = 1
  try {
    const meta = await fetch(`${base}&showNumPages=true`, { headers: { 'User-Agent': USER_AGENT } })
    if (meta.ok) pages = Number(((await meta.json()) as { pages?: number }).pages ?? 1)
  } catch {
    return // this crawl does not carry this host; not an error
  }

  for (let page = 0; page < pages; page++) {
    let body: string
    try {
      const res = await fetch(`${base}&page=${page}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(180_000),
      })
      if (!res.ok) continue
      body = await res.text()
    } catch {
      continue // one page missing is a smaller loss than abandoning the pattern
    }
    for (const line of body.split('\n')) {
      if (!line.trim()) continue
      try {
        yield (JSON.parse(line) as { url: string }).url
      } catch { /* CDX occasionally emits a truncated line */ }
    }
    // Courtesy. Common Crawl serves this index free and asks for restraint.
    await new Promise((r) => setTimeout(r, 500))
  }
}

async function main() {
  const args = process.argv.slice(2)
  const crawlCount = Number(args[args.indexOf('--crawls') + 1]) || DEFAULT_CRAWLS
  const only = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : null

  const crawls = await collections(crawlCount)
  console.log(`  reading ${crawls.length} crawl${crawls.length === 1 ? '' : 's'}: ${crawls.join(', ')}\n`)

  // Merged with whatever is already on disk: a company that stopped being
  // crawled has not necessarily stopped hiring, and qualification is what
  // decides. Nothing is ever dropped here.
  const found = new Map<string, Candidate>()
  if (existsSync(OUT)) {
    for (const c of JSON.parse(readFileSync(OUT, 'utf8')) as Candidate[]) {
      found.set(`${c.provider}:${c.token}`, c)
    }
    console.log(`  starting from ${found.size} candidates already on disk\n`)
  }

  for (const host of HOSTS) {
    if (only && host.provider !== only) continue
    let urls = 0
    const before = found.size

    for (const crawl of crawls) {
      for await (const url of crawlPages(crawl, host.pattern)) {
        urls++
        let token: string | null = null
        try { token = host.token(new URL(url)) } catch { continue }
        if (!token) continue

        // ⚠️ CASE-INSENSITIVE KEY. Workday site names preserve case because the
        // path does, but the CXS API answers to either — so `DXCJobs` and
        // `dxcjobs` are ONE board that the crawl saw written two ways. Keying
        // on the raw token admitted both, the ingest fetched the tenant twice,
        // and every one of its postings landed in the index in duplicate.
        // 168 registry entries and roughly 2,000 roles came from this.
        const key = `${host.provider}:${token.toLowerCase()}`
        const existing = found.get(key)
        if (existing) {
          if (!existing.seenIn.includes(crawl)) existing.seenIn.push(crawl)
        } else {
          found.set(key, { provider: host.provider, token, seenIn: [crawl] })
        }
      }
    }
    console.log(
      `  ${host.pattern.padEnd(30)} ${String(urls).padStart(8)} urls → ` +
      `${String(found.size - before).padStart(6)} new candidates`
    )
  }

  // Re-read immediately before writing, and keep every field the on-disk copy
  // carries that this script does not own.
  //
  // A crawl sweep takes tens of minutes and scripts/qualify-boards.ts writes
  // its probe results (probedAt, india, roles, companyName) into the same file.
  // Holding the copy read at startup and writing it back at the end silently
  // reverted every probe made in between — which reads as "qualification did
  // nothing" and costs the requests all over again.
  if (existsSync(OUT)) {
    for (const c of JSON.parse(readFileSync(OUT, 'utf8')) as Record<string, unknown>[]) {
      const key = `${c.provider}:${c.token}`
      const mine = found.get(key)
      if (mine) found.set(key, { ...c, ...mine, seenIn: mine.seenIn } as Candidate)
      else found.set(key, c as unknown as Candidate)
    }
  }

  const out = [...found.values()].sort((a, b) =>
    a.provider.localeCompare(b.provider) || a.token.localeCompare(b.token))
  writeFileSync(OUT, JSON.stringify(out, null, 2))

  const byProvider: Record<string, number> = {}
  for (const c of out) byProvider[c.provider] = (byProvider[c.provider] ?? 0) + 1
  console.log(`\n  ${OUT} now holds ${out.length} candidates`)
  console.log(`  ${JSON.stringify(byProvider)}`)
  console.log(`\n  Next: npx tsx scripts/qualify-boards.ts --limit 500`)
}

main().catch((e) => { console.error(e); process.exit(1) })
