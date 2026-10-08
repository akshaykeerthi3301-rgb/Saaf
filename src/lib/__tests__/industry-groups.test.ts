import { describe, it, expect } from 'vitest'
import { industriesIn } from '../industry'
import { groupKeywords } from '../keyword-groups'

describe('industriesIn', () => {
  it('names the industries a posting uses, most-mentioned first', () => {
    const jd = 'We are a B2B SaaS company serving banks. Our SaaS platform helps banking teams; payments experience helps.'
    expect(industriesIn(jd)).toEqual(['SaaS', 'Banking', 'Fintech'])
  })
  it('names nothing when the text names nothing — it never guesses from the company', () => {
    expect(industriesIn('Own onboarding and renewals for a portfolio of accounts at Acme.')).toEqual([])
  })
  it('does not read "AI" inside other words', () => {
    expect(industriesIn('Maintain the mail merge and paid media plan')).not.toContain('AI / ML')
  })
})

describe('groupKeywords', () => {
  it('puts named products and languages under tools and ways of working under functional', () => {
    const g = groupKeywords([{ term: 'Excel' }, { term: 'Stakeholder Management' }, { term: 'Salesforce' }, { term: 'Renewals' }])
    expect(g.tools.map((x) => x.term)).toEqual(['Excel', 'Salesforce'])
    expect(g.functional.map((x) => x.term)).toEqual(['Stakeholder Management', 'Renewals'])
  })
})
