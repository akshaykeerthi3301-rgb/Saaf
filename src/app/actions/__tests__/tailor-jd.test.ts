import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tailorFromPastedJd } from '../tailor-jd'
import { __resetRateLimits } from '@/lib/rate-limit'

/**
 * headers() only exists inside a request, so it is mocked. Everything else runs
 * against the real modules.
 */
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))

const JD = `Senior Product Manager

Razorpay is hiring a Senior Product Manager for the payments platform team.

Requirements:
- 5+ years of product management experience, ideally in fintech
- Strong SQL and data analysis skills`

const RESUME = `Priya Iyer
Bengaluru, Karnataka, India

Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments funnel end to end. Ran A/B tests on onboarding.
Wrote SQL against the warehouse for weekly activation reporting.`

beforeEach(() => {
  delete process.env.GROQ_API_KEY
  delete process.env.GEMINI_API_KEY
  __resetRateLimits()
})

describe('tailorFromPastedJd — it refuses rather than tailoring badly', () => {
  it('will not draft when no model could read the résumé', async () => {
    /**
     * ⚠️ THE FAILURE THIS PREVENTS LOOKS LIKE A BUG IN THE GUARD. Skills come
     * only from the model; the deterministic parser does not read them. With no
     * provider, facts.skills is empty — but draftApplication receives the JOB
     * DESCRIPTION as role.description, so the model borrows terms from the
     * posting and writes them as the candidate's own. groundingFailure() then
     * strips exactly those, correctly, and the candidate is told
     * `names "SQL", which is not on your profile` about a résumé whose skills
     * section says SQL. Observed live on 2026-09-08.
     */
    const res = await tailorFromPastedJd({ jdText: JD, resumeText: RESUME })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/could not read your résumé/i)
    // It must say why rather than blaming the candidate's document.
    expect(res.error).toMatch(/rather than guess/i)
  })
})

describe('tailorFromPastedJd — input is bounded', () => {
  it('rejects a résumé that is too short to rewrite', async () => {
    const res = await tailorFromPastedJd({ jdText: JD, resumeText: 'Priya' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/too short/i)
  })

  it('rejects the wrong types rather than crashing', async () => {
    const res = await tailorFromPastedJd({
      jdText: null,
      resumeText: 42,
    } as unknown as Parameters<typeof tailorFromPastedJd>[0])
    expect(res.ok).toBe(false)
  })
})

describe('tailorFromPastedJd — the number of calls is bounded', () => {
  it('refuses a sixth call, and says when to come back', async () => {
    // Tighter than the scorer's ten because each call is twice the work — a
    // résumé read plus a draft.
    for (let i = 0; i < 5; i++) {
      await tailorFromPastedJd({ jdText: JD, resumeText: RESUME })
    }
    const refused = await tailorFromPastedJd({ jdText: JD, resumeText: RESUME })
    expect(refused.ok).toBe(false)
    if (refused.ok) return
    expect(refused.error).toMatch(/try again in/i)
    expect(refused.error).toMatch(/nothing you pasted was stored/i)
  })
})
