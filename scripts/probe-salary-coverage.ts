/**
 * Build #2, Phase 1A — how much salary data can we actually get?
 *
 * Run: npm run probe:salary  (add -- --boards N to widen the sample)
 *
 * ⚠️ THIS IS A MEASUREMENT, AND IT DECIDES WHETHER THE SALARY EPIC HAPPENS.
 * docs/PROJECT-STATE.md:607 records "salary cannot be modelled, because no
 * employer in the index publishes one." That was measured against posting TEXT
 * — 12 of 799 postings on 2026-09-07. It was never measured against the
 * STRUCTURED compensation fields the ATS APIs return, because NormalisedRole
 * has no slot for them and nothing ever asked:
 *
 *   lever      salaryRange / salaryDescription  — in the payload, never read
 *   ashby      compensation                     — needs ?includeCompensation=true
 *   recruitee  salary / min_salary / max_salary — never read
 *   greenhouse pay_input_ranges                 — never requested
 *
 * So the claim "no employer publishes one" is unproven for three of six
 * providers. This script proves or disproves it, and writes nothing.
 *
 * It reports TWO tiers separately, because they are different products:
 *   tier 1  a structured field from the provider's own API
 *   tier 2  a figure parseable out of the description text
 * Tier 3 (open government aggregates) is not a per-posting fact and is not
 * measured here.
 */
import { readFileSync } from 'node:fs'
import { ADAPTERS } from '../ingest/providers/index'
import { USER_AGENT } from '../ingest/providers/types'
import { resolveInIndia } from '../src/gates/extract'

type Board = { provider: string; token: string; company_name?: string; india?: number }

const argN = (flag: string, dflt: number): number => {
  const i = process.argv.indexOf(flag)
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt
}
const BOARDS_PER_PROVIDER = argN('--boards', 6)
const TIMEOUT_MS = 20_000

/**
 * Where each provider hides compensation. Keys are searched case-insensitively
 * at any depth of the posting object, because providers nest inconsistently and
 * a fixed path would report a false zero the moment one of them moved it.
 */
const COMP_KEYS = [
  'salaryrange', 'salarydescription', 'compensation', 'compensationtiers',
  'payinputranges', 'pay_input_ranges', 'salary', 'min_salary', 'max_salary',
  'salarymin', 'salarymax', 'compensationtiersummary', 'payrange',
]

/**
 * ⚠️ THIS LOOKS FOR A VALUE, NOT FOR A KEY, AND THE DIFFERENCE IS THE WHOLE
 * MEASUREMENT. The first version of this script asked "is there a compensation
 * field?" and reported Ashby and Recruitee at 100% coverage. Both return the
 * key on every single posting and leave it empty:
 *
 *   ashby      compensation = {compensationTierSummary: null, compensationTiers: []}
 *   recruitee  salary       = {max: null, min: null, period: null, currency: null}
 *   lever      salaryDescription = "<div><br></div>"
 *
 * Presence of a field is not presence of data. A probe that cannot tell them
 * apart hands back a green light for a two-week epic that has nothing to read.
 */
const stripHtml = (v: string): string => v.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()

/** The first scalar under this node that actually carries a figure. */
function meaningfulValue(node: unknown, depth = 0): string | null {
  if (depth > 5 || node == null) return null
  if (typeof node === 'number') return Number.isFinite(node) && node > 0 ? String(node) : null
  if (typeof node === 'string') {
    const t = stripHtml(node)
    return t.length > 0 && /\d/.test(t) ? t.slice(0, 80) : null
  }
  if (Array.isArray(node)) {
    for (const el of node) { const v = meaningfulValue(el, depth + 1); if (v) return v }
    return null
  }
  if (typeof node === 'object') {
    for (const el of Object.values(node as Record<string, unknown>)) {
      const v = meaningfulValue(el, depth + 1); if (v) return v
    }
  }
  return null
}

