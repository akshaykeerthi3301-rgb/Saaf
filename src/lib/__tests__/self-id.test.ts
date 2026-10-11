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
    expect(SELF_ID_FIELDS.map((f) => f.key).sort()).toEqual(['caste', 'disability', 'ethnicity', 'gender', 'hispanic', 'lgbtq', 'marital', 'orientation', 'pronouns', 'religion', 'veteran'])
  })

  it('offers the same choices Jobright lists, so a candidate can tap instead of type', () => {
    const f = (k: string) => SELF_ID_FIELDS.find((x) => x.key === k)!
    expect(f('gender').options).toEqual(['Male', 'Female', 'Non-Binary'])
    expect(f('pronouns').options).toEqual(['He/Him', 'She/Her', 'They/Them', 'Other'])
    expect(f('ethnicity').options).toHaveLength(7)
    expect(f('orientation').options).toHaveLength(8)
    expect(['disability', 'veteran', 'hispanic', 'lgbtq'].every((k) => f(k).kind === 'yesno')).toBe(true)
  })

  it('keeps the two new yes/no answers and drops anything else for them', () => {
    expect(sanitizeSelfId({ lgbtq: 'No', hispanic: 'yes' })).toEqual({ lgbtq: 'no', hispanic: 'yes' })
    expect(sanitizeSelfId({ lgbtq: 'sometimes' })).toEqual({})
  })

  it('stores a declined answer as `decline` for any question, and marks the questions Jobright requires', () => {
    expect(sanitizeSelfId({ gender: 'Decline', disability: 'DECLINE', religion: 'decline' })).toEqual({ gender: 'decline', disability: 'decline', religion: 'decline' })
    expect(SELF_ID_FIELDS.filter((f) => f.required).map((f) => f.key).sort()).toEqual(['disability', 'ethnicity', 'gender', 'hispanic', 'lgbtq', 'orientation', 'veteran'])
  })
})
