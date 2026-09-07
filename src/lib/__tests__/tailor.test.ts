import { describe, it, expect } from 'vitest'
import { groundingFailure, matchedSkills, type CandidateFacts } from '../tailor'

/**
 * The grounding filter is the "Zero Fabricated Claims" badge.
 *
 * The design puts that sentence under the generated bullets. A product may not
 * print it and then show whatever a model returned, so the badge is backed by
 * this filter and these are the cases it exists for. Every one of them is a
 * claim a model will happily invent and a candidate would have to defend in an
 * interview.
 */
const me: CandidateFacts = {
  currentTitle: 'Business Analyst',
  employer: 'ICICI Bank',
  yearsExperience: 2,
  skills: ['SQL', 'customer segmentation', 'Excel'],
  domain: 'Fintech',
  credential: 'none',
}

describe('groundingFailure', () => {
  it('accepts a bullet built only from what the profile holds', () => {
    expect(groundingFailure('Built customer segmentation models in SQL for retail banking.', me)).toBeNull()
    expect(groundingFailure('Supported analysis across fintech products using Excel.', me)).toBeNull()
  })

  it('drops an invented metric, which is the likeliest fabrication', () => {
    for (const b of [
      'Grew assets under management by 40% year on year.',
      'Managed a portfolio of 200Cr across HNI clients.',
      'Improved retention by 12 percent.',
      'Led a team of 9 analysts.',
    ]) {
      expect(groundingFailure(b, me), b).toMatch(/figure/)
    }
  })

  it('drops a company the candidate never worked for', () => {
    // The worst thing this feature could produce.
    expect(groundingFailure('Delivered wealth strategy programmes at Kotak.', me)).toMatch(/Kotak/)
  })

  it('keeps the candidate’s own employer', () => {
    expect(groundingFailure('Partnered with product teams at ICICI Bank on segmentation.', me)).toBeNull()
  })

  it('drops inflated tenure but keeps honest tenure', () => {
    expect(groundingFailure('Eight years of experience in analytics.', me)).toBeNull() // spelled, not matched
    expect(groundingFailure('8 years of experience in analytics.', me)).toMatch(/8 years/)
    expect(groundingFailure('2 years of experience in analytics.', me)).toBeNull()
  })

  it('drops a credential the profile does not record', () => {
    expect(groundingFailure('CFA charterholder supporting portfolio construction.', me)).toMatch(/CFA/)
    const holder = { ...me, credential: 'CFA' }
    expect(groundingFailure('CFA charterholder supporting portfolio construction.', holder)).toBeNull()
  })

  it('does not trip over ordinary capitalised words', () => {
    expect(groundingFailure('Worked with Business and Operations teams in India.', me)).toBeNull()
  })
})

describe('matchedSkills', () => {
  it('returns only skills the posting actually names', () => {
    const role = {
      title: 'Business Analyst',
      company: 'Acme',
      description: 'You will write SQL daily and own customer segmentation.',
    }
    expect(matchedSkills(me, role).sort()).toEqual(['SQL', 'customer segmentation'])
  })

  it('returns nothing when the posting names none of them', () => {
    expect(matchedSkills(me, { title: 'Chef', company: 'Acme', description: 'Cook food.' })).toEqual([])
  })
})

/**
 * The posting is allowed vocabulary.
 *
 * Observed live 2026-09-07: a correct cover note was dropped for naming "ERP",
 * a word from the job title displayed at the top of the same drawer. Naming the
 * role and company you are applying to is what a cover note IS. Without this
 * the filter rejected every note it was given.
 */
describe('groundingFailure with the posting in scope', () => {
  const role = {
    title: 'ERP Cloud Managed Services Finance Functional Consultant',
    company: 'Version 1',
    description: null,
  }

  it('allows the role and company being applied to', () => {
    const note =
      'I am writing about the ERP Cloud Managed Services Finance Functional Consultant role at Version 1. ' +
      'My work at ICICI Bank covers stakeholder management and process documentation.'
    expect(groundingFailure(note, me, role)).toBeNull()
  })

  it('still rejects a company that is neither the candidate’s nor the posting’s', () => {
    expect(groundingFailure('Delivered similar programmes at Deloitte.', me, role)).toMatch(/Deloitte/)
  })

  it('still rejects an invented metric inside an otherwise valid note', () => {
    expect(
      groundingFailure('I grew the portfolio 30% at Version 1 scale.', me, role),
    ).toMatch(/figure/)
  })
})
