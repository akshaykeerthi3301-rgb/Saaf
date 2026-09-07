import { describe, it, expect } from 'vitest'
import { collapseRepeats, survivorId } from '../dedupe'

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
