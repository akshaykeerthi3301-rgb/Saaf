import { describe, it, expect } from 'vitest'
import { isCorporateRole, classifyFunction, isJunkPosting, normaliseTitle } from '../classify'

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

describe('junk postings', () => {
  it('drops a test posting left open on a board', () => {
    // Was live in the index and reachable by candidates.
    expect(isJunkPosting('Test Jerin')).toBe(true)
  })

  it('keeps real engineering roles that contain the word test', () => {
    // A bare /\btest\b/ filter looked obvious and would have withheld five real
    // jobs. Withholding a real role is the worse error.
    expect(isJunkPosting('Software Development Engineer in Test II')).toBe(false)
    expect(isJunkPosting('Staff Software Engineer in Test')).toBe(false)
    expect(isJunkPosting('QA Lead - Manual, Automation & AI Testing')).toBe(false)
    expect(isJunkPosting('Software Development Engineer Testing')).toBe(false)
  })

  it('keeps a role whose title merely starts with a placeholder-ish word', () => {
    expect(isJunkPosting('Testing Engineer')).toBe(false)
  })
})

describe('title normalisation', () => {
  it('collapses runs of whitespace', () => {
    expect(normaliseTitle('Accounts Payable  Specialist - Mumbai'))
      .toBe('Accounts Payable Specialist - Mumbai')
  })

  it('trims leading and trailing space', () => {
    expect(normaliseTitle(' Staff Engineer – Enterprise IT Automation'))
      .toBe('Staff Engineer – Enterprise IT Automation')
  })

  it('collapses repeated dashes', () => {
    expect(normaliseTitle('Team Leader - LRM ---  Hyderabad'))
      .toBe('Team Leader - LRM - Hyderabad')
  })

  it('title-cases a wholly lowercase title', () => {
    expect(normaliseTitle('area collections manager, pune (recoveries)'))
      .toBe('Area Collections Manager, Pune (Recoveries)')
  })

  it('preserves acronyms when title-casing', () => {
    expect(normaliseTitle('business development & strategic partnerships - d2c'))
      .toBe('Business Development & Strategic Partnerships - D2C')
  })

  it('leaves a title the employer already capitalised alone', () => {
    // Only wholly-lowercase titles are recased — never second-guess an
    // employer's own casing, which carries product and acronym names.
    expect(normaliseTitle('Lead Product Designer I')).toBe('Lead Product Designer I')
  })
})
