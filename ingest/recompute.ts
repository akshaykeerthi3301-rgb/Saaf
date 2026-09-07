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
export async function recomputeAll(): Promise<void> {
  const db = createServiceClient()

  // Paged. PostgREST caps a response at 1,000 rows and does not say so, so the
  // unbounded select silently stopped rescoring at the thousandth confirmed
  // profile — user 1,001 onward would have a shortlist that quietly never
  // updated again. `.order('id')` gives the total order paging needs.
  const profiles = await pageAll<{ id: string }>((from, to) =>
    db.from('profiles').select('id').not('confirmed_at', 'is', null).order('id').range(from, to)
  )
  if (!profiles.length) { console.log('  recompute: no confirmed profiles'); return }

  for (const p of profiles) {
    const { written } = await evaluateUser(p.id)
    console.log(`  recomputed ${written} results for one profile`)
  }
}
