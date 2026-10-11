import { describe, expect, it } from 'vitest'
import { MAX_ROLES, addRole, makeMain, removeRole, splitRoles } from '@/lib/role-list'

describe('role list', () => {
  it('adds every pick instead of replacing the last (the reported bug)', () => {
    let list: string[] = []
    list = addRole(list, 'Account Manager')
    list = addRole(list, 'Customer Success Manager')
    expect(list).toEqual(['Account Manager', 'Customer Success Manager'])
  })
  it('ignores blanks and case-insensitive duplicates, and stops at five', () => {
    expect(addRole(['Account Manager'], ' account manager ')).toEqual(['Account Manager'])
    expect(addRole(['a'], '   ')).toEqual(['a'])
    const full = ['a', 'b', 'c', 'd', 'e']
    expect(full).toHaveLength(MAX_ROLES)
    expect(addRole(full, 'f')).toBe(full)
  })
  it('makes a role main and removes one', () => {
    expect(makeMain(['a', 'b', 'c'], 'C')).toEqual(['c', 'a', 'b'])
    expect(makeMain(['a'], 'zzz')).toEqual(['a'])
    expect(removeRole(['a', 'b'], 'A')).toEqual(['b'])
  })
  it('splits into the stored main role and the rest', () => {
    expect(splitRoles(['a', 'b', 'c'])).toEqual({ primary: 'a', extras: ['b', 'c'] })
    expect(splitRoles([])).toEqual({ primary: '', extras: [] })
  })
})
