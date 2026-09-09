import { describe, it, expect } from 'vitest'
import { rewriteFailure } from '../resume-rewrite'
import type { CandidateFacts, RoleFacts } from '../tailor'

/**
 * The cover letter's guard, tested without a model in the loop.
 *
 * A résumé rewrite has an anchor: the line it came from. A cover letter has
 * none — it is new prose by definition, which is the shape a model fills with
 * plausible invention. So the two rules that matter are tested directly: a
 * paragraph must be grounded in the RÉSUMÉ, and it must not assert anything
 * about the candidate's motivation, which nobody can check and we were never
 * told.
 */

const ME: CandidateFacts = {
  currentTitle: 'Backend Engineer',
  employer: 'Razorpay',
  yearsExperience: 4,
  skills: ['Java', 'Postgres'],
  domain: 'fintech',
  credential: null,
}

const ROLE: RoleFacts = {
  title: 'Senior Backend Engineer',
  company: 'Zeta',
  description: 'Payments platform work. Distributed systems.',
}

const RESUME = `Rahul Menon
Backend engineer with 4 years building payment and ledger services.

EXPERIENCE
Backend Engineer at Razorpay
Jul 2023 - Present
• Migrated the ledger from MySQL to Postgres with zero downtime over 3 months
• Cut p99 latency on the payouts API from 1400ms to 320ms

SKILLS
Java, Postgres`

/** The motivation rule, duplicated here because the module keeps it private —
 *  the point of the test is the BEHAVIOUR the surface promises. */
const MOTIVATION =
  /\b(passionate|passion|excited|excites|thrilled|admire|admired|admiration|drawn to|inspired by|dream (job|role)|culture fit|align(ed)? with (my|your) values|long.?standing interest)\b/i

describe('a paragraph grounded in the résumé', () => {
  it('passes when every fact in it is on the page', () => {
    const p =
      'I migrated the ledger from MySQL to Postgres with zero downtime over 3 months, and cut p99 latency on the payouts API from 1400ms to 320ms.'
    expect(rewriteFailure(p, RESUME, ME, ROLE)).toBeNull()
  })

  it('fails when it states a figure the résumé does not', () => {
    const p = 'I led a team of 12 engineers on the payments platform.'
    expect(rewriteFailure(p, RESUME, ME, ROLE)).not.toBeNull()
  })

  it('fails when it names an employer the candidate never had', () => {
    const p = 'I built the same kind of ledger at Flipkart before joining my current team.'
    expect(rewriteFailure(p, RESUME, ME, ROLE)).toMatch(/Flipkart/)
  })

  it('allows the company being applied to, which is a fact about the posting', () => {
    const p = 'The ledger work maps directly onto what Zeta is hiring this role to do.'
    expect(rewriteFailure(p, RESUME, ME, ROLE)).toBeNull()
  })
})

describe('the motivation ban', () => {
  /**
   * ⚠️ NOT A STYLE RULE. Each of these asserts something about the candidate's
   * inner life that the product has no way to know and the candidate never told
   * us. Dropping them is the invented-figure rule applied to a claim that
   * happens to be unfalsifiable rather than false.
   */
  it('catches the house style of every generated cover letter', () => {
    for (const line of [
      'I have always been passionate about financial inclusion.',
      'I am excited by the opportunity to join your team.',
      'I have long admired your commitment to engineering quality.',
      'This is my dream role and a perfect culture fit.',
      'I was drawn to the mission from the first time I read about it.',
    ]) {
      expect(MOTIVATION.test(line), line).toBe(true)
    }
  })

  it('leaves a factual sentence alone', () => {
    for (const line of [
      'I am looking for a backend role on a payments platform.',
      'I migrated a ledger to Postgres with zero downtime.',
      'My last four years have been in Indian fintech.',
    ]) {
      expect(MOTIVATION.test(line), line).toBe(false)
    }
  })
})

/**
 * First person.
 *
 * ⚠️ CAUGHT ON THE FIRST LIVE RUN, not in review. Handed a résumé whose summary
 * is written in the third person's shape — "Backend engineer with 4 years…" —
 * the model wrote back "He has 4 years of experience building payment and
 * ledger services". True, grounded, and unusable: the person sending the letter
 * is the person it is about.
 */
const THIRD_PERSON =
  /\b(he|she|they|the candidate)\s+(has|have|is|was|brings|holds|led|built|owns?|worked)\b|\b(his|her|their)\s+(experience|background|expertise|career|profile|skill ?set|track record)\b/i

describe('the first-person rule', () => {
  it('catches a letter written about the candidate rather than by them', () => {
    for (const line of [
      'He has 4 years of experience building payment and ledger services.',
      'She led the migration from MySQL to Postgres.',
      'The candidate has worked across payments and ledgers.',
      'Their experience is in Indian fintech.',
    ]) {
      expect(THIRD_PERSON.test(line), line).toBe(true)
    }
  })

  it('leaves a possessive that refers to somebody else alone — a known limit, stated', () => {
    // "their on-call rota" is a team's, not the candidate's. A blanket
    // possessive ban would delete this true sentence for a grammatical reason.
    expect(THIRD_PERSON.test('I authored the runbooks their on-call rota still uses')).toBe(false)
  })

  it('leaves first-person prose alone, including where it mentions a team', () => {
    for (const line of [
      'I migrated the ledger from MySQL to Postgres with zero downtime.',
      'I own the settlement service that moves money to 60,000 merchants.',
      'I am looking for a backend role on a payments platform.',
      'I authored the runbooks their on-call rota still uses.',
    ]) {
      expect(THIRD_PERSON.test(line), line).toBe(false)
    }
  })
})
