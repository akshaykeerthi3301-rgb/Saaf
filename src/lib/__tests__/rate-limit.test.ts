import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, __resetRateLimits } from '../rate-limit'

/**
 * The limiter is a cost brake on a public, unauthenticated surface that can
 * call a paid model, so its arithmetic is tested rather than trusted. Time is
 * injected rather than mocked — every assertion below is deterministic.
 */

const OPTS = { limit: 3, windowMs: 60_000 }

beforeEach(() => __resetRateLimits())

describe('checkRateLimit', () => {
  it('permits calls up to the limit and reports what is left', () => {
    expect(checkRateLimit('a', OPTS, 1_000)).toEqual({ ok: true, remaining: 2 })
    expect(checkRateLimit('a', OPTS, 2_000)).toEqual({ ok: true, remaining: 1 })
    expect(checkRateLimit('a', OPTS, 3_000)).toEqual({ ok: true, remaining: 0 })
  })

  it('refuses the call after the limit, with a retry time', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, 1_000)
    const res = checkRateLimit('a', OPTS, 1_000)
    expect(res.ok).toBe(false)
    if (res.ok) return
    // Oldest hit at 1_000 expires at 61_000, i.e. 60s from now.
    expect(res.retryAfterSeconds).toBe(60)
  })

  it('keys are independent — one caller cannot exhaust another', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, 1_000)
    expect(checkRateLimit('a', OPTS, 1_000).ok).toBe(false)
    expect(checkRateLimit('b', OPTS, 1_000).ok).toBe(true)
  })

  it('lets the window slide — an expired hit frees a slot', () => {
    checkRateLimit('a', OPTS, 1_000)
    checkRateLimit('a', OPTS, 2_000)
    checkRateLimit('a', OPTS, 3_000)
    expect(checkRateLimit('a', OPTS, 4_000).ok).toBe(false)

    // 61_001 is past the expiry of the 1_000 hit but not of the other two.
    expect(checkRateLimit('a', OPTS, 61_001)).toEqual({ ok: true, remaining: 0 })
    expect(checkRateLimit('a', OPTS, 61_002).ok).toBe(false)
  })

  it('does not record a refused call, so a loop cannot inflate its own window', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, 1_000)
    // Hammered 500 times while refused. If refusals were counted, the stored
    // window would hold 503 timestamps and the caller would push its own
    // lockout forward indefinitely — a memory amplifier inside the brake.
    for (let i = 0; i < 500; i++) expect(checkRateLimit('a', OPTS, 30_000).ok).toBe(false)
    // The three real hits still expire on their own schedule.
    expect(checkRateLimit('a', OPTS, 61_001).ok).toBe(true)
  })

  it('never returns a retry time below one second', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('a', OPTS, 1_000)
    const res = checkRateLimit('a', OPTS, 60_999)
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.retryAfterSeconds).toBe(1)
  })
})
