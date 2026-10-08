import { describe, it, expect } from 'vitest'
import { rewriteFailure } from '../resume-rewrite'
import type { CandidateFacts, RoleFacts } from '../tailor'

/**
 * The guard is the whole feature, so it is tested without a model in the loop.
 *
 * Two failure directions matter and they pull against each other: a guard that
 * is too tight destroys every quantified bullet — the most valuable lines on a
 * résumé — and a guard that is too loose puts a number the candidate cannot
 * defend into a document with their name on it. Every test below pins one side
 * or the other.
 */

const ME: CandidateFacts = {
  currentTitle: 'Product Analyst',
  employer: 'Zeta',
  yearsExperience: 3,
  skills: ['SQL', 'Python', 'Experimentation'],
  domain: 'fintech',
  credential: null,
}

const ROLE: RoleFacts = {
  title: 'Senior Product Analyst',
  company: 'Razorpay',
  description: 'Own reporting and experimentation for the payments funnel. SQL required.',
}

describe('a figure the candidate actually wrote', () => {
  it('survives the rewrite — this is the case the shared guard gets wrong', () => {
    const original = 'Ran A/B tests on onboarding that lifted completion by 14% across 40,000 merchants'
    const next = 'Lifted onboarding completion 14% across 40,000 merchants through A/B testing'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('survives when the number is written differently', () => {
    const original = 'Cut review time from 3 days to 8 hours for 40,000 merchants'
    const next = 'Cut review time from 3 days to 8 hours across 40000 merchants'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('survives a rounded figure', () => {
    const original = 'Improved activation by 14.2% over two quarters'
    const next = 'Improved activation 14% over two quarters'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })
})

describe('a figure the model introduced', () => {
  it('is refused, naming the number', () => {
    const original = 'Ran A/B tests on the onboarding flow'
    const next = 'Ran A/B tests on onboarding, lifting completion by 30%'
    const fail = rewriteFailure(next, original, ME, ROLE)
    expect(fail).toContain('30')
    expect(fail).toMatch(/not in your own line/)
  })

  it('is refused even when the figure came from the job description', () => {
    // The posting asking for 5 years is not evidence the candidate has 5 years.
    const original = 'Owned the reporting stack'
    const next = 'Owned the reporting stack across 5 years of payments work'
    expect(rewriteFailure(next, original, ME, ROLE)).not.toBeNull()
  })
})

describe('the rules the shared guard still enforces', () => {
  it('refuses an employer the candidate never worked for', () => {
    const original = 'Built the retention report for the growth team'
    const next = 'Built the retention report for the growth team at Flipkart'
    expect(rewriteFailure(next, original, ME, ROLE)).toMatch(/Flipkart/)
  })

  it('allows the company being applied to, which is not a claim about the candidate', () => {
    const original = 'Built reporting for the payments funnel'
    const next = 'Built reporting for the payments funnel, the same surface Razorpay is hiring for'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('refuses a credential the candidate does not hold', () => {
    const original = 'Led the monthly close with the finance team'
    const next = 'Led the monthly close with the finance team as a CFA charterholder'
    expect(rewriteFailure(next, original, ME, ROLE)).toMatch(/CFA/)
  })

  it('refuses more years than the candidate has', () => {
    const original = 'Worked across analytics and reporting'
    const next = 'Brought 9 years of analytics and reporting experience'
    expect(rewriteFailure(next, original, ME, ROLE)).not.toBeNull()
  })
})

describe('shape', () => {
  it('refuses a line too short to be a rewrite', () => {
    expect(rewriteFailure('Did work', 'Built the retention report', ME, ROLE)).toMatch(/too short/)
  })

  it('refuses a line longer than a résumé line', () => {
    const long = 'Built the retention report '.repeat(20)
    expect(rewriteFailure(long, long, ME, ROLE)).toMatch(/longer/)
  })
})

/**
 * The candidate's own words, handed back to them.
 *
 * Both cases below were REAL refusals, measured against a live rewrite on
 * 2026-09-08 before ownVocabulary() existed: the guard rejected "API" and
 * "European" as foreign employers, when both were sitting in the very line
 * being rewritten.
 */
describe('words already in the candidate’s own line', () => {
  it('does not treat a term from the original as a foreign employer', () => {
    const original = 'Cut p99 latency on the payouts API from 1400ms to 320ms by batching writes'
    const next = 'Reduced p99 latency on the payouts API from 1400ms to 320ms by batching writes'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('does not treat an adjective from the original as a company', () => {
    const original = 'Built REST services in Java for a European banking client serving 12 branches'
    const next = 'Delivered REST services in Java for a European banking client across 12 branches'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('still catches a company the model introduced into the same line', () => {
    const original = 'Built REST services in Java for a banking client serving 12 branches'
    const next = 'Built REST services in Java for HSBC, serving 12 branches'
    expect(rewriteFailure(next, original, ME, ROLE)).toMatch(/HSBC/)
  })
})

/**
 * Inflections. Seen live on production on 2026-09-08, and the reason shown to
 * the candidate was the problem rather than the outcome: the guard reported
 * `names "Owns", which is not on your profile` about a verb, because the
 * original said "owning" and the rewrite said "Owns".
 */
describe('a word the model re-inflected', () => {
  it('accepts a different tense of a word the candidate wrote', () => {
    const original = 'Comfortable owning a service end to end, from schema through rollout'
    const next = 'Owns services end to end, from schema design through rollout and support'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('accepts a plural of a word the candidate wrote', () => {
    const original = 'Built the retention report for the growth team'
    const next = 'Built retention reports for the growth team every week'
    expect(rewriteFailure(next, original, ME, ROLE)).toBeNull()
  })

  it('still catches a company at the start of a sentence', () => {
    // The obvious alternative fix — exempting sentence-initial words — would
    // have let this through, which is the fabrication the guard exists for.
    const original = 'Built reporting for the payments funnel. Ran the weekly review'
    const next = 'Built reporting for the payments funnel. Flipkart adopted the same model'
    expect(rewriteFailure(next, original, ME, ROLE)).toMatch(/Flipkart/)
  })
})

describe('length: a bullet is one line, a summary is a short paragraph', () => {
  const sentence = 'Analyst who owns reporting and experimentation for a payments funnel using SQL and Python. '
  const summary = `${sentence}${sentence}${sentence}`.trim() // ~270 chars, then pad past 320
  const long = `${summary} ${sentence}`.trim()

  it('refuses a 350-character bullet but keeps the same text as a summary', () => {
    expect(long.length).toBeGreaterThan(320)
    expect(long.length).toBeLessThan(600)
    expect(rewriteFailure(long, long, ME, ROLE)).toContain('longer than a résumé line')
    expect(rewriteFailure(long, long, ME, ROLE, 600)).toBeNull()
  })

  it('still refuses a summary past its own limit', () => {
    const huge = `${long} ${long}`
    expect(rewriteFailure(huge, huge, ME, ROLE, 600)).toContain('longer than a summary')
  })
})
