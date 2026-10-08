import { describe, it, expect } from 'vitest'
import { INTERVIEW_RULES, interviewAccess } from '../entitlements'

const NOW = new Date('2026-10-08T00:00:00Z')
const free = { plan: 'free' as const }

describe('interview access', () => {
  it('today, with the shipped rules, everyone is let in — nobody is gated out', () => {
    expect(INTERVIEW_RULES.default).toBe('all')
    expect(interviewAccess(free, 'Acme', INTERVIEW_RULES, NOW)).toEqual({ allowed: true, reason: 'open' })
    expect(interviewAccess(free, '', INTERVIEW_RULES, NOW).allowed).toBe(true)
  })

  const gated = { default: 'plan' as const, openCompanies: ['Razorpay Pvt Ltd'] }
  it('once the default is a plan: a plan opens it', () => {
    expect(interviewAccess({ plan: 'paid' }, 'Acme', gated, NOW)).toEqual({ allowed: true, reason: 'plan' })
  })
  it('an opened company is open to everyone, by its normalised name, and only that company', () => {
    expect(interviewAccess(free, 'Razorpay', gated, NOW)).toEqual({ allowed: true, reason: 'company-open' })
    expect(interviewAccess(free, 'Razorpay Pvt. Ltd.', gated, NOW).allowed).toBe(true)
    expect(interviewAccess(free, 'Razorpay Payments Labs', gated, NOW).allowed).toBe(false)
  })
  it('a trial pass lets someone in until it ends, and not a moment after', () => {
    expect(interviewAccess({ plan: 'free', trialUntil: '2026-10-09T00:00:00Z' }, 'Acme', gated, NOW)).toEqual({ allowed: true, reason: 'trial' })
    expect(interviewAccess({ plan: 'free', trialUntil: '2026-10-08T00:00:00Z' }, 'Acme', gated, NOW).allowed).toBe(false)
    expect(interviewAccess({ plan: 'free', trialUntil: 'not a date' }, 'Acme', gated, NOW).allowed).toBe(false)
  })
  it('otherwise it is locked', () => {
    expect(interviewAccess(free, 'Acme', gated, NOW)).toEqual({ allowed: false, reason: 'locked' })
  })
})
