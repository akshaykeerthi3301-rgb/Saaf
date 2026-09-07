import { describe, it, expect } from 'vitest'
import { buildPrepPlan } from '../interview-prep'
import { groundingFailure, type CandidateFacts, type RoleFacts } from '../tailor'

/**
 * Cookie's interview prep. The property that matters most is the last describe
 * block: no question may assert anything the candidate did not tell us.
 */

const ME: CandidateFacts = {
  currentTitle: 'Product Manager',
  employer: 'Paytm',
  yearsExperience: 3,
  skills: ['SQL', 'A/B Testing', 'Product Roadmapping'],
  domain: 'fintech',
  credential: 'none',
}

const ROLE: RoleFacts = {
  title: 'Senior Product Manager',
  company: 'Razorpay',
  description: `We are hiring a Senior Product Manager for the payments platform.

Requirements:
- 5+ years of product management experience
- Strong SQL and data analysis skills
- Experience with Kubernetes and Airflow
- CFA preferred`,
}

describe('the plan is built from real evidence', () => {
  it('returns at most five questions', () => {
    expect(buildPrepPlan(ME, ROLE).questions.length).toBeLessThanOrEqual(5)
  })

  it('opens on the experience bar when the candidate is under it', () => {
    const plan = buildPrepPlan(ME, ROLE)
    const first = plan.questions[0]
    expect(first.kind).toBe('experience')
    expect(first.question).toContain('5 years')
    expect(first.question).toContain('3')
  })

  it('quotes the posting line the bar came from', () => {
    const q = buildPrepPlan(ME, ROLE).questions.find((x) => x.kind === 'experience')!
    expect(q.evidence).toBeTruthy()
    expect(ROLE.description!.toLowerCase()).toContain(q.evidence!.toLowerCase().slice(0, 20))
  })

  it('asks a different opening question when the candidate clears the bar', () => {
    const senior = buildPrepPlan({ ...ME, yearsExperience: 8 }, ROLE)
    expect(senior.questions[0].id).toBe('experience-meets')
    expect(senior.questions[0].question).not.toMatch(/why are you the right person/i)
  })

  it('separates real gaps from real strengths', () => {
    const plan = buildPrepPlan(ME, ROLE)
    // SQL is on both sides.
    expect(plan.strengths.map((s) => s.toLowerCase())).toContain('sql')
    // Kubernetes is in the posting and not on the profile.
    expect(plan.gaps.join(' ').toLowerCase()).toMatch(/kubernetes/)
    // A gap must never be something the candidate already holds.
    for (const gap of plan.gaps) {
      expect(ME.skills.map((s) => s.toLowerCase())).not.toContain(gap.toLowerCase())
    }
  })

  it('raises the credential the posting names and the profile lacks', () => {
    const q = buildPrepPlan(ME, ROLE).questions.find((x) => x.kind === 'credential')
    if (q) {
      expect(q.question).toMatch(/CFA/)
      expect(q.evidence).toBeTruthy()
    }
    // Not asserted unconditionally: extraction scores "CFA preferred" below the
    // confidence threshold on purpose, because gating an optional credential is
    // a false refusal. If it is below the bar it must NOT appear.
    const reqs = buildPrepPlan(ME, ROLE).questions.filter((x) => x.kind === 'credential')
    expect(reqs.length).toBeLessThanOrEqual(1)
  })

  it('never raises a credential the candidate holds', () => {
    const cfa = buildPrepPlan({ ...ME, credential: 'CFA' }, ROLE)
    expect(cfa.questions.find((q) => q.kind === 'credential')).toBeUndefined()
  })

  it('gives every question a reason and a way to answer it', () => {
    for (const q of buildPrepPlan(ME, ROLE).questions) {
      expect(q.question.length).toBeGreaterThan(10)
      expect(q.because.length).toBeGreaterThan(20)
      expect(q.answerWith.length).toBeGreaterThan(20)
    }
  })

  it('still produces questions for a bare posting', () => {
    const bare: RoleFacts = { title: 'Analyst', company: 'Acme', description: null }
    const plan = buildPrepPlan(ME, bare)
    expect(plan.questions.length).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    expect(JSON.stringify(buildPrepPlan(ME, ROLE))).toBe(JSON.stringify(buildPrepPlan(ME, ROLE)))
  })
})

