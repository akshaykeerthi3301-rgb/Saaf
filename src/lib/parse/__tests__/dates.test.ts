import { describe, expect, it } from 'vitest'
import { dateRange } from '../dates'

describe('dateRange', () => {
  it.each(['Jan 2021 - Present', 'Jan 2021 – Mar 2022', '2019 - 2021', '07/2023 - 09/2024', 'Jun. 2023 to Jul. 2024', "Jan'21 - Aug'26", '03/19 - 08/22', '03/19 – Till date'])('reads %s', (t) => {
    expect(dateRange().test(t)).toBe(true)
  })
  it.each(['12.50 - 15.00 LPA', 'Python 3.10 - 3.12', 'Scored 78/100 - 85/100', 'Grew revenue 12/34 - 56/78', 'iOS 14 - 17'])('does NOT read %s as a date range', (t) => {
    expect(dateRange().test(t)).toBe(false)
  })
})
