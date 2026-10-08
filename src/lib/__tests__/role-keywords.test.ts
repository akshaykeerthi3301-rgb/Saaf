import { describe, it, expect } from 'vitest'
import { keywordRoleFromSlug, keywordRoleSlug, KEYWORD_ROLES, roleKeywordFacts } from '../role-keywords'

describe('per-role keyword facts', () => {
  it('every measured role has facts and a slug that round-trips, with no two alike', () => {
    expect(new Set(KEYWORD_ROLES.map(keywordRoleSlug)).size).toBe(KEYWORD_ROLES.length)
    for (const r of KEYWORD_ROLES) {
      expect(keywordRoleFromSlug(keywordRoleSlug(r)), r).toBe(r)
      expect(roleKeywordFacts(r), r).not.toBeNull()
    }
  })
  it('percentages are counts over the postings measured, most common first, and never above 100', () => {
    for (const r of KEYWORD_ROLES) {
      const f = roleKeywordFacts(r)!
      for (const t of f.terms) {
        expect(t.pct).toBe(Math.round((t.count / f.postings) * 100))
        expect(t.pct).toBeLessThanOrEqual(100)
      }
      expect(f.terms.map((t) => t.count)).toEqual([...f.terms.map((t) => t.count)].sort((a, b) => b - a))
    }
  })
  it('an invented slug or role has no page', () => {
    expect(keywordRoleFromSlug('astronaut')).toBeNull()
    expect(roleKeywordFacts('Astronaut')).toBeNull()
  })
})
