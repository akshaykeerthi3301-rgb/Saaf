import { describe, it, expect } from 'vitest'
import { postedAgo, postedOn } from '../day'

const now = new Date('2026-09-23T12:00:00Z')
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()

describe('postedAgo', () => {
  it('says nothing when the board gave no date', () => {
    expect(postedAgo(null, now)).toBeNull()
    expect(postedAgo(undefined, now)).toBeNull()
    expect(postedAgo('', now)).toBeNull()
    expect(postedAgo('not a date', now)).toBeNull()
  })

  it('reads whole days elapsed', () => {
    expect(postedAgo(ago(0.5), now)).toBe('Posted today')
    expect(postedAgo(ago(1), now)).toBe('Posted yesterday')
    expect(postedAgo(ago(3), now)).toBe('Posted 3 days ago')
    expect(postedAgo(ago(59), now)).toBe('Posted 59 days ago')
  })

  it('rounds long ages down, never up — an older posting must not read newer', () => {
    expect(postedAgo(ago(60), now)).toBe('Posted 2 months ago')
    expect(postedAgo(ago(89), now)).toBe('Posted 2 months ago')
    expect(postedAgo(ago(364), now)).toBe('Posted 12 months ago')
    expect(postedAgo(ago(400), now)).toBe('Posted over a year ago')
  })

  it('treats a date in the future as today rather than "in 2 days"', () => {
    expect(postedAgo(ago(-2), now)).toBe('Posted today')
  })

  it('accepts Workday bare dates', () => {
    expect(postedAgo('2026-09-20', now)).toBe('Posted 3 days ago')
  })
})

describe('postedOn', () => {
  it('formats the exact date in IST', () => {
    // 20:00 UTC on the 22nd is 01:30 IST on the 23rd.
    expect(postedOn('2026-09-22T20:00:00Z')).toBe('23 Sept 2026')
  })
})
