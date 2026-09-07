import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scorePastedJd } from '../jd-match'
import { MAX_JD_CHARS, MAX_RESUME_CHARS } from '@/lib/jd-match'
import { __resetRateLimits } from '@/lib/rate-limit'

/**
 * The action reads the caller's address to key its rate limit, and `headers()`
 * only exists inside a request. Mocking it is the whole reason this file needs
 * a mock at all — everything else here runs against the real modules.
 *
 * `callerIp` is mutable so a test can prove two callers get separate buckets.
 */
let callerIp = '203.0.113.1'
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': callerIp }),
}))

/**
 * TASK-060 step 2 — the action's validation boundary.
 *
 * This is the security-relevant half of the file. The action itself is a thin
 * delegate (src/lib/__tests__/jd-match.test.ts covers the scoring), but it is
 * PUBLIC and UNAUTHENTICATED and can call a paid model, so the input caps are
 * the only thing bounding the cost of a single call. They are tested rather
 * than trusted.
 */

const JD = `Senior Product Manager

Razorpay is hiring a Senior Product Manager for our payments platform team.

Requirements:
- 5+ years of product management experience, ideally in fintech or payments
- Strong SQL and data analysis skills
- An MBA is a plus but not required`

const RESUME = `Priya Iyer
Bengaluru, Karnataka, India
Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments funnel. Ran A/B tests on onboarding.
Wrote SQL against the warehouse for weekly activation reporting.`

beforeEach(() => {
  delete process.env.GROQ_API_KEY
  delete process.env.GEMINI_API_KEY
  __resetRateLimits()
  callerIp = '203.0.113.1'
})

describe('scorePastedJd — happy path', () => {
  it('scores a valid pair and returns the breakdown', async () => {
    const res = await scorePastedJd({ jdText: JD, resumeText: RESUME, jdLocation: 'Bengaluru, India' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.breakdown.total).toBeGreaterThan(0)
    expect(res.requirements.length).toBeGreaterThan(0)
  })
})

describe('scorePastedJd — input is bounded', () => {
  it('rejects a JD over the cost ceiling', async () => {
    const res = await scorePastedJd({ jdText: 'x'.repeat(MAX_JD_CHARS + 1), resumeText: RESUME })
    expect(res).toEqual({ ok: false, error: expect.stringMatching(/longer than we can read/i) })
  })

  it('rejects a résumé over the cost ceiling', async () => {
    const res = await scorePastedJd({ jdText: JD, resumeText: 'x'.repeat(MAX_RESUME_CHARS + 1) })
    expect(res).toEqual({ ok: false, error: expect.stringMatching(/longer than we can read/i) })
  })

  it('accepts input exactly at the ceiling', async () => {
    const padded = JD + '\n' + 'a '.repeat((MAX_JD_CHARS - JD.length - 1) / 2)
    expect(padded.trim().length).toBeLessThanOrEqual(MAX_JD_CHARS)
    const res = await scorePastedJd({ jdText: padded, resumeText: RESUME })
    expect(res.ok).toBe(true)
  })
})

describe('scorePastedJd — never throws across the boundary', () => {
  it('returns a candidate-facing error for input that is too short', async () => {
    const res = await scorePastedJd({ jdText: 'PM role', resumeText: RESUME })
    expect(res).toEqual({ ok: false, error: expect.stringMatching(/too short to read/i) })
  })

  it('rejects the wrong types rather than crashing', async () => {
    // Reachable in practice: a Server Action is a public endpoint and anything
    // can POST to it, so the payload is not guaranteed to come from our form.
    const res = await scorePastedJd({
      jdText: null,
      resumeText: 123,
    } as unknown as Parameters<typeof scorePastedJd>[0])
    expect(res.ok).toBe(false)
  })

  it('rejects an out-of-range yearsExperience instead of scoring against it', async () => {
    const res = await scorePastedJd({ jdText: JD, resumeText: RESUME, yearsExperience: 999 })
    expect(res.ok).toBe(false)
  })

  it('passes a valid yearsExperience through to the score', async () => {
    const low = await scorePastedJd({ jdText: JD, resumeText: RESUME, yearsExperience: 1 })
    const high = await scorePastedJd({ jdText: JD, resumeText: RESUME, yearsExperience: 8 })
    expect(low.ok && high.ok).toBe(true)
    if (!low.ok || !high.ok) return
    expect(low.profile.yearsExperience).toBe(1)
    expect(high.profile.yearsExperience).toBe(8)
    expect(high.breakdown.total).toBeGreaterThan(low.breakdown.total)
  })
})

describe('scorePastedJd — reaches no database', () => {
  it('scores with no Supabase environment configured', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    try {
      const res = await scorePastedJd({ jdText: JD, resumeText: RESUME })
      expect(res.ok).toBe(true)
    } finally {
      if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url
      if (anon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anon
    }
  })
})

/**
 * TASK-060 step 4 — the cost brake.
 *
 * This is the other security-relevant half of the file. The action is public,
 * unauthenticated and can call a paid model, so the NUMBER of calls is bounded
 * as deliberately as the size of each one.
 */
describe('scorePastedJd — the number of calls is bounded', () => {
  const call = () => scorePastedJd({ jdText: JD, resumeText: RESUME })

  it('refuses an eleventh call from one caller, and says when to return', async () => {
    for (let i = 0; i < 10; i++) expect((await call()).ok).toBe(true)

    const refused = await call()
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.error).toMatch(/try again in/i)
    // The refusal must not imply anything was kept — this surface stores
    // nothing, and a limit message is exactly where a reader would assume
    // otherwise.
    expect(refused.error).toMatch(/nothing you pasted was stored/i)
  })

  it('brakes one caller without touching another', async () => {
    for (let i = 0; i < 10; i++) await call()
    expect((await call()).ok).toBe(false)

    callerIp = '198.51.100.7'
    expect((await call()).ok).toBe(true)
  })

  it('brakes malformed input too, so a flood of junk is not free', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await scorePastedJd({ jdText: 'no', resumeText: 'no' })
      expect(res.ok).toBe(false)
    }
    const res = await scorePastedJd({ jdText: 'no', resumeText: 'no' })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/try again in/i)
  })
})
