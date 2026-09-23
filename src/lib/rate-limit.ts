/**
 * A bounded, in-memory sliding-window limiter. TASK-060 step 4.
 *
 * ⚠️ READ THIS BEFORE TRUSTING IT. This limiter lives in the memory of ONE
 * server instance. On a serverless deployment there are N instances, so the
 * effective ceiling is N × `limit`, and an instance that scales to zero forgets
 * everything it knew. It is therefore a COST BRAKE, not a security control:
 * it stops one caller hammering one instance in a loop, which is the realistic
 * abuse of a public scoring tool, and it does not stop a distributed attack.
 *
 * It is here rather than a Redis limiter because the alternative was shipping
 * `src/app/actions/jd-match.ts` with no bound at all — its own header calls
 * that a ship-blocker — and because this repo has no Redis, no KV and no
 * limiter table. WHEN THAT CHANGES: swap the Map for the shared store and keep
 * this signature; every caller already treats the result as advisory.
 *
 * Nothing here is persisted and nothing is logged. The key is hashed by the
 * caller where it derives from an IP, so this module never holds an address.
 */

type Window = {
  /** Epoch ms of each call still inside the window, oldest first. */
  hits: number[]
}

export type RateLimitOptions = {
  /**
   * Which allowance this is — required, and folded into the key.
   *
   * ⚠️ WITHOUT IT, FEATURES SPENT EACH OTHER'S ALLOWANCE. Until 2026-09-23
   * every limited action keyed on the same hashed IP in this one Map, so all
   * their hits pooled: upload + check + "Count them" is three calls, and the
   * résumé rewrite — limit 3 — refused its first attempt. Each limit was
   * sized for its own feature; the store never kept them apart. Required
   * rather than optional so a new caller cannot reintroduce the pooling.
   */
  scope: string
  /** Calls permitted inside one window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number }

/**
 * Distinct keys held at once. A Map that grows with every unique caller is a
 * memory leak wearing a limiter's clothes, so the oldest entries are dropped
 * once the map passes this size. Dropping an entry FORGIVES that caller, which
 * is the safe direction to fail for a cost brake — the alternative is evicting
 * a legitimate user into a denial.
 */
const MAX_KEYS = 10_000

const windows = new Map<string, Window>()

/** Exported for tests only. Nothing in the app should need to reset state. */
export function __resetRateLimits(): void {
  windows.clear()
}

/**
 * Record one call against `key` and say whether it is permitted.
 *
 * ⚠️ A REFUSED CALL IS NOT RECORDED, and that is deliberate. Counting refusals
 * would let a caller in a tight loop grow its own stored array without bound —
 * the limiter would become the memory amplifier it exists to prevent. Refusing
 * is also free in the way that matters: the model call never happens, so a
 * rejected loop costs CPU rather than money.
 */
export function checkRateLimit(
  caller: string,
  { scope, limit, windowMs }: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const cutoff = now - windowMs
  const key = `${scope}:${caller}`

  const existing = windows.get(key)
  const hits = (existing?.hits ?? []).filter((t) => t > cutoff)

  if (hits.length >= limit) {
    // The oldest hit in the window is the one whose expiry frees a slot.
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000))
    windows.set(key, { hits })
    return { ok: false, retryAfterSeconds }
  }

  hits.push(now)
  windows.set(key, { hits })

  if (windows.size > MAX_KEYS) evictOldest(cutoff)

  return { ok: true, remaining: limit - hits.length }
}

/**
 * Drop entries whose every hit has expired, then — if that was not enough —
 * the least recently active, until the map is back under the cap.
 */
function evictOldest(cutoff: number): void {
  for (const [k, w] of windows) {
    if (w.hits.length === 0 || w.hits[w.hits.length - 1] <= cutoff) windows.delete(k)
  }
  if (windows.size <= MAX_KEYS) return

  const byRecency = [...windows.entries()].sort(
    (a, b) => (a[1].hits[a[1].hits.length - 1] ?? 0) - (b[1].hits[b[1].hits.length - 1] ?? 0),
  )
  for (const [k] of byRecency.slice(0, windows.size - MAX_KEYS)) windows.delete(k)
}
