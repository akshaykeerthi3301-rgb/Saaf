import { createServiceClient } from '@/lib/supabase/service'
import { evaluateUser } from '@/lib/evaluate-user'
import { pageAll } from './paging'

/**
 * Re-evaluate every confirmed profile against the current role set.
 *
 * Delegates to evaluateUser() per profile rather than re-implementing its
 * pipeline — that used to be hand-duplicated here, which was two problems at
 * once: a fix applied to one copy silently didn't reach the other (it
 * happened once, commit 0c07f5c), and evaluateUser() fetches the profile
 * fresh at the moment it actually runs, which this loop's own upfront batch
 * fetch didn't. Under the old duplication, a user who edited and confirmed
 * their profile mid-run could have that edit's gate_results silently
 * reverted by this loop reaching them later with stale profile data and a
 * newer computed_at, sweeping the fresher, correct rows away.
 *
 * O(users × roles) inside evaluateUser, which is fine at MVP scale. Beyond
 * roughly 5,000 users this becomes incremental recompute against roles
 * changed since the last run.
 */
/**
 * Profiles rescored at once: ONE. The free database has two shared CPU cores and cancels any single statement that
 * runs past its timeout, so more at once only made each statement slower until some were cancelled (measured
 * 2026-10-08/09: three at once, then two, both lost profiles; one at a time with lighter queries lost none).
 */
const CONCURRENCY = 1

export type RecomputeResult = { rescored: number; skipped: number; failed: number; total: number; nextFrom: number; day: number }

/**
 * @param opts.budgetMs stop STARTING new profiles after this many ms, so the run ends cleanly instead of being killed
 *   mid-write. The CLI passes nothing and sweeps everyone.
 * @param opts.from where in tonight's order to start. A run that stops at its budget reports `nextFrom`, and the cron
 *   route starts a follow-up run there — so 20 people who need more than one 5-minute window are all rescored.
 * @param opts.day the UTC day number that fixes tonight's rotation, passed along so a follow-up run that crosses
 *   midnight still walks the same order. The start point rotates by day, so a night that is cut short is not always
 *   the same people left waiting.
 */
export async function recomputeAll(opts: { budgetMs?: number; from?: number; day?: number } = {}): Promise<RecomputeResult> {
  const db = createServiceClient()

  // Paged. PostgREST caps a response at 1,000 rows and does not say so, so the
  // unbounded select silently stopped rescoring at the thousandth confirmed
  // profile — user 1,001 onward would have a shortlist that quietly never
  // updated again. `.order('id')` gives the total order paging needs.
  const profiles = await pageAll<{ id: string }>((from, to) =>
    db.from('profiles').select('id').not('confirmed_at', 'is', null).order('id').range(from, to)
  )
  const day = opts.day ?? Math.floor(Date.now() / 86_400_000)
  if (!profiles.length) { console.log('  recompute: no confirmed profiles'); return { rescored: 0, skipped: 0, failed: 0, total: 0, nextFrom: 0, day } }

  const start = day % profiles.length
  const order = [...profiles.slice(start), ...profiles.slice(0, start)]
  const from = Math.min(Math.max(0, opts.from ?? 0), order.length)
  const t0 = Date.now()
  let rescored = 0, failed = 0, skipped = 0, nextFrom = order.length
  const retry: { id: string }[] = []
  for (let i = from; i < order.length; i += CONCURRENCY) {
    if (opts.budgetMs !== undefined && Date.now() - t0 > opts.budgetMs) {
      skipped = order.length - i
      nextFrom = i
      console.warn(`  recompute: stopped at the ${opts.budgetMs} ms budget — ${skipped} of ${order.length} profiles still to rescore, from position ${i}`)
      break
    }
    await Promise.all(order.slice(i, i + CONCURRENCY).map(async (p) => {
      try {
        const { written } = await evaluateUser(p.id)
        rescored++
        console.log(`  recomputed ${written} results for one profile`)
      } catch (e) {
        retry.push(p)
        console.error('  recompute failed for one profile (the others continue, one retry follows):', (e as Error).message)
      }
    }))
  }
  // One sequential retry for anything that failed under load, while the budget lasts.
  for (const p of retry) {
    if (opts.budgetMs !== undefined && Date.now() - t0 > opts.budgetMs) { failed++; continue }
    try { const { written } = await evaluateUser(p.id); rescored++; console.log(`  recomputed ${written} results for one profile (retry)`) }
    catch (e) { failed++; console.error('  recompute failed again for one profile:', (e as Error).message) }
  }
  return { rescored, skipped, failed, total: order.length, nextFrom, day }
}
