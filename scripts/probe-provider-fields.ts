/**
 * What do the ATS providers' own APIs publish about pay, work mode, employment
 * type and company size — and for what share of postings? (TASK-176, TASK-210.)
 *
 *   npx tsx scripts/probe-provider-fields.ts
 *
 * Reads registry/boards.json (tracked), fetches a few of the largest boards per
 * provider through the same public endpoints the ingest uses (plus the optional
 * query flags a provider documents for pay), and for every key whose NAME looks
 * relevant reports how many postings carry a non-empty value and one example.
 * Nothing is written. Courteous: ~6 requests per provider, with a delay.
 */
import { readFileSync } from 'node:fs'
import { ADAPTERS } from '../ingest/providers'
import { USER_AGENT } from '../ingest/providers/types'

type Board = { provider: string; token: string; company_name: string; india?: number }
const boards = JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]
const RELEVANT = /(salary|pay|compens|wage|remote|workplace|telecomm|hybrid|employment|commitment|time_?type|job_?type|contract|employees|headcount|size|level|seniority|department|team)/i

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const flat = (o: unknown, prefix = '', out: Record<string, unknown> = {}, depth = 0): Record<string, unknown> => {
  if (depth > 3 || o === null || o === undefined) return out
  if (Array.isArray(o)) { if (o.length) flat(o[0], `${prefix}[]`, out, depth + 1); return out }
  if (typeof o === 'object') { for (const [k, v] of Object.entries(o as Record<string, unknown>)) flat(v, prefix ? `${prefix}.${k}` : k, out, depth + 1); return out }
  out[prefix] = o
  return out
}

async function jobsOf(provider: string, token: string, extra = ''): Promise<unknown[]> {
  const a = ADAPTERS.find((x) => x.provider === provider)!
  if (a.fetchAll) return []
  const res = await fetch(a.url(token) + extra, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(25000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as unknown
  return Array.isArray(raw) ? raw : ((raw as { jobs?: unknown[]; content?: unknown[] }).jobs ?? (raw as { content?: unknown[] }).content ?? [])
}

async function main() {
  const providers = ['greenhouse', 'lever', 'ashby', 'workable', 'recruitee', 'smartrecruiters'] as const
  for (const p of providers) {
    const picks = boards.filter((b) => b.provider === p).sort((a, b) => (b.india ?? 0) - (a.india ?? 0)).slice(0, 4)
    const flags = p === 'ashby' ? '?includeCompensation=true' : ''
    const seen = new Map<string, { n: number; total: number; example: unknown }>()
    let total = 0
    for (const b of picks) {
      try {
        const jobs = await jobsOf(p, b.token, flags)
        for (const j of jobs) {
          total++
          for (const [k, v] of Object.entries(flat(j))) {
            if (!RELEVANT.test(k)) continue
            const e = seen.get(k) ?? { n: 0, total: 0, example: undefined }
            if (v !== '' && v !== null && v !== false && v !== 0) { e.n++; e.example ??= v }
            seen.set(k, e)
          }
        }
        console.log(`  ${p}/${b.token}: ${jobs.length} postings`)
      } catch (e) { console.log(`  ${p}/${b.token}: ${(e as Error).message}`) }
      await sleep(400)
    }
    console.log(`\n=== ${p} — ${total} postings over ${picks.length} boards`)
    for (const [k, e] of [...seen].sort((a, b) => b[1].n - a[1].n)) {
      console.log(`   ${k.padEnd(48)} ${String(e.n).padStart(5)}  ${((100 * e.n) / Math.max(total, 1)).toFixed(1).padStart(5)}%   e.g. ${JSON.stringify(e.example)?.slice(0, 60)}`)
    }
    console.log()
  }
}
main()