/** Does this posting carry a compensation field with a REAL VALUE in it? */
function structuredComp(node: unknown, depth = 0): string | null {
  if (depth > 4 || node == null || typeof node !== 'object') return null
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (COMP_KEYS.includes(k.toLowerCase())) {
      const val = meaningfulValue(v)
      if (val) return `${k}=${val}`
    }
  }
  for (const v of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      for (const el of v.slice(0, 5)) { const hit = structuredComp(el, depth + 1); if (hit) return hit }
    } else if (v && typeof v === 'object') {
      const hit = structuredComp(v, depth + 1); if (hit) return hit
    }
  }
  return null
}

/**
 * A deliberately GENEROUS text probe. It is measuring whether a figure is
 * present at all, not parsing one — an over-count here is the safe direction,
 * because it makes the "build the parser" decision harder to reach, not easier.
 */
const TEXT_SALARY =
  /(₹|\bINR\b|\bRs\.?\s*\d)|(\b\d+(\.\d+)?\s*-?\s*(to)?\s*\d*(\.\d+)?\s*(LPA|lpa|lakhs?|crores?|\bCr\b))|(\bCTC\b)|(\bper annum\b)|(\b\d{2},\d{2},\d{3}\b)/

/** "12 LPA" style — an actual figure, not just the word CTC. */
const TEXT_FIGURE =
  /(₹\s*[\d,.]+)|(\b\d+(\.\d+)?\s*(LPA|lpa|lakhs?|crores?|\bCr\b))|(\b\d{2},\d{2},\d{3}\b)/

async function fetchJson(url: string): Promise<unknown> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'application/json' }, signal: ctl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch { return null } finally { clearTimeout(t) }
}

/** Raw postings array out of a provider payload, before normalisation. */
function rawPostings(provider: string, raw: unknown): Record<string, unknown>[] {
  const r = (raw ?? {}) as Record<string, unknown>
  if (provider === 'lever') return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : []
  if (provider === 'greenhouse' || provider === 'ashby') return (r.jobs as Record<string, unknown>[]) ?? []
  if (provider === 'workable') return (r.jobs as Record<string, unknown>[]) ?? []
  if (provider === 'recruitee') return (r.offers as Record<string, unknown>[]) ?? []
  if (provider === 'smartrecruiters') return (r.content as Record<string, unknown>[]) ?? []
  return []
}

/** The location field differs per provider; mirror each adapter's own reading. */
function locationOf(provider: string, j: Record<string, unknown>): string {
  const s = (v: unknown) => (v == null ? '' : String(v))
  const o = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})
  switch (provider) {
    case 'greenhouse': return s(o(j.location).name)
    case 'lever': return s(o(j.categories).location)
    case 'ashby': return s(j.location)
    case 'workable': return [j.city, j.state, j.country].filter(Boolean).map(String).join(', ')
    case 'recruitee': return [j.city, j.country].filter(Boolean).map(String).join(', ')
    case 'smartrecruiters': return [o(j.location).city, o(j.location).country].filter(Boolean).map(String).join(', ')
    default: return ''
  }
}

function descriptionOf(provider: string, j: Record<string, unknown>): string {
  const s = (v: unknown) => (v == null ? '' : String(v))
  switch (provider) {
    case 'greenhouse': return s(j.content)
    case 'lever': return s(j.descriptionPlain ?? j.description)
    case 'ashby': return s(j.descriptionPlain ?? j.descriptionHtml)
    case 'workable': return s(j.description)
    case 'recruitee': return s(j.description)
    default: return ''
  }
}

type Tally = { boards: number; postings: number; india: number; tier1: number; tier2: number; examples: string[] }

