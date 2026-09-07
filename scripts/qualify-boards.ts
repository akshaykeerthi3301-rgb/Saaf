/**
 * Turn harvested candidates into registry entries — but only the ones that
 * actually hire in India.
 *
 * scripts/harvest-common-crawl.ts produces a list of slugs the open web has
 * seen. That list is a guess: most of those companies are American, many of
 * the boards are dead, and some slugs are not companies at all. This script is
 * the filter. It calls each candidate's own public ATS API — the same endpoint
 * the daily ingest calls, through the same ADAPTERS — and keeps a board only
 * if the live response contains at least one India role.
 *
 * THE REGISTRY STAYS CURATED, WHICH IS THE POINT. docs/PROJECT-STATE.md calls
 * the registry the moat, and an auto-appended file of 14,000 guesses would not
 * be one. So the promotion rule is narrow and one-directional:
 *
 *   · a board enters only on live evidence of India roles, never on a guess
 *   · the company name comes from the API payload where the provider gives one,
 *     rather than title-casing a slug — `discover-boards.ts` did the latter and
 *     produced entries like "Apnaco"
 *   · nothing is ever removed here. Deactivation is the ingest's job, and it
 *     has the daily evidence for it
 *   · the diff lands in git, and is meant to be read before it is committed
 *
 * Every probe result is written back into registry/candidates.json, so a run
 * is resumable and a second run does not re-probe 14,000 boards to rediscover
 * the same 12,000 rejections.
 *
 * Usage:
 *   npx tsx scripts/qualify-boards.ts --limit 500
 *   npx tsx scripts/qualify-boards.ts --limit 2000 --provider workday
 *   npx tsx scripts/qualify-boards.ts --limit 100 --dry     (writes nothing)
 */
// One page of Workday results is all a qualification decision needs: the
// question is "does this tenant post in India at all", not "how many". Two
// requests a candidate instead of up to a hundred.
//
// This assignment runs AFTER the imports below — ES module evaluation order,
// not a mistake — which is exactly why ingest/providers reads WD_MAX_PAGES at
// call time rather than binding it at module load. Setting it here was a no-op
// until that changed.
process.env.WD_MAX_PAGES ??= '1'

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { ADAPTERS, USER_AGENT, type NormalisedRole } from '../ingest/providers'
import { pool } from '../ingest/pool'
import { isIndianLocation } from '../src/lib/taxonomy/locations'
import type { Candidate } from './harvest-common-crawl'

const CANDIDATES = 'registry/candidates.json'
const BOARDS = 'registry/boards.json'
const REVIEW = 'registry/needs-review.json'

/**
 * India roles above which a board is held out for a human to look at.
 *
 * ⚠️ THIS IS THE MOAT'S ONE AUTOMATED DEFENCE. A staffing agency's ATS board is
 * technically a company ATS board — the same endpoint, the same adapter — but
 * functionally it is an aggregator, reposting other employers' vacancies. The
 * locked decision in docs/PROJECT-STATE.md is company boards only, so admitting
 * one silently would reverse that decision by accident, and at scale it would
 * dominate the index: the first sweep found "Endeavor IT Solution" carrying
 * 8,476 India roles against a median of 5.
 *
 * A volume threshold ALONE cannot tell the two apart — Bosch (546), AECOM (340)
 * and Rentokil Initial (385) are genuine employers at the same magnitude. So
 * this does not reject anything. It holds the outliers out of boards.json and
 * writes them to registry/needs-review.json with their counts, where admitting
 * one is a deliberate act. Everything below the line merges as before.
 */
const REVIEW_ABOVE = 250

/** Simultaneous probes. Deliberately modest: six third-party ATS providers are
 *  doing us a favour by publishing these endpoints, and a qualification sweep
 *  is the one place this codebase could plausibly look like abuse. */
const CONCURRENCY = 8
/** Courtesy pause after each probe, per worker. */
const DELAY_MS = 150

type Probed = Candidate & {
  probedAt?: string
  roles?: number
  india?: number
  companyName?: string
  error?: string
}

