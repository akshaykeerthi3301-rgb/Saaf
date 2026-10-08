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
/** Profiles rescored at once. Scoring a person now reads up to 3,000 roles (MAX_ROLES_PER_CANDIDATE), so two at a time (three at once hit the database's statement timeout, measured 2026-10-08). */
const CONCURRENCY = 2

/**
 * @param opts.budgetMs stop STARTING new profiles after this many ms. The cron route has a 60 s ceiling and one
 *   profile can take 5-8 s now (measured 2026-10-08: 0.4-7.4 s across 9 profiles), so the run must degrade into a
 *   partial night, loudly, rather than be killed mid-write. The CLI passes nothing and sweeps everyone.
 *   The start point rotates by day, so when a night is cut short it is not always the same people left waiting.
 */
export async function recomputeAll(opts: { budgetMs?: number } = {}): Promise<{ rescored: number; skipped: number; failed: number }> {
  const db = createServiceClient()

  // Paged. PostgREST caps a response at 1,000 rows and does not say so, so the
  // unbounded select silently stopped rescoring at the thousandth confirmed
  // profile — user 1,001 onward would have a shortlist that quietly never
  // updated again. `.order('id')` gives the total order paging needs.
  const profiles = await pageAll<{ id: string }>((from, to) =>
    db.from('profiles').select('id').not('confirmed_at', 'is', null).order('id').range(from, to)
  )
  if (!profiles.length) { console.log('  recompute: no confirmed profiles'); return { rescored: 0, skipped: 0, failed: 0 } }

  const start = Math.floor(Date.now() / 86_400_000) % profiles.length
  const order = [...profiles.slice(start), ...profiles.slice(0, start)]
  const t0 = Date.now()
  let rescored = 0, failed = 0, skipped = 0
  const retry: { id: string }[] = []
  for (let i = 0; i < order.length; i += CONCURRENCY) {
    if (opts.budgetMs !== undefined && Date.now() - t0 > opts.budgetMs) {
      skipped = order.length - i
      console.warn(`  recompute: stopped at the ${opts.budgetMs} ms budget — ${skipped} of ${order.length} profiles NOT rescored tonight`)
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
  return { rescored, skipped, failed }
}