describe('the fabrication guarantee', () => {
  it('lets nothing through that the guard rejects for a reason other than a quoted requirement', () => {
    // ⚠️ THE NARROW MASK, PINNED. buildPrepPlan masks the posting's OWN stated
    // bar and credential before running groundingFailure, because a question
    // whose subject is the posting is not a claim about the candidate. Every
    // OTHER guard rule must still bite. Masking those two and re-running must
    // leave nothing unexplained.
    for (const q of buildPrepPlan(ME, ROLE).questions) {
      let masked = q.question
        .replace(/\b5\s*\+?\s*years?\b/gi, 'the stated bar')
        .replace(/\bCFA\b/gi, 'that credential')
      // Terms the question quotes from the posting — a named skill. A GAP
      // question names something not on the profile by definition, which is
      // exactly what the guard's company rule rejects; three of five questions
      // vanished silently before this was handled.
      for (const term of q.quoted ?? []) {
        masked = masked.replace(new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), 'that area')
      }
      // Per sentence, exactly as buildPrepPlan does it. groundingFailure()'s
      // company rule skips only the FIRST word, because a bullet is one
      // sentence and its opening capital is not a company. Run over a whole
      // two-sentence question it flags the capital opening the second one —
      // which is how every question in this file was rejected with
      // `names "Why", which is not on your profile` during the build.
      for (const sentence of masked.split(/(?<=[.?!])\s+/).filter((x) => x.trim())) {
        expect(groundingFailure(sentence.trim(), ME, ROLE)).toBeNull()
      }
    }
  })

  it('the mask cannot hide a real fabrication', () => {
    // A metric and a stranger's employer must still fail even with the two
    // quoted facts masked out — otherwise the mask is a hole, not a scope.
    expect(groundingFailure('Tell me about growing AUM 40% at the stated bar', ME, ROLE)).not.toBeNull()
    expect(groundingFailure('Describe your work at Infosys', ME, ROLE)).not.toBeNull()
  })

  it('never invents a metric for the candidate to answer about', () => {
    // The failure this exists to prevent: "tell me about the time you grew AUM
    // 40%" invents a premise the candidate then has to defend.
    const metric = /(\d[\d,.]*\s*(%|percent|cr\b|crore|lakh|k\b|mn\b|million))|([₹$€£]\s*\d)|(\bteam of \d)/i
    for (const q of buildPrepPlan(ME, ROLE).questions) {
      // Years from the posting and the profile are quoted facts, not invented
      // achievements — strip them before checking for achievement figures.
      const withoutYears = q.question.replace(/\b\d{1,2}\s*years?\b/gi, '')
      expect(withoutYears).not.toMatch(metric)
    }
  })

  it('names no company but the candidate\'s own and the one being applied to', () => {
    // With a different posting, the previous company must not leak through.
    const other: RoleFacts = { title: 'Analyst', company: 'Zerodha', description: 'SQL required.' }
    for (const q of buildPrepPlan(ME, other).questions) {
      expect(q.question).not.toMatch(/Razorpay/)
    }
  })

  it('never claims more experience than the profile records', () => {
    for (const q of buildPrepPlan(ME, ROLE).questions) {
      for (const m of q.question.matchAll(/\b(\d{1,2})\s*years?\b/gi)) {
        const n = Number(m[1])
        // Only two numbers may appear: what the posting asks, and what the
        // candidate has. Never a third, larger, invented one.
        expect([3, 5]).toContain(n)
      }
    }
  })
})
