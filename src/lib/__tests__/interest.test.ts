import { describe, it, expect } from 'vitest'
import { interestChip, INTEREST_MIN } from '../interest'

describe('interestChip', () => {
  it('is silent below the privacy floor, whatever it is handed', () => {
    for (const n of [undefined, null, 0, 1, INTEREST_MIN - 1, -5, NaN, 2.5]) expect(interestChip(n as number)).toBeNull()
  })
  it('shows the exact count we were given from the floor up — never a rounded or padded one', () => {
    expect(interestChip(3)?.label).toBe('3 tracking')
    expect(interestChip(57)?.label).toBe('57 tracking')
  })
  it('says what the number is and what it is not', () => {
    const t = interestChip(4)?.title ?? ''
    expect(t).toContain('own tracker')
    expect(t).toContain('not the number of applicants')
  })
})
