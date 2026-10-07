/**
 * The popup governor (TASK-185): one place decides which tour, tip or ask may appear,
 * so two never compete for the same moment and none nags.
 *
 * ⚠️ THE RULES ARE THE PRODUCT HERE, and each is one a candidate would feel:
 *   1. One at a time. `chooseNudge` returns a single nudge, never a list.
 *   2. Done is done. Finished or dismissed, a nudge never returns on its own.
 *   3. A quiet period after any nudge (12 hours): the second prompt of the day is
 *      the one people resent. The very first nudge on a device is not delayed.
 *   4. "Not now" is honoured: it comes back after its own pause, at most twice,
 *      then counts as a "no". Asking three times is nagging.
 *   5. Only on its own pages.
 *   6. If the device cannot remember (no storage), nothing is shown at all — a
 *      prompt we cannot stop repeating is worse than no prompt.
 *
 * Pure: the state goes in and comes out as a value; storage lives in
 * src/components/features/nudge-host.tsx. Every later nudge — install the
 * extension, a feedback ask, a survey — registers here instead of showing itself.
 */

export type NudgeSpec = {
  id: string
  /** Lower first. */
  priority: number
  /** Pages it may appear on. */
  paths: RegExp
  /**
   * `data-tour` anchors that must be on the page before it is shown. A tour that points
   * at things the page has not drawn yet counts its stops wrong — OBSERVED: it opened as
   * "1 of 1" because the feed was still streaming in. The host waits; it never decides.
   */
  requires?: string[]
  /** Pause after "Not now". Default 24 hours. */
  snoozeHours?: number
}

export type NudgeState = {
  v: 1
  /** id → when it was last put on screen. */
  shown: Record<string, number>
  /** id → finished or dismissed, when. */
  done: Record<string, number>
  /** id → do not show before. */
  snoozedUntil: Record<string, number>
  /** id → how many times "Not now" was pressed. */
  snoozes: Record<string, number>
  lastShownAt: number | null
}

export const QUIET_MS = 12 * 3_600_000
export const DEFAULT_SNOOZE_HOURS = 24
export const MAX_SNOOZES = 2

export const EMPTY_NUDGE_STATE: NudgeState = { v: 1, shown: {}, done: {}, snoozedUntil: {}, snoozes: {}, lastShownAt: null }

const numMap = (x: unknown): Record<string, number> =>
  x && typeof x === 'object' ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, v]) => typeof v === 'number' && Number.isFinite(v)) as [string, number][]) : {}

/** Whatever was stored, back into a valid state. Garbage in storage means a fresh start, not an error. */
export function parseNudgeState(raw: string | null): NudgeState {
  if (!raw) return { ...EMPTY_NUDGE_STATE }
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object' || o.v !== 1) return { ...EMPTY_NUDGE_STATE }
    return {
      v: 1,
      shown: numMap(o.shown), done: numMap(o.done), snoozedUntil: numMap(o.snoozedUntil), snoozes: numMap(o.snoozes),
      lastShownAt: typeof o.lastShownAt === 'number' && Number.isFinite(o.lastShownAt) ? o.lastShownAt : null,
    }
  } catch {
    return { ...EMPTY_NUDGE_STATE }
  }
}

/** The one nudge that may appear now on this page, or null. */
export function chooseNudge(specs: NudgeSpec[], state: NudgeState, now: number, path: string): NudgeSpec | null {
  if (state.lastShownAt !== null && now - state.lastShownAt < QUIET_MS) return null
  const open = specs
    .filter((s) => s.paths.test(path) && !state.done[s.id] && (state.snoozedUntil[s.id] ?? 0) <= now)
    .sort((a, b) => a.priority - b.priority)
  return open[0] ?? null
}

export const afterShown = (s: NudgeState, id: string, now: number): NudgeState => ({ ...s, shown: { ...s.shown, [id]: now }, lastShownAt: now })

/** Finished or dismissed: never again unless replayed. */
export const afterDone = (s: NudgeState, id: string, now: number): NudgeState => ({ ...s, done: { ...s.done, [id]: now } })

/** "Not now": back after the pause — and after MAX_SNOOZES it is a "no". */
export function afterSnooze(s: NudgeState, spec: NudgeSpec, now: number): NudgeState {
  const n = (s.snoozes[spec.id] ?? 0) + 1
  if (n > MAX_SNOOZES) return afterDone({ ...s, snoozes: { ...s.snoozes, [spec.id]: n } }, spec.id, now)
  return {
    ...s,
    snoozes: { ...s.snoozes, [spec.id]: n },
    snoozedUntil: { ...s.snoozedUntil, [spec.id]: now + (spec.snoozeHours ?? DEFAULT_SNOOZE_HOURS) * 3_600_000 },
  }
}

/** The candidate asked to see it again: forget that it was done, snoozed or recently shown. */
export function afterReplay(s: NudgeState, id: string): NudgeState {
  const drop = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id))
  return { ...s, done: drop(s.done), snoozedUntil: drop(s.snoozedUntil), snoozes: drop(s.snoozes), lastShownAt: null }
}
