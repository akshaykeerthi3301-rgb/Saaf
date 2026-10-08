import { after } from 'next/server'
import { cronRoute } from '@/lib/cron-route'

/**
 * Rescore every confirmed profile against the current index.
 *
 * Split out of the ingest route: it was the third of four stages sharing one
 * 60-second function, so a slow ingest meant nobody's shortlist was refreshed
 * that day — silently, because the response still said ok.
 *
 * WHY IT CHAINS. A person holding up to 5,000 matches takes ~10-20 s to rescore (measured 2026-10-09: nine profiles,
 * five of them heavy, 111 s). Twenty people can need more than one window, and Vercel Hobby lets a cron run only once
 * a day, so when a run reaches its time budget it asks the SAME route to continue from where it stopped. The
 * follow-up answers at once and does its work after the response (`after`), so no run waits on the next; the chain
 * is capped, authenticated with the same secret, and every hop reports how many profiles are left.
 */
// 300 s (the Hobby maximum with fluid compute).
export const maxDuration = 300

const BUDGET_MS = 250_000
const MAX_HOPS = 6

export const GET = cronRoute('recompute', async (request) => {
  const { recomputeAll } = await import('../../../../../ingest/recompute')
  const url = new URL(request.url)
  const from = Math.max(0, Number(url.searchParams.get('from')) || 0)
  const hop = Math.max(0, Number(url.searchParams.get('hop')) || 0)
  const day = Number(url.searchParams.get('day')) || undefined

  const work = async () => {
    const r = await recomputeAll({ budgetMs: BUDGET_MS, from, day })
    if (r.skipped > 0 && hop < MAX_HOPS) {
      const next = new URL(request.url)
      next.searchParams.set('from', String(r.nextFrom))
      next.searchParams.set('hop', String(hop + 1))
      next.searchParams.set('day', String(r.day))
      // Answers at once (hop >= 1 returns before working), so this await is short.
      await fetch(next, { headers: { authorization: request.headers.get('authorization') ?? '' } }).catch((e) => console.error('recompute: follow-up failed to start', e))
    } else if (r.skipped > 0) {
      console.error(`recompute: ${r.skipped} profiles still not rescored after ${MAX_HOPS} follow-up runs`)
    }
    return r
  }

  // A follow-up run answers immediately and works after the response; the first run answers with the result.
  if (hop > 0) {
    after(async () => { try { await work() } catch (e) { console.error('recompute follow-up failed', e) } })
    return { accepted: true, from, hop }
  }
  return work()
})
