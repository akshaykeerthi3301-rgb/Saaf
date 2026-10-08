import { describe, it, expect } from 'vitest'
import keywords from '../taxonomy/role-keywords.json'
import { POSTS } from '../blog'

type K = Record<string, { medianYears?: number; postings: number }>
const K = keywords as unknown as K
const text = (slug: string) => JSON.stringify(POSTS.find((p) => p.slug === slug))

describe('data blog', () => {
  it('every post says when it was measured, how, and what it does not show', () => {
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length)
    for (const p of POSTS) {
      expect(p.measuredAt, p.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(p.method.length, p.slug).toBeGreaterThan(60)
      expect(p.limits.length, p.slug).toBeGreaterThan(60)
      expect(p.blocks.length, p.slug).toBeGreaterThan(1)
    }
  })
  it('the years post quotes what the keyword data says', () => {
    const medians = Object.entries(K).filter(([, v]) => v.medianYears !== undefined)
    expect(medians).toHaveLength(63)
    const sorted = medians.map(([, v]) => v.medianYears!).sort((a, b) => a - b)
    expect(sorted[Math.floor(sorted.length / 2)]).toBe(5)
    const t = text('how-many-years-of-experience-indian-postings-ask-for')
    for (const [role, years, n] of [['Solutions Architect', 8, 155], ['Backend Engineer', 7, 199], ['Performance Marketing', 1, 28], ['Field Sales', 2, 161], ['Relationship Manager', 3, 101]] as const) {
      expect(K[role].medianYears, role).toBe(years)
      expect(K[role].postings, role).toBe(n)
      expect(t, role).toContain(role)
    }
    for (const role of ['Category Manager', 'HR Manager', 'Procurement Manager', 'Service Delivery Manager', 'Solutions Architect']) expect(K[role].medianYears, role).toBe(8)
  })
  it('the arithmetic in the quoted counts holds', () => {
    // Cities: 9,227 + 2,644 + 2,460 of 27,882 is 51.4%; Bengaluru alone 33.1%; remote 1,039 is 3.7%.
    expect(((9227 + 2644 + 2460) / 27882) * 100).toBeCloseTo(51.4, 1)
    expect((9227 / 27882) * 100).toBeCloseTo(33.1, 1)
    expect((1039 / 27882) * 100).toBeCloseTo(3.7, 1)
    expect((25 / 4000) * 100).toBeCloseTo(0.6, 1)
    expect(4000 / 25).toBe(160)
  })
})