type BoardEntry = {
  provider: string
  token: string
  company_name: string
  /** Provenance, so a hand review can tell a harvested board from a typed one. */
  roles?: number
  india?: number
  qualifiedAt?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Slug → a name a human would accept, for the providers whose API has none. */
function titleise(slug: string): string {
  return slug
    .replace(/[._-]+/g, ' ')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim()
}

/** Words a Workday site name adds that are not part of the company's name. */
const SITE_NOISE = /^(external|internal|careers?|career|jobs?|site|global|experienced|professional|campus|hiring|recruiting|opportunities|search|apply|talent|new|en|us)$/i

/**
 * A better display name for a Workday board, when — and only when — the site
 * name can prove it.
 *
 * The tenant is all we have, and it is lower-cased and concatenated:
 * `bristolmyerssquibb`, `automationanywhere`, `alfalaval`. Title-casing that
 * gives "Bristolmyerssquibb", which goes on a candidate's shortlist next to
 * "Swiggy" and looks broken. Workday publishes no usable company name — the
 * detail payload's `hiringOrganization` is the per-requisition legal entity
 * ("IL00 Mellanox Technologies, Ltd." for NVIDIA), which is worse.
 *
 * But the SITE name preserves capitalisation and word boundaries:
 * `AutomationAnywhereJobs`, `Alfa_Laval_jobs`, `NVIDIAExternalCareerSite`.
 *
 * ⚠️ IT ONLY FIRES WHEN IT CAN VERIFY ITSELF. The split is accepted only if the
 * words, stripped of career-site noise and concatenated, equal the tenant
 * exactly. `AutomationAnywhereJobs` − Jobs = "automationanywhere" = the tenant,
 * so "Automation Anywhere" is proven. `DXCJobs` − Jobs = "dxc" ≠
 * "dxctechnology", so it is rejected and the plain fallback stands. This
 * guesses nothing: it either proves the company's own spelling or declines.
 */
export function workdayName(token: string): { name: string; proven: boolean } {
  const [host, site = ''] = [token.split('/')[0], token.split('/')[1]]
  const tenant = host.split('.')[0]

  const raw = site
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase → words
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // NVIDIAExternal → NVIDIA External
    .split(/[\s._-]+/)
    .filter(Boolean)
    .filter((w) => !SITE_NOISE.test(w))

  /**
   * Undo splits that were never word boundaries.
   *
   * A capital letter mid-word means a compound brand as often as it means two
   * words: `ResMed`, `GoTo`, `TopBloc` are single names, while
   * `AutomationAnywhere`, `WesternUnion` and `CHRobinson` are two. Splitting
   * everything produced "Res Med" and "Go To"; splitting nothing leaves
   * "CHRobinson".
   *
   * The signal that separates them is length. A genuine word in a company name
   * runs to five characters or more — Automation, Anywhere, Robinson,
   * Consulting, Guardian — whereas the halves of a compound brand are short:
   * Res/Med, Go/To, Top/Bloc. So a boundary survives only if one side is a real
   * word; otherwise the two pieces are glued back together with their
   * capitalisation intact, which is the company writing its own name.
   */
  const words: string[] = []
  for (const w of raw) {
    const prev = words[words.length - 1]
    if (prev && Math.max(prev.length, w.length) < 5) words[words.length - 1] = prev + w
    else words.push(w)
  }

  const joined = words.join('').toLowerCase()
  const matchesTenant = joined === tenant.toLowerCase() && joined.length > 2

  // A single all-lowercase word tells us nothing the tenant did not already —
  // `hitachi.wd1…/hitachi` "proves" only that the site repeats the tenant, and
  // returning it un-titled made "Hitachi" into "hitachi". So the split has to
  // earn its place: either it separates words the tenant ran together, or it
  // carries capitalisation the tenant lost.
  //
  // ⚠️ THE ACRONYM CASE IS NARROW ON PURPOSE. `NVIDIA`, `DXC` and `KION` are
  // how those companies write themselves; `GAPINC` and `HEIDELBERG` are a site
  // name shouting, and accepting them turned "Heidelberg" into "HEIDELBERG".
  // Real acronyms are short, so anything over six characters is treated as
  // shouting and falls back to the title-cased tenant. A word with mixed case
  // (ResMed, GoTo) is always the company's own spelling and is kept as-is.
  // A glued-on corporate suffix is not part of the acronym. `GAPINC` and
  // `HPINC` are the only shape that survived every other rule, and they read as
  // shouting rather than as a name. Split once, so HP Inc and GAP Inc come out
  // the way the companies write them.
  if (words.length === 1) {
    const m = /^([A-Za-z]{2,})(INC|CORP|LTD|LLC|PLC)$/i.exec(words[0])
    if (m) {
      words[0] = m[1]
      words.push(m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase())
    }
  }

  const only = words[0] ?? ''
  const single =
    /[a-z]/.test(only) && /[A-Z]/.test(only) ? true          // ResMed, GoTo
    : /^[A-Z]+$/.test(only) && only.length <= 6 ? true       // NVIDIA, DXC, KION
    : false
  const worthIt = words.length >= 2 || single

  if (matchesTenant && worthIt) {
    // Keep a word's own capitalisation when it has any — that is the company
    // writing its own name — and title-case the rest.
    const name = words
      .map((w) => (/[A-Z]/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ')
    return { name, proven: true }
  }
  return { name: titleise(tenant), proven: false }
}

/**
 * The company's own name for itself, where the provider publishes one.
 *
 * Costs one extra request and is therefore made ONLY for boards that already
 * qualified — a few hundred calls, not fourteen thousand.
 */
async function companyName(provider: string, token: string, roles: NormalisedRole[]): Promise<string> {
  if (provider === 'workday') return workdayName(token).name
  const fallback = titleise(token)
  try {
    if (provider === 'greenhouse') {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const name = (await res.json() as { name?: string }).name
        if (name) return name
      }
    }
    if (provider === 'workable') {
      const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${token}`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const name = (await res.json() as { name?: string }).name
        if (name) return name
      }
    }
    if (provider === 'smartrecruiters') {
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${token}/postings?limit=1`, {
        headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const body = await res.json() as { content?: { company?: { name?: string } }[] }
        const name = body.content?.[0]?.company?.name
        // SmartRecruiters stores these upper-cased ("SWIGGY"). Shouting is not
        // the company's name, and it is going on a candidate's shortlist.
        if (name) return /^[A-Z0-9 .&'-]+$/.test(name) ? titleise(name.toLowerCase()) : name
      }
    }
  } catch { /* the board qualified; a missing display name is not a reason to drop it */ }
  // Ashby, Recruitee and Workday publish no company name on these endpoints.
  void roles
  return fallback
}

/** One live probe. Returns null when the board is unreachable or empty. */
async function probe(c: Candidate): Promise<{ roles: number; india: number } | null> {
  const a = ADAPTERS.find((x) => x.provider === c.provider)
  if (!a) return null

  let roles: NormalisedRole[]
  if (a.fetchAll) {
    // Workday and SmartRecruiters. WD_MAX_PAGES=1 at the top of this file keeps
    // a Workday probe to two requests instead of a full paging walk.
    roles = (await a.fetchAll(c.token)).roles
  } else {
    const res = await fetch(a.url(c.token), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('non-JSON')
    roles = a.parse(await res.json(), c.token)
  }

  return { roles: roles.length, india: roles.filter((r) => isIndianLocation(r.locationRaw)).length }
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (name: string) => args.includes(name) ? args[args.indexOf(name) + 1] : null
  const limit = Number(flag('--limit')) || 500
  const only = flag('--provider')
  const dry = args.includes('--dry')
  const reprobe = args.includes('--reprobe')

  // Offline name repair. No network, no probes.
  //
  // The Workday display names are derived, not fetched, so improving the
  // derivation should be applyable to a registry that already exists rather
  // than requiring 28,000 candidates to be re-probed.
  //
  // ⚠️ IT ONLY REWRITES NAMES NOTHING HAS TOUCHED — an entry whose current name
  // is exactly the plain title-cased tenant. A hand-corrected company name is a
  // decision someone made, and this has no standing to overwrite it.
  if (args.includes('--rename')) {
    const boards = JSON.parse(readFileSync(BOARDS, 'utf8')) as BoardEntry[]
    let changed = 0
    for (const b of boards) {
      if (b.provider !== 'workday') continue
      const plain = titleise(b.token.split('.')[0])
      // Rewritable: the plain fallback, or a name an EARLIER version of this
      // function derived from the same token. Anything else is a hand edit and
      // is left alone. Without the second case, fixing a bad derivation could
      // never be applied — the bad name no longer equals the plain fallback.
      const derived = b.company_name.replace(/\s+/g, '').toLowerCase()
      const tenant = b.token.split('.')[0].toLowerCase()
      if (b.company_name !== plain && derived !== tenant) continue
      const better = workdayName(b.token)
      if (better.proven && better.name !== plain) {
        console.log(`  ${plain.padEnd(28)} → ${better.name}`)
        b.company_name = better.name
        changed++
      }
    }
    if (!dry) writeFileSync(BOARDS, JSON.stringify(boards, null, 2))
    console.log(`\n  ${changed} Workday names improved${dry ? ' (--dry: nothing written)' : ''}`)
    return
  }

  // Collapse registry entries that differ only in the case of their token.
  //
  // For a registry harvested before that was understood: `dxctechnology…/DXCJobs`
  // and `dxctechnology…/dxcjobs` are one board, and keeping both made the ingest
  // fetch the tenant twice and index every posting twice. Keeps the entry with
  // the most India roles, which is the one that was probed most completely.
  if (args.includes('--dedupe')) {
    const boards = JSON.parse(readFileSync(BOARDS, 'utf8')) as BoardEntry[]
    const best = new Map<string, BoardEntry>()
    let dropped = 0
    for (const b of boards) {
      const key = `${b.provider}:${b.token.toLowerCase()}`
      const prev = best.get(key)
      if (!prev) { best.set(key, b); continue }
      dropped++
      console.log(`  ${b.company_name.padEnd(26).slice(0,26)} ${prev.token.split('/')[1] ?? prev.token}  ←  ${b.token.split('/')[1] ?? b.token}`)
      if ((b.india ?? 0) > (prev.india ?? 0)) best.set(key, b)
    }
    const kept = [...best.values()]
    if (!dry) writeFileSync(BOARDS, JSON.stringify(kept, null, 2))
    console.log(`\n  ${dropped} case-variant entries collapsed · ${BOARDS} ${boards.length} → ${kept.length}${dry ? ' (--dry: nothing written)' : ''}`)
    return
  }

  // Apply the review gate to a registry that already exists.
  //
  // Needed because REVIEW_ABOVE can change, and because the first full sweep
  // ran before the gate existed — so boards.json can hold entries that would be
  // held out today. Moves them out; never deletes them.
  if (args.includes('--regate')) {
    const boards = JSON.parse(readFileSync(BOARDS, 'utf8')) as BoardEntry[]
    const keep = boards.filter((b) => (b.india ?? 0) <= REVIEW_ABOVE)
    const held = boards.filter((b) => (b.india ?? 0) > REVIEW_ABOVE)
    for (const b of held) {
      console.log(`  ? ${b.provider.padEnd(16)} ${b.company_name.padEnd(30).slice(0, 30)} ${String(b.india).padStart(5)} India`)
    }
    if (!dry && held.length) {
      const prior = existsSync(REVIEW) ? (JSON.parse(readFileSync(REVIEW, 'utf8')) as BoardEntry[]) : []
      const all = [...new Map([...prior, ...held].map((b) => [`${b.provider}:${b.token}`, b])).values()]
        .sort((a, b) => (b.india ?? 0) - (a.india ?? 0))
      writeFileSync(REVIEW, JSON.stringify(all, null, 2))
      writeFileSync(BOARDS, JSON.stringify(keep, null, 2))
    }
    console.log(`\n  ${held.length} board(s) held out · ${BOARDS} ${boards.length} → ${keep.length}${dry ? ' (--dry: nothing written)' : ''}`)
    return
  }

  if (!existsSync(CANDIDATES)) {
    console.error(`  ${CANDIDATES} not found — run scripts/harvest-common-crawl.ts first`)
    process.exit(1)
  }
  const candidates = JSON.parse(readFileSync(CANDIDATES, 'utf8')) as Probed[]
  const boards = existsSync(BOARDS)
    ? (JSON.parse(readFileSync(BOARDS, 'utf8')) as BoardEntry[])
    : []
  // Case-insensitive, for the reason spelled out in harvest-common-crawl.ts:
  // a token that differs only in case is the same board, and admitting both
  // duplicates every posting the company has.
  const inRegistry = new Set(boards.map((b) => `${b.provider}:${b.token.toLowerCase()}`))

  // Already in the registry, or already probed and answered. Both are skipped,
  // which is what makes a 14,000-candidate list workable in tranches.
  const pending = candidates.filter((c) =>
    (!only || c.provider === only) &&
    !inRegistry.has(`${c.provider}:${c.token.toLowerCase()}`) &&
    (reprobe || !c.probedAt)
  )

  // Shuffled, deliberately. candidates.json is sorted by provider then slug, so
  // an unshuffled tranche probes "every Ashby company beginning with a" — which
  // is not a sample of anything, and makes the qualification rate a run reports
  // meaningless. Every probe is recorded either way, so order costs nothing.
  for (let i = pending.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pending[i], pending[j]] = [pending[j], pending[i]]
  }
  const queue = pending.slice(0, limit)

  console.log(
    `  ${candidates.length} candidates · ${boards.length} already in the registry · ` +
    `${candidates.filter((c) => c.probedAt).length} already probed`
  )
  console.log(`  probing ${queue.length}${only ? ` ${only}` : ''} candidates\n`)

  const qualified: BoardEntry[] = []
  const needsReview: BoardEntry[] = []
  let done = 0
  let reachable = 0

  /**
   * Flush probe results to disk mid-run.
   *
   * A full sweep is tens of thousands of live HTTP calls and takes the better
   * part of an hour. Writing only at the end means an interrupt — a laptop
   * lid, a dropped connection, a Ctrl-C — throws away every probe made so far
   * and the next run repeats all of them against the same third-party APIs.
   * That is the cost this guards against; the file is 4 MB, so writing it every
   * few hundred probes is free by comparison.
   */
  const checkpoint = () => {
    if (dry) return
    writeFileSync(CANDIDATES, JSON.stringify(candidates, null, 2))
  }

  await pool(queue, CONCURRENCY, async (c) => {
    try {
      const hit = await probe(c)
      c.probedAt = new Date().toISOString()
      if (hit) {
        reachable++
        c.roles = hit.roles
        c.india = hit.india
        delete c.error
        if (hit.india > 0) {
          const name = await companyName(c.provider, c.token, [])
          c.companyName = name
          const entry: BoardEntry = {
            provider: c.provider,
            token: c.token,
            company_name: name,
            roles: hit.roles,
            india: hit.india,
            qualifiedAt: c.probedAt.slice(0, 10),
          }
          if (hit.india > REVIEW_ABOVE) {
            needsReview.push(entry)
            console.log(`  ? ${c.provider.padEnd(16)} ${name.padEnd(28).slice(0, 28)} ${String(hit.india).padStart(5)} India — HELD FOR REVIEW`)
          } else {
            qualified.push(entry)
            console.log(`  ✓ ${c.provider.padEnd(16)} ${name.padEnd(28).slice(0, 28)} ${String(hit.india).padStart(4)} India / ${hit.roles}`)
          }
        }
      }
    } catch (e) {
      c.probedAt = new Date().toISOString()
      c.error = (e as Error).message.slice(0, 120)
    }
    done++
    if (done % 250 === 0) {
      checkpoint()
      console.log(`  … ${done}/${queue.length} probed · ${qualified.length} qualified`)
    }
    await sleep(DELAY_MS)
  })

  console.log(
    `\n  ${done} probed · ${reachable} live boards · ${qualified.length} with India roles ` +
    `(${reachable ? Math.round((qualified.length / reachable) * 100) : 0}% of live)`
  )
  console.log(`  ${qualified.reduce((n, q) => n + (q.india ?? 0), 0)} India roles behind them`)

  if (dry) {
    console.log('\n  --dry: nothing written')
    return
  }

  writeFileSync(CANDIDATES, JSON.stringify(candidates, null, 2))

  // Merge, existing entries winning. A hand-typed company_name is a decision
  // someone made; a probe has no standing to overwrite it.
  const merged = [...boards]
  for (const q of qualified) {
    const key = `${q.provider}:${q.token.toLowerCase()}`
    if (inRegistry.has(key)) continue
    inRegistry.add(key)   // two candidates in THIS run can also be case-variants
    merged.push(q)
  }
  merged.sort((a, b) => (b.india ?? 0) - (a.india ?? 0) || a.provider.localeCompare(b.provider))
  writeFileSync(BOARDS, JSON.stringify(merged, null, 2))

  // Held-out boards, merged with anything a previous run held. They are not in
  // the registry and are not ingested; this file exists so the decision is
  // visible rather than lost in a log.
  if (needsReview.length) {
    const prior = existsSync(REVIEW) ? (JSON.parse(readFileSync(REVIEW, 'utf8')) as BoardEntry[]) : []
    const all = [...new Map([...prior, ...needsReview]
      .map((b) => [`${b.provider}:${b.token}`, b])).values()]
      .sort((a, b) => (b.india ?? 0) - (a.india ?? 0))
    writeFileSync(REVIEW, JSON.stringify(all, null, 2))
  }

  console.log(`\n  ${BOARDS}: ${boards.length} → ${merged.length} boards`)
  if (needsReview.length) {
    console.log(
      `  ${REVIEW}: ${needsReview.length} board(s) held out for carrying more than ` +
      `${REVIEW_ABOVE} India roles — a genuine mega-employer or a staffing agency. ` +
      'Move the real employers into boards.json by hand.'
    )
  }
  console.log('  Review the diff before committing:  git diff registry/boards.json')
}

// Only when invoked as a script. Exported for tests, which must not run a sweep.
if (process.argv[1]?.includes('qualify-boards')) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
