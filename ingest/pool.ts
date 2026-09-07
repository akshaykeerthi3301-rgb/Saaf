/**
 * Bounded-concurrency map. No dependency; the pool is four lines.
 *
 * ⚠️ IT LIVES HERE RATHER THAN IN run.ts, ON PURPOSE. run.ts builds a Supabase
 * client at module scope, so importing it requires SUPABASE_SERVICE_ROLE_KEY to
 * be set. The harvest and qualification scripts touch no database at all;
 * making them load an env file to borrow four lines of concurrency control
 * would be a real coupling in exchange for nothing. run.ts re-exports this so
 * there is still exactly one definition.
 */
export async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) await worker(items[cursor++])
  })
  await Promise.all(runners)
}
