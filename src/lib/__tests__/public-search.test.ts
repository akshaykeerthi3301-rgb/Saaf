import { describe, it, expect } from 'vitest'
import { cleanPage, MAX_PAGE, searchTokens } from '../public-search'

describe('public search', () => {
  it('turns a typed query into a few plain words', () => {
    expect(searchTokens('Product Analyst, Razorpay')).toEqual(['product', 'analyst', 'razorpay'])
    expect(searchTokens('C++ / C# developer')).toEqual(['c++', 'c#', 'developer'])
    expect(searchTokens('node.js')).toEqual(['node', 'js'])
  })
  it('cannot carry anything that would change a database filter', () => {
    for (const nasty of ['a,b.eq.1', 'x),title.ilike.%', '"; drop table roles;--', '%25%25', 'name(id)', "o'brien", '\\']) {
      for (const t of searchTokens(nasty)) expect(t, nasty).toMatch(/^[\p{L}\p{N}+#]+$/u)
    }
    expect(searchTokens('x),title.ilike.%')).not.toContain(')')
  })
  it('caps the number and length of words, and ignores non-text', () => {
    expect(searchTokens('one two three four five six seven')).toHaveLength(5)
    expect(searchTokens('a'.repeat(200))[0]).toHaveLength(30)
    expect(searchTokens('a b')).toEqual([])
    for (const v of [undefined, null, 5, {}, []]) expect(searchTokens(v)).toEqual([])
  })
  it('the list is three pages deep and no deeper', () => {
    expect([cleanPage(undefined), cleanPage('0'), cleanPage('-4'), cleanPage('2'), cleanPage('9999'), cleanPage('abc')]).toEqual([1, 1, 1, 2, MAX_PAGE, 1])
  })
})
