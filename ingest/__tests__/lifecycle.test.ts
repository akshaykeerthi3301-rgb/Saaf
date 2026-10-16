import { describe, it, expect, afterEach } from 'vitest'
import { isStalePosting, maxPostingAgeDays } from '../lifecycle'

const NOW = Date.parse('2026-10-16T00:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

describe('posting age window', () => {
  afterEach(() => { delete process.env.MAX_POSTING_AGE_DAYS })
  it('is 90 days by default and overridable', () => {
    expect(maxPostingAgeDays()).toBe(90)
    process.env.MAX_POSTING_AGE_DAYS = '45'
    expect(maxPostingAgeDays()).toBe(45)
  })
  it('calls a posting stale only past the window, by the employer date', () => {
    expect(isStalePosting(daysAgo(30), NOW)).toBe(false)
    expect(isStalePosting(daysAgo(90), NOW)).toBe(false)
    expect(isStalePosting(daysAgo(91), NOW)).toBe(true)
    expect(isStalePosting(daysAgo(400), NOW)).toBe(true)
  })
  it('never calls an undated or unreadable posting stale', () => {
    expect(isStalePosting(null, NOW)).toBe(false)
    expect(isStalePosting(undefined, NOW)).toBe(false)
    expect(isStalePosting('not a date', NOW)).toBe(false)
  })
})
