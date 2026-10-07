import { describe, it, expect } from 'vitest'
import { EMPTY_VIEW, parseFeedQuery } from '../feed-query'
import { ANSWER_WINDOW_MS, currentAnswer, describeView, sameView, sanitizeHistory, worthRecording } from '../search-history'

const row = (over: Record<string, unknown> = {}) => ({
  id: 'a', text: 'remote PM jobs posted this week', view: { ...EMPTY_VIEW, remote: true, posted: '7' }, rating: null, created_at: '2026-10-08T10:00:00Z', ...over,
})

describe('history rows', () => {
  it('restores the view EXACTLY: sentence → stored view → sanitised view is the same view', () => {
    const view = parseFeedQuery('remote product manager in Bengaluru posted this week, easy apply')
    const [e] = sanitizeHistory([row({ view })])
    expect(sameView(e.view, view)).toBe(true)
    expect(e.view).toEqual(view)
  })

  it('drops rows it cannot read, and rebuilds the view through the whitelist', () => {
    const out = sanitizeHistory([
      row(), null, 'x', row({ id: 5 }), row({ text: '   ' }), row({ view: null }), row({ created_at: 7 }),
      row({ id: 'b', view: { remote: true, hacked: '<script>', posted: '999' } }),
    ])
    expect(out.map((e) => e.id)).toEqual(['a', 'b'])
    expect(out[1].view).toEqual({ ...EMPTY_VIEW, remote: true })
  })

  it('keeps a rating only if it is up or down', () => {
    expect(sanitizeHistory([row({ rating: 'up' })])[0].rating).toBe('up')
    expect(sanitizeHistory([row({ rating: 'meh' })])[0].rating).toBeNull()
  })

  it('never holds more than the cap', () => {
    expect(sanitizeHistory(Array.from({ length: 50 }, (_, i) => row({ id: String(i) })))).toHaveLength(20)
  })
})

describe('what a search is read as', () => {
  it('says each filter in words', () => {
    const v = parseFeedQuery('remote product manager in Pune, posted this week, paying 12 lakh, excluding TCS, newest first')
    const words = describeView(v)
    expect(words).toEqual(expect.arrayContaining(['Remote', 'In Pune', 'Last week', 'Pay ≥ ₹12 L', 'Not TCS', 'Newest first']))
  })
  it('says nothing for a view that filters nothing', () => {
    expect(describeView(EMPTY_VIEW)).toEqual([])
  })
  it('does not record a search that was read as nothing', () => {
    expect(worthRecording('hello there', EMPTY_VIEW)).toBe(false)
    expect(worthRecording('', { ...EMPTY_VIEW, remote: true })).toBe(false)
    expect(worthRecording('remote', { ...EMPTY_VIEW, remote: true })).toBe(true)
  })
})

describe('the "Read as" strip', () => {
  const now = Date.parse('2026-10-08T10:30:00Z')
  const history = sanitizeHistory([row()])
  it('shows for the newest search while its view is on screen and recent', () => {
    expect(currentAnswer(history, { ...EMPTY_VIEW, remote: true, posted: '7' }, now)?.id).toBe('a')
  })
  it('hides once the view has changed, or after an hour', () => {
    expect(currentAnswer(history, { ...EMPTY_VIEW, remote: true }, now)).toBeNull()
    expect(currentAnswer(history, { ...EMPTY_VIEW, remote: true, posted: '7' }, now + ANSWER_WINDOW_MS)).toBeNull()
  })
  it('is null with no history', () => {
    expect(currentAnswer([], EMPTY_VIEW, now)).toBeNull()
  })
})
