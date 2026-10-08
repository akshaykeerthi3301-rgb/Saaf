import { describe, it, expect } from 'vitest'
import { AGENCY_NAMES, isStaffingAgency } from '../taxonomy/agencies'

describe('the staffing-agency list', () => {
  it('matches the employer however the posting spells it', () => {
    for (const n of ['Randstad', 'Randstad India Pvt Ltd', 'RANDSTAD', 'Hudsonmanpower', 'mthree Recruiting Portal', 'Apna']) expect(isStaffingAgency(n)).toBe(true)
  })
  it('does not match by "contains": a direct employer that shares a word stays', () => {
    for (const n of ['Qube Research & Technologies', 'Talent Pipeline Software', 'Pagerduty', 'Hayscale', 'Appnaut', 'Manpowerless Labs', '']) expect(isStaffingAgency(n)).toBe(false)
  })
  it('keeps job boards and consultancies that post their OWN roles out of it', () => {
    for (const n of ['ZipRecruiter', 'Naukri', 'Indeed', 'Korn Ferry']) expect(isStaffingAgency(n)).toBe(false)
  })
  it('has no duplicate normalised names', () => {
    expect(AGENCY_NAMES.length).toBeGreaterThan(10)
  })
})
