import { describe, it, expect } from 'vitest'
import { CITIES } from '../taxonomy/locations'
import { ALL_ROLES } from '../taxonomy/roles'
import { cityFromSlug, cityPatterns, citySlug, isIndexable, MIN_ROLES_TO_INDEX, pageTitle, roleFromSlug, roleSlug, rolePhrase, slugify, titleIsRole } from '../seo-pages'

describe('role and city pages', () => {
  it('every taxonomy role and city has its own distinct slug that resolves back', () => {
    expect(new Set(ALL_ROLES.map(roleSlug)).size).toBe(ALL_ROLES.length)
    for (const r of ALL_ROLES) expect(roleFromSlug(roleSlug(r)), r).toBe(r)
    expect(new Set(CITIES.map(citySlug)).size).toBe(CITIES.length)
    for (const c of CITIES) expect(cityFromSlug(citySlug(c))?.name, c.name).toBe(c.name)
  })
  it('an invented slug resolves to nothing — the page 404s instead of inventing a role', () => {
    expect(roleFromSlug('astronaut')).toBeNull()
    expect(cityFromSlug('atlantis')).toBeNull()
    expect(roleFromSlug('../etc/passwd')).toBeNull()
  })
  it('slugs are plain', () => {
    expect(slugify('Learning and Development')).toBe('learning-and-development')
    expect(slugify('Compensation & Benefits')).toBe('compensation-and-benefits')
  })
  it('a title is the role only when it contains the role as a phrase; and a city is known by every spelling postings use', () => {
    expect(rolePhrase('Product Manager')).toBe('product manager')
    expect(titleIsRole('Senior Product Manager, Payments', 'Product Manager')).toBe(true)
    expect(titleIsRole('Product Designer', 'Product Manager')).toBe(false)
    // Found by reading the first page: both words, but not the role.
    expect(titleIsRole('Business Development Manager - Low Voltage Switchgear Product', 'Product Manager')).toBe(false)
    expect(cityPatterns(cityFromSlug('bengaluru')!)).toEqual(expect.arrayContaining(['bengaluru', 'bangalore']))
  })
  it('the thin-content guard: under the threshold is noindex, at it is indexable', () => {
    expect(isIndexable(MIN_ROLES_TO_INDEX - 1)).toBe(false)
    expect(isIndexable(MIN_ROLES_TO_INDEX)).toBe(true)
  })
  it('titles say the real number and the right noun', () => {
    expect(pageTitle('Product Manager', null, 36)).toBe('Product Manager jobs in India — 36 open roles | Saaf')
    expect(pageTitle('Product Manager', cityFromSlug('pune'), 1)).toBe('Product Manager jobs in Pune — 1 open role | Saaf')
    expect(pageTitle('Product Manager', null, 0)).toBe('Product Manager jobs in India | Saaf')
  })
})

describe('the taxonomy is safe to put in a database filter', () => {
  it('every city spelling is plain letters, digits and spaces — no comma, bracket or dot to break an or() filter', () => {
    for (const c of CITIES) for (const p of cityPatterns(c)) expect(p, p).toMatch(/^[a-z0-9 ]+$/)
  })
  it('every role phrase is plain, so it can sit in an ilike filter', () => {
    for (const r of ALL_ROLES) expect(rolePhrase(r), r).toMatch(/^[a-z0-9+# ]+$/)
  })
})
