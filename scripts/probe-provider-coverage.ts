/**
 * Of the INDIAN postings each provider returns, how many carry a stated pay range,
 * work mode and contract type once the adapters have read them? (TASK-176/210.)
 *
 *   npx tsx scripts/probe-provider-coverage.ts [boardsPerProvider]
 *
 * Runs the real adapters (ingest/providers) and the real India filter, so the
 * numbers are what the ingest would store — including every sanity bound that
 * drops a form default or a nonsense range. Writes nothing. Workday and the paged
 * SmartRecruiters listing are not sampled here (their lists carry none of these).
 */
import { readFileSync } from 'node:fs'
import { ADAPTERS } from '../ingest/providers'
import { USER_AGENT } from '../ingest/providers/types'
import { resolveInIndia } from '../src/gates/extract'

type Board = { provider: string; token: string; india?: number }
const boards = JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]
const N = Number(process.argv[2]) || 8
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const rows: string[] = []
  const tot = { india: 0, pay: 0, mode: 0, type: 0 }
  for (const p of ['greenhouse', 'lever', 'ashby', 'workable', 'recruitee'] as const) {
    const a = ADAPTERS.find((x) => x.provider === p)!
    const picks = boards.filter((b) => b.provider === p).sort((x, y) => (y.india ?? 0) - (x.india ?? 0)).slice(0, N)
    const c = { india: 0, pay: 0, mode: 0, type: 0, modes: {} as Record<string, number> }
    for (const b of picks) {
      try {
        const res = await fetch(a.url(b.token), { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) })
        if (!res.ok) continue
        for (const r of a.parse(await res.json(), b.token).filter((x) => resolveInIndia(x.locationRaw))) {
          c.india++
          if (r.pay) c.pay++
          if (r.workMode) { c.mode++; c.modes[r.workMode] = (c.modes[r.workMode] ?? 0) + 1 }
          if (r.employmentType) c.type++
        }
      } catch { /* a dead board is not a finding */ }
      await sleep(300)
    }
    const pct = (n: number) => (c.india ? ((100 * n) / c.india).toFixed(1) : '–').padStart(5)
    rows.push(`${p.padEnd(11)} ${String(picks.length).padStart(3)} ${String(c.india).padStart(6)}   pay ${pct(c.pay)}%   work mode ${pct(c.mode)}%   contract type ${pct(c.type)}%   ${JSON.stringify(c.modes)}`)
    for (const k of ['india', 'pay', 'mode', 'type'] as const) tot[k] += c[k]
  }
  console.log('provider    boards  india\n' + rows.join('\n'))
  const pct = (n: number) => ((100 * n) / tot.india).toFixed(1)
  console.log(`\nALL (sampled providers): ${tot.india} Indian postings — stated pay ${pct(tot.pay)}%, work mode ${pct(tot.mode)}%, contract type ${pct(tot.type)}%`)
}
main()
