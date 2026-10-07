import { describe, it, expect } from 'vitest'
import { closureChanges, collapseRepeats, repostHistory, survivorId } from '../dedupe'

const role = (externalId: string, title: string, locationRaw: string) =>
  ({ externalId, title, locationRaw, description: '', applyUrl: '', postedAt: null })

describe('collapseRepeats', () => {
  it('keeps one copy of a posting a board published several times', () => {
    const out = collapseRepeats([
      role('a1', 'Sales Advisor', 'Bengaluru, India'),
      role('a2', 'Sales Advisor', 'Bengaluru, India'),
      role('a3', 'Sales Advisor', 'Bengaluru, India'),
    ])
    expect(out).toHaveLength(1)
  })

  it('picks the SAME copy however the board orders its response', () => {
    // The bug this exists to prevent: an unstable winner meant every run
    // upserted a different row and orphaned the previous one, so deduplicating
    // increased the duplicate count instead of reducing it.
    const roles = [
      role('a1', 'Sales Advisor', 'Pune'),
      role('a2', 'Sales Advisor', 'Pune'),
      role('a3', 'Sales Advisor', 'Pune'),
    ]
    const first = collapseRepeats(roles)[0].externalId
    for (const order of [[2, 0, 1], [1, 2, 0], [2, 1, 0]]) {
      expect(collapseRepeats(order.map((i) => roles[i]))[0].externalId).toBe(first)
    }
  })

  it('agrees with survivorId, so a cleanup script cannot fight the ingest', () => {
    const ids = ['jr9', 'jr10', 'jr2']
    const kept = collapseRepeats(ids.map((i) => role(i, 'Analyst', 'Chennai')))[0].externalId
    expect(kept).toBe(survivorId(ids))
  })

  it('keeps the same role in two cities — those are two real choices', () => {
    const out = collapseRepeats([
      role('a1', 'Product Manager', 'Bengaluru, India'),
      role('a2', 'Product Manager', 'Pune, India'),
    ])
    expect(out).toHaveLength(2)
  })

  it('treats casing differences as the same posting', () => {
    const out = collapseRepeats([
      role('a1', 'Sales Advisor', 'Bengaluru'),
      role('a2', 'SALES ADVISOR', 'bengaluru'),
    ])
    expect(out).toHaveLength(1)
  })

  it('leaves genuinely distinct postings alone', () => {
    const out = collapseRepeats([
      role('a1', 'Product Manager', 'Bengaluru'),
      role('a2', 'Senior Product Manager', 'Bengaluru'),
      role('a3', 'Data Analyst', 'Bengaluru'),
    ])
    expect(out).toHaveLength(3)
  })
})

describe('repostHistory', () => {
  const r = (externalId: string, postedAt: string | null, title = 'Analyst', locationRaw = 'Pune') =>
    ({ externalId, title, locationRaw, postedAt })
  const key = 'analyst||pune'

  it('says nothing about a posting seen once', () => {
    expect(repostHistory([r('a1', '2026-09-01')]).size).toBe(0)
  })

  it('keeps the earliest date across copies in one fetch', () => {
    const h = repostHistory([r('a1', '2026-08-01'), r('a2', '2026-09-20')]).get(key)
    expect(h).toEqual({ count: 1, firstPostedAt: '2026-08-01T00:00:00.000Z' })
  })

  it('finds the earlier copy among rows already stored', () => {
    const h = repostHistory(
      [r('b2', '2026-09-20')],
      [{ externalId: 'b1', title: 'Analyst', locationRaw: 'Pune', postedAt: '2026-07-15' }],
    ).get(key)
    expect(h).toEqual({ count: 1, firstPostedAt: '2026-07-15T00:00:00.000Z' })
  })

  it('does not lose the tally when the old survivor is deleted: A, then B, then C is TWO earlier copies', () => {
    // B was stored after seeing A (tally 1). A is gone. C arrives and replaces B.
    const h = repostHistory(
      [r('c', '2026-10-01')],
      [{ externalId: 'b', title: 'Analyst', locationRaw: 'Pune', postedAt: '2026-09-01', firstPostedAt: '2026-08-01', repostCount: 1 }],
    ).get(key)
    expect(h).toEqual({ count: 2, firstPostedAt: '2026-08-01T00:00:00.000Z' })
  })

  it('is stable when the same survivor is seen again', () => {
    const h = repostHistory(
      [r('b', '2026-09-01')],
      [{ externalId: 'b', title: 'Analyst', locationRaw: 'Pune', postedAt: '2026-09-01', firstPostedAt: '2026-08-01', repostCount: 1 }],
    ).get(key)
    expect(h?.count).toBe(1)
  })

  it('records nothing when no copy carries a date', () => {
    expect(repostHistory([r('a1', null), r('a2', null)]).size).toBe(0)
  })

  it('keeps two cities apart', () => {
    const h = repostHistory([r('a1', '2026-08-01', 'Analyst', 'Pune'), r('a2', '2026-09-01', 'Analyst', 'Delhi')])
    expect(h.size).toBe(0)
  })
})

describe('closureChanges', () => {
  const stored = [
    { id: '1', external_id: 'a' }, { id: '2', external_id: 'b' }, { id: '3', external_id: 'c', closed_at: '2026-10-01' },
    { id: '4', external_id: 'd', closed_at: '2026-10-01' },
  ]

  it('closes a stored role the complete board listing no longer names', () => {
    expect(closureChanges(stored, new Set(['a', 'd']), new Set()).gone).toEqual(['2'])
  })

  it('does not re-close one that is already closed, so the first date is kept', () => {
    expect(closureChanges(stored, new Set(['a', 'b']), new Set()).gone).toEqual([])
  })

  it('reopens one that reappears', () => {
    expect(closureChanges(stored, new Set(['a', 'b', 'd']), new Set()).reopened).toEqual(['4'])
  })

  it('does not call a replaced duplicate closed — it is the same posting under a newer id', () => {
    expect(closureChanges(stored, new Set(['a']), new Set(['2'])).gone).toEqual([])
  })

  it('closes nothing from an empty listing that is claimed complete only if the caller says so — it is the caller\'s guard', () => {
    // Documented rather than defended here: the ingest calls this only for a complete fetch.
    expect(closureChanges(stored, new Set(), new Set()).gone).toEqual(['1', '2'])
  })
})
