import { describe, it, expect } from 'vitest'
import {
  EMPTY_NUDGE_STATE, MAX_SNOOZES, QUIET_MS, afterDone, afterReplay, afterShown, afterSnooze, chooseNudge, parseNudgeState,
  type NudgeSpec,
} from '../nudges'

const NOW = Date.parse('2026-10-08T10:00:00Z')
const H = 3_600_000
const tour: NudgeSpec = { id: 'tour:feed', priority: 1, paths: /^\/today/ }
const tip: NudgeSpec = { id: 'tip:ext', priority: 2, paths: /^\/(today|applications)/ }
const onlyTracker: NudgeSpec = { id: 'tip:tracker', priority: 0, paths: /^\/applications/ }
const SPECS = [tip, tour, onlyTracker]

describe('chooseNudge', () => {
  it('shows nothing where nothing is registered for the page', () => {
    expect(chooseNudge(SPECS, EMPTY_NUDGE_STATE, NOW, '/profile')).toBeNull()
  })

  it('ONE at a time: of several eligible, the highest priority only', () => {
    expect(chooseNudge(SPECS, EMPTY_NUDGE_STATE, NOW, '/today')?.id).toBe('tour:feed') // not the tip, though both fit
  })

  it('a page-specific nudge is only for its own pages', () => {
    expect(chooseNudge(SPECS, EMPTY_NUDGE_STATE, NOW, '/today')?.id).not.toBe('tip:tracker')
    expect(chooseNudge(SPECS, EMPTY_NUDGE_STATE, NOW, '/applications')?.id).toBe('tip:tracker')
  })

  it('the first ever nudge on a device is not delayed', () => {
    expect(chooseNudge([tour], EMPTY_NUDGE_STATE, NOW, '/today')).toBe(tour)
  })

  it('a quiet period follows any nudge: a second one never shows the same day', () => {
    const s = afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW)
    expect(chooseNudge([tip], s, NOW + 1 * H, '/today')).toBeNull()
    expect(chooseNudge([tip], s, NOW + QUIET_MS - 1, '/today')).toBeNull()
    expect(chooseNudge([tip], s, NOW + QUIET_MS, '/today')).toBe(tip)
  })

  it('two nudges never show together, whatever the order they are asked in', () => {
    // The acceptance for the task: after one is on screen, asking again returns nothing.
    const s = afterShown(EMPTY_NUDGE_STATE, chooseNudge(SPECS, EMPTY_NUDGE_STATE, NOW, '/today')!.id, NOW)
    for (const minutes of [0, 1, 30, 120, 600]) expect(chooseNudge(SPECS, s, NOW + minutes * 60_000, '/today')).toBeNull()
  })

  it('done is done: a finished nudge never comes back by itself, even after the quiet period', () => {
    const s = afterDone(afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW), 'tour:feed', NOW)
    expect(chooseNudge([tour], s, NOW + 400 * 24 * H, '/today')).toBeNull()
  })

  it('a finished nudge does not block a different one once the quiet period is over', () => {
    const s = afterDone(afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW), 'tour:feed', NOW)
    expect(chooseNudge([tour, tip], s, NOW + QUIET_MS + 1, '/today')).toBe(tip)
  })

  it('an unfinished nudge is not repeated within the quiet period, and returns after it', () => {
    const s = afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW)
    expect(chooseNudge([tour], s, NOW + 5 * H, '/today')).toBeNull()
    expect(chooseNudge([tour], s, NOW + 13 * H, '/today')).toBe(tour)
  })
})

describe('"Not now"', () => {
  it('pauses that nudge for a day — and only that one', () => {
    let s = afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW)
    s = afterSnooze(s, tour, NOW)
    expect(chooseNudge([tour], s, NOW + 13 * H, '/today')).toBeNull() // quiet period over, snooze not
    expect(chooseNudge([tour], s, NOW + 25 * H, '/today')).toBe(tour)
  })
  it('honours a nudge\'s own pause length', () => {
    const quick: NudgeSpec = { ...tour, snoozeHours: 13 }
    const s = afterSnooze(afterShown(EMPTY_NUDGE_STATE, quick.id, NOW), quick, NOW)
    expect(chooseNudge([quick], s, NOW + 14 * H, '/today')).toBe(quick)
  })
  it(`after ${MAX_SNOOZES} "not now"s the third is a "no": asking three times is nagging`, () => {
    let s = EMPTY_NUDGE_STATE
    let t = NOW
    for (let i = 0; i < MAX_SNOOZES; i++) {
      s = afterSnooze(afterShown(s, tour.id, t), tour, t)
      t += 30 * H
      expect(chooseNudge([tour], s, t, '/today')).toBe(tour)
    }
    s = afterSnooze(afterShown(s, tour.id, t), tour, t)
    expect(chooseNudge([tour], s, t + 1000 * H, '/today')).toBeNull()
  })
})

describe('replay', () => {
  it('a candidate who asks to see it again sees it at once, even after finishing and inside the quiet period', () => {
    let s = afterDone(afterShown(EMPTY_NUDGE_STATE, 'tour:feed', NOW), 'tour:feed', NOW)
    s = afterReplay(s, 'tour:feed')
    expect(chooseNudge([tour], s, NOW + 1000, '/today')).toBe(tour)
  })
  it('replaying one nudge does not resurrect another', () => {
    let s = afterDone(afterDone(EMPTY_NUDGE_STATE, 'tour:feed', NOW), 'tip:ext', NOW)
    s = afterReplay(s, 'tour:feed')
    expect(s.done['tip:ext']).toBe(NOW)
    expect(s.done['tour:feed']).toBeUndefined()
  })
})

describe('parseNudgeState — storage is untrusted', () => {
  it('round-trips a valid state', () => {
    const s = afterSnooze(afterShown(EMPTY_NUDGE_STATE, 'a', NOW), { ...tour, id: 'a' }, NOW)
    expect(parseNudgeState(JSON.stringify(s))).toEqual(s)
  })
  it.each([null, '', 'not json', '[]', '{"v":2}', '{"v":1,"shown":"x","done":[],"lastShownAt":"soon"}'])('%j becomes a fresh state, not an error', (raw) => {
    expect(parseNudgeState(raw as string | null)).toEqual(EMPTY_NUDGE_STATE)
  })
  it('keeps the good fields of a half-corrupt state and drops the bad ones', () => {
    const p = parseNudgeState(JSON.stringify({ v: 1, shown: { a: 5, b: 'x' }, done: { c: 7 }, snoozedUntil: null, snoozes: {}, lastShownAt: NaN }))
    expect(p.shown).toEqual({ a: 5 })
    expect(p.done).toEqual({ c: 7 })
    expect(p.lastShownAt).toBeNull()
  })
})
