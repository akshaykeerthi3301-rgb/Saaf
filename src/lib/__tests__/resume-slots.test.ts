import { describe, it, expect } from 'vitest'
import { RESUME_SLOTS, slotNote } from '../resume-slots'

describe('slotNote', () => {
  it('counts free slots, singular and plural', () => {
    expect(slotNote(3, false)).toBe('3 of 10 saved — 7 slots free.')
    expect(slotNote(9, true)).toBe('9 of 10 saved — 1 slot free.')
  })
  it('says what happens at the limit, and that the primary is safe', () => {
    expect(slotNote(RESUME_SLOTS, true)).toContain('never your primary')
    expect(slotNote(RESUME_SLOTS, false)).toContain('Mark one primary')
  })
  it('does not go negative if the table ever holds more', () => {
    expect(slotNote(12, true)).toContain('10 of 10')
  })
})
