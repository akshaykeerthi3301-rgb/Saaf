/**
 * Feature flags and experiments (F-1108, TASK-200). Pure.
 *
 * A candidate is put in a variant by a hash of WHO they are and WHICH experiment it is,
 * so the same person always sees the same variant, different experiments are independent
 * of each other, and nothing is stored to remember it. Where they were exposed is logged
 * (client side, through the existing analytics queue) so a result can be read against who
 * actually saw what.
 *
 * ⚠️ NO EXPERIMENT IS RUNNING. `EXPERIMENTS` is empty on purpose: the platform exists so
 * the first one is a matter of adding a line, but a flag that changes what a candidate
 * sees needs a reason and an end date, and the founder has not asked for one. Anything
 * unknown, disabled, or switched off by `EXPERIMENTS_OFF=1` gets the control — the
 * product the candidate had yesterday — never a half-assigned variant.
 */
export type Experiment = {
  id: string
  /** One sentence: what is being tested and what would count as a win. */
  description: string
  /** The first is the control. */
  variants: readonly [string, ...string[]]
  /** Share of people per variant, same order; omitted = even split. Must sum to 100. */
  weights?: readonly number[]
  enabled: boolean
  /** An end date, ISO. Past it the experiment reads as off. */
  endsOn?: string
}

export const EXPERIMENTS: readonly Experiment[] = []

/** FNV-1a, 32 bit — small, stable across runtimes (unlike Math.random or Map order), and uniform enough for a split. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Where this subject falls in [0, 1) for this experiment. Stable; independent across experiments. */
export function bucket(subject: string, experimentId: string): number {
  return fnv1a(`${experimentId}:${subject}`) / 0x1_0000_0000
}

export function isLive(e: Experiment, now: Date = new Date(), off: boolean = process.env.EXPERIMENTS_OFF === '1'): boolean {
  if (off || !e.enabled) return false
  if (e.endsOn) { const t = Date.parse(e.endsOn); if (Number.isFinite(t) && now.getTime() > t) return false }
  return true
}

/** The variant for a subject. The control for anyone who is not cleanly in one. */
export function assign(subject: string, e: Experiment, now: Date = new Date(), off?: boolean): string {
  const control = e.variants[0]
  if (!subject || !isLive(e, now, off)) return control
  const w = e.weights && e.weights.length === e.variants.length && Math.abs(e.weights.reduce((a, b) => a + b, 0) - 100) < 1e-9 && e.weights.every((x) => x >= 0)
    ? e.weights
    : e.variants.map(() => 100 / e.variants.length)
  let at = bucket(subject, e.id) * 100
  for (let i = 0; i < e.variants.length; i++) { at -= w[i]; if (at < 0) return e.variants[i] }
  return control
}

/** Look an experiment up by id and assign. Null when there is no such experiment — callers treat that as "no flag". */
export function variantFor(subject: string, id: string, registry: readonly Experiment[] = EXPERIMENTS, now?: Date, off?: boolean): string | null {
  const e = registry.find((x) => x.id === id)
  return e ? assign(subject, e, now, off) : null
}
