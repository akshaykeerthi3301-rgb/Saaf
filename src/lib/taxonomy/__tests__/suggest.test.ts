import { describe, it, expect } from 'vitest'
import { ABBREVIATIONS, suggestRoles } from '../suggest'
import { ALL_ROLES } from '../roles'

const top = (typed: string, n = 1) => suggestRoles(typed).slice(0, n).map((s) => s.role)

describe('suggestRoles — ranking', () => {
  it('an exact role comes first', () => {
    expect(top('product manager')).toEqual(['Product Manager'])
    expect(top('Product Manager ')).toEqual(['Product Manager'])
  })

  it('reads the abbreviations candidates type', () => {
    expect(top('pm')).toEqual(['Product Manager'])
    expect(top('sde')).toEqual(['Software Engineer'])
    expect(top('hrbp')).toEqual(['HR Business Partner'])
    expect(top('CSM')).toEqual(['Customer Success Manager'])
    expect(top('ca')).toEqual(['Chartered Accountant'])
  })

  it('every abbreviation points at a role that exists in the taxonomy', () => {
    for (const [abbr, role] of Object.entries(ABBREVIATIONS)) expect(ALL_ROLES, abbr).toContain(role)
  })

  it('a prefix beats a substring, and a shorter role beats a longer one', () => {
    const r = suggestRoles('product man').map((s) => s.role)
    expect(r.slice(0, 2)).toEqual(['Product Manager', 'Product Management'])
    expect(r.indexOf('Product Manager')).toBeLessThan(r.indexOf('Associate Product Manager'))
  })

  it('words in any order still find the role', () => {
    expect(top('manager product')).toEqual(['Product Manager'])
  })

  it('finds a role from a word in the middle of its name', () => {
    expect(suggestRoles('success').map((s) => s.role)).toContain('Customer Success Manager')
  })

  it('does not match inside a word: "pm" is in "development", and that is not a reason to offer it', () => {
    const r = suggestRoles('pm').map((s) => s.role)
    expect(r).toEqual(['Product Manager'])
    expect(suggestRoles('rod').map((s) => s.role)).toEqual([]) // "rod" is inside "product", not the start of a word
  })

  it('forgives a typo in a word of four letters or more, not in a short one', () => {
    expect(top('prodcut manager')).toEqual(['Product Manager'])
    expect(top('data analist')).toEqual(['Data Analyst'])
    expect(suggestRoles('hr managr').map((s) => s.role)).toContain('HR Manager')
  })

  it('a longer title reaches the role inside it', () => {
    expect(suggestRoles('senior product manager').map((s) => s.role)).toContain('Product Manager')
    expect(suggestRoles('associate consultant').map((s) => s.role)).toContain('Management Consultant')
  })

  it('returns nothing for gibberish or an empty box, and never throws', () => {
    expect(suggestRoles('xyzzyq')).toEqual([])
    expect(suggestRoles('')).toEqual([])
    expect(suggestRoles('   ')).toEqual([])
    expect(suggestRoles('((')).toEqual([])
  })

  it('honours the limit and never repeats a role', () => {
    const r = suggestRoles('manager', ALL_ROLES, 4)
    expect(r).toHaveLength(4)
    expect(new Set(r.map((s) => s.role)).size).toBe(4)
  })

  it('scores are strictly ordered high to low', () => {
    const s = suggestRoles('manager', ALL_ROLES, 20).map((x) => x.score)
    expect(s).toEqual([...s].sort((a, b) => b - a))
  })
})
