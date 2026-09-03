import { describe, it, expect } from 'vitest'
import { isCorporateRole, classifyFunction } from '../classify'

describe('isCorporateRole', () => {
  // Reported from the live product on 2026-09-02: an engineering candidate's
  // shortlist carried voice-artist and delivery-captain roles. These are real
  // jobs on a different labour market with different gates; putting them on a
  // corporate shortlist is exactly the noise the candidate came here to escape.
  it.each([
    'Voice Artist - Hindi',
    'Voice Over Artist (Regional Languages)',
    'Audio Transcriber - Tamil',
    'Delivery Partner - Swiggy',
    'Captain - Bike Taxi',
    'Delivery Executive',
    'Telecaller - Outbound',
    'BPO Voice Process Associate',
    'Security Guard',
    'Beautician - Home Salon',
    'Data Entry Operator',
    'Warehouse Associate - Picker',
  ])('drops %s', (title) => {
    expect(isCorporateRole(title)).toBe(false)
  })

  // Field sales is corporate work with a corporate gate, even though it is
  // sometimes lumped in with gig hiring. It stays.
  it.each([
    'Business Development Executive',
    'Software Engineer, Backend',
    'Assistant Manager - Business Finance',
    'Talent Acquisition Partner',
    'Area Sales Manager',
  ])('keeps %s', (title) => {
    expect(isCorporateRole(title)).toBe(true)
  })
})

describe('classifyFunction', () => {
  it.each([
    ['Software Development Engineer III DevOps', 'engineering'],
    ['Applied AI Engineer', 'engineering'],
    ['Assistant Manager - Business Finance', 'finance'],
    ['Talent Acquisition Intern', 'hr'],
    ['Performance Marketing Manager', 'marketing'],
    ['Business Analyst - Strategy', 'consulting'],
  ])('%s → %s', (title, fn) => {
    expect(classifyFunction(title)).toBe(fn)
  })

  // A role the classifier cannot type is never shown to anyone, so a wrong
  // 'other' is a silent supply loss rather than a wrong answer. Documented so
  // the count is watched rather than forgotten.
  it('returns other rather than guessing', () => {
    expect(classifyFunction('Client Onboarding Director')).toBe('other')
  })
})
