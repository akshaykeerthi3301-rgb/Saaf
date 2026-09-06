import { describe, it, expect } from 'vitest'
import { DOMAINS, ALL_ROLES } from '../roles'

describe('role taxonomy', () => {
  it('has no duplicate role labels across domains', () => {
    expect(new Set(ALL_ROLES).size).toBe(ALL_ROLES.length)
  })

  it('keeps every label safe for the tsquery the matcher builds', () => {
    // evaluate-user.ts strips everything outside [a-z0-9&+ ] and ANDs the rest,
    // so punctuation silently becomes an extra required term. A label like
    // "HR Business Partner (HRBP)" would AND four words and return nothing.
    for (const role of ALL_ROLES) {
      expect(role, `${role} carries characters the matcher strips`).toMatch(/^[A-Za-z0-9&+ ]+$/)
      expect(role.split(/\s+/).length, `${role} is too many words to match a title`)
        .toBeLessThanOrEqual(3)
    }
  })

  it('gives every domain a stable key and at least four roles', () => {
    const keys = DOMAINS.map((d) => d.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const d of DOMAINS) expect(d.roles.length).toBeGreaterThanOrEqual(4)
  })
})