async function main(): Promise<void> {
  const boards = JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]

  // Sample the boards with the MOST India roles per provider. Deliberate: a
  // random sample over 1,398 boards is mostly tiny boards, and the question is
  // what share of the INDEX carries salary, which is weighted to large boards.
  const byProvider = new Map<string, Board[]>()
  for (const b of boards) {
    if (b.provider === 'workday') continue // POST + paging; excluded, reported below
    const list = byProvider.get(b.provider) ?? []
    list.push(b)
    byProvider.set(b.provider, list)
  }

  const tallies = new Map<string, Tally>()
  console.log(`Probing up to ${BOARDS_PER_PROVIDER} boards per provider. Writes nothing.\n`)

  for (const [provider, list] of byProvider) {
    const adapter = ADAPTERS.find((a) => a.provider === provider)
    if (!adapter) continue
    const picked = [...list].sort((a, b) => (b.india ?? 0) - (a.india ?? 0)).slice(0, BOARDS_PER_PROVIDER)
    const t: Tally = { boards: 0, postings: 0, india: 0, tier1: 0, tier2: 0, examples: [] }

    for (const b of picked) {
      let url = adapter.url(b.token)
      // ⚠️ The flag the pipeline has never passed. This is the whole question.
      if (provider === 'ashby') url += '?includeCompensation=true'
      const raw = await fetchJson(url)
      if (!raw) continue
      t.boards++

      for (const j of rawPostings(provider, raw)) {
        t.postings++
        if (!resolveInIndia(locationOf(provider, j))) continue
        t.india++

        const struct = structuredComp(j)
        if (struct) {
          t.tier1++
          if (t.examples.length < 3) t.examples.push(`[T1 ${b.company_name ?? b.token}] ${struct}`)
        } else {
          const desc = descriptionOf(provider, j)
          if (TEXT_FIGURE.test(desc) && TEXT_SALARY.test(desc)) {
            t.tier2++
            const m = desc.match(TEXT_FIGURE)
            if (t.examples.length < 3) t.examples.push(`[T2 ${b.company_name ?? b.token}] …${m?.[0] ?? ''}…`)
          }
        }
      }
      process.stdout.write('.')
    }
    tallies.set(provider, t)
    console.log(` ${provider}`)
  }

  console.log('\n\nSALARY COVERAGE — India roles only')
  console.log('─'.repeat(76))
  console.log('provider'.padEnd(17), 'boards'.padStart(7), 'india'.padStart(7), 'tier1'.padStart(7), 'tier2'.padStart(7), 'any%'.padStart(8))
  let ti = 0, t1 = 0, t2 = 0
  for (const [p, t] of tallies) {
    ti += t.india; t1 += t.tier1; t2 += t.tier2
    const pct = t.india ? (((t.tier1 + t.tier2) / t.india) * 100).toFixed(1) : '—'
    console.log(p.padEnd(17), String(t.boards).padStart(7), String(t.india).padStart(7),
      String(t.tier1).padStart(7), String(t.tier2).padStart(7), String(pct).padStart(8))
  }
  console.log('─'.repeat(76))
  const anyPct = ti ? ((t1 + t2) / ti) * 100 : 0
  console.log('TOTAL'.padEnd(17), ''.padStart(7), String(ti).padStart(7), String(t1).padStart(7), String(t2).padStart(7), anyPct.toFixed(1).padStart(8))
  console.log(`\ntier 1 (structured, from the provider's own API): ${ti ? ((t1 / ti) * 100).toFixed(1) : 0}%`)
  console.log(`tier 2 (a figure in the description text):        ${ti ? ((t2 / ti) * 100).toFixed(1) : 0}%`)

  console.log('\nExamples of what was found:')
  for (const [, t] of tallies) for (const e of t.examples) console.log('  ' + e)

  console.log('\n⚠️ workday (324 boards) was NOT probed — its listing is a paged POST, not a GET.')
  console.log('   Probe it separately before treating this total as the whole index.\n')

  console.log('THE GATE (docs plan §2.3):')
  const verdict = anyPct >= 15 ? 'BUILD THE FULL EPIC — salary enters the scorer'
    : anyPct >= 5 ? 'BUILD STORAGE + PARSER + DISPLAY, WEIGHT 0 — a fact, not a rank input'
    : 'DO NOT SCORE SALARY — ship tier 3 context and an honest disclosure line'
  console.log(`  measured ${anyPct.toFixed(1)}%  →  ${verdict}`)
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
