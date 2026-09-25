import { describe, it, expect } from 'vitest'
import { applyTextFilter, matchesQuery, parseFeedQuery, toggleSkill, viewFromParams, viewToQuery } from '../feed-query'

describe('parseFeedQuery — a sentence becomes the pills', () => {
  it('reads role words, city and pills', () => {
    const v = parseFeedQuery('Product manager jobs in Bangalore, easy apply, posted today')
    expect(v).toMatchObject({ q: 'product manager', city: 'Bengaluru', easy: true, fresh: true, remote: false, min80: false })
  })

  it('treats "remote ok" as allowed, not required', () => {
    const v = parseFeedQuery('fintech PM in Bengaluru, remote ok')
    expect(v.remote).toBe(false)
    expect(v.q).toBe('fintech pm')
    expect(parseFeedQuery('remote data analyst').remote).toBe(true)
  })

  it('prefers the longest city name', () => {
    expect(parseFeedQuery('analyst in navi mumbai').city).toBe('Navi Mumbai')
  })

  it('reads a strong-match request', () => {
    expect(parseFeedQuery('strong match sales roles').min80).toBe(true)
    expect(parseFeedQuery('sales above 80').min80).toBe(true)
  })

  it('returns an empty view for filler', () => {
    expect(parseFeedQuery('show me some jobs please')).toMatchObject({ q: '', city: '' })
  })
})

describe('matchesQuery', () => {
  const role = { title: 'Senior Product Manager, Payments', company: 'Razorpay', location: 'Bengaluru' }
  it('needs every word in the title or company', () => {
    expect(matchesQuery('product manager', role)).toBe(true)
    expect(matchesQuery('razorpay payments', role)).toBe(true)
    expect(matchesQuery('product designer', role)).toBe(false)
  })
  it('expands the short forms candidates type', () => {
    expect(matchesQuery('pm', role)).toBe(true)
    expect(matchesQuery('sde', { title: 'Software Engineer II', company: 'X', location: '' })).toBe(true)
  })
  it('matches word starts, not the middle of a word', () => {
    expect(matchesQuery('pay', role)).toBe(true)
    expect(matchesQuery('ment', role)).toBe(false)
  })
})

describe('applyTextFilter', () => {
  const text = new Map([
    ['a', { title: 'Product Manager', company: 'Zeta', location: 'Bangalore, Karnataka' }],
    ['b', { title: 'Product Manager', company: 'Zeta', location: 'Mumbai' }],
    ['c', { title: 'Data Engineer', company: 'Zeta', location: 'Bengaluru' }],
  ])
  const rows = [{ role_id: 'a' }, { role_id: 'b' }, { role_id: 'c' }, { role_id: 'd' }]
  it('filters by words and by city, with aliases', () => {
    expect(applyTextFilter(rows, { q: 'product', city: 'Bengaluru' }, text).map((r) => r.role_id)).toEqual(['a'])
  })
  it('is a no-op with no filter, keeping even rows with no text read', () => {
    expect(applyTextFilter(rows, { q: '', city: '' }, text)).toHaveLength(4)
  })
})

describe('views round-trip through the URL, and only whitelisted keys survive', () => {
  it('round-trips', () => {
    const v = parseFeedQuery('remote pm in pune easy apply')
    expect(viewFromParams(Object.fromEntries(new URLSearchParams(viewToQuery(v))))).toEqual(v)
  })
  it('drops anything else', () => {
    const q = viewToQuery(viewFromParams({ min80: '1', evil: 'javascript:alert(1)', q: 'pm' }))
    expect(q).toBe('min80=1&q=pm')
  })
})

describe('toggleSkill', () => {
  it('adds once, case-insensitively, and removes', () => {
    expect(toggleSkill(['SQL'], 'python', true)).toEqual(['SQL', 'python'])
    expect(toggleSkill(['SQL'], 'sql', true)).toEqual(['SQL'])
    expect(toggleSkill(['SQL', 'Python'], 'sql', false)).toEqual(['Python'])
  })
  it('respects the 40-skill cap', () => {
    const forty = Array.from({ length: 40 }, (_, i) => `s${i}`)
    expect(toggleSkill(forty, 'new', true)).toHaveLength(40)
  })
})
