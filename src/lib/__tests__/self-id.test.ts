import { describe, it, expect } from 'vitest'
import { SELF_ID_FIELDS, sanitizeSelfId } from '../self-id'

describe('sanitizeSelfId — only what the candidate typed survives', () => {
  it('keeps typed answers, trimmed and collapsed', () => {
    expect(sanitizeSelfId({ gender: '  Non   binary ', pronouns: 'they/them', disability: ' No ' }))
      .toEqual({ gender: 'Non binary', pronouns: 'they/them', disability: 'no' })
  })

  it('treats blank as "prefer not to say" — the key is absent, not empty', () => {
    expect(sanitizeSelfId({ gender: '', religion: '   ', caste: null })).toEqual({})
  })

  it('drops a yes/no question answered with anything else rather than guessing yes or no', () => {
    expect(sanitizeSelfId({ disability: 'maybe', veteran: 'true' })).toEqual({})
  })

  it('drops keys we do not ask — date of birth, age and pregnancy can never be stored', () => {
    expect(sanitizeSelfId({ dob: '1999-01-01', dateOfBirth: '1/1/99', age: '27', pregnant: 'no', gender: 'Female' })).toEqual({ gender: 'Female' })
  })

  it('survives hostile input without throwing', () => {
    for (const bad of [null, undefined, 'x', 42, [], [['gender', 'Male']], { __proto__: { gender: 'Male' } }]) {
      expect(() => sanitizeSelfId(bad)).not.toThrow()
    }
    expect(sanitizeSelfId(['gender'])).toEqual({})
  })

  it('bounds every answer to 60 characters', () => {
    expect(sanitizeSelfId({ religion: 'x'.repeat(500) }).religion).toHaveLength(60)
  })

  it('the form asks exactly the questions the extension recognises', () => {
    expect(SELF_ID_FIELDS.map((f) => f.key).sort()).toEqual(['caste', 'disability', 'ethnicity', 'gender', 'marital', 'orientation', 'pronouns', 'religion', 'veteran'])
  })
})
