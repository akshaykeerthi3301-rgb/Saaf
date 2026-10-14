import { describe, expect, it } from 'vitest'
import { monthsOf, parseRange, pickRoles, unionMonths } from '../experience'

const AS_OF = new Date('2026-10-14T00:00:00Z')

describe('parseRange', () => {
  it('reads month-name, numeric and open-ended ranges', () => {
    expect(parseRange('Jan 2021 – Present', AS_OF)).toMatchObject({ start: { y: 2021, m: 1 }, open: true, endToken: 'Present' })
    expect(parseRange('03/19 - 08/22', AS_OF)).toMatchObject({ start: { y: 2019, m: 3 }, end: { y: 2022, m: 8 } })
    expect(parseRange('Jun’21 – Till date', AS_OF)).toMatchObject({ start: { y: 2021, m: 6 }, open: true })
    expect(parseRange('2019 – 2021', AS_OF)).toMatchObject({ start: { y: 2019, m: null }, end: { y: 2021, m: null }, precision: 'year' })
  })
  it('does not call a trailing dash current', () => {
    expect(parseRange('Jan 2021 –', AS_OF)).toMatchObject({ open: false, endMissing: true })
  })
  it('does not read words that merely start like a month', () => {
    expect(parseRange('Decision Sciences 2020', AS_OF).start).toEqual({ y: 2020, m: null })
  })
})

describe('experience months', () => {
  it('counts inclusively and unions overlaps (94, not 24 + 77 = 101)', () => {
    expect(monthsOf(parseRange('Jan 2021 – Mar 2021', AS_OF), AS_OF)?.mid).toBe(3)
    const u = unionMonths([parseRange('Jan 2019 – Dec 2020', AS_OF), parseRange('Jun 2020 – Present', AS_OF)], AS_OF)
    expect(u.mid).toBe(94)
  })
  it('brackets a year-only range instead of guessing one number', () => {
    const m = monthsOf(parseRange('2019 – 2021', AS_OF), AS_OF)!
    expect(m.low).toBeLessThan(m.mid)
    expect(m.mid).toBeLessThan(m.high)
  })
  it('reports a gap longer than 3 months and does not count it', () => {
    const u = unionMonths([parseRange('Jan 2019 – Dec 2019', AS_OF), parseRange('Jul 2020 – Dec 2020', AS_OF)], AS_OF)
    expect(u.mid).toBe(18)
    expect(u.gaps).toMatchObject([{ after: '2019-12', months: 6 }])
  })
})

describe('pickRoles', () => {
  const c = (dates: string, employmentType = 'unknown', order = 0) => ({ open: parseRange(dates, AS_OF).open, range: parseRange(dates, AS_OF), employmentType, order })
  it('prefers the primary open role over a freelance one, and says they were concurrent', () => {
    const r = pickRoles([c('Mar 2024 – Present', 'freelance', 0), c('Jan 2022 – Present', 'unknown', 1)], AS_OF)
    expect(r).toMatchObject({ current: 1, concurrent: true })
  })
  it('has no current role when nothing is open, only a latest', () => {
    const r = pickRoles([c('Jan 2019 – Dec 2020', 'unknown', 0), c('Jan 2021 – Mar 2023', 'unknown', 1)], AS_OF)
    expect(r).toMatchObject({ current: null, latest: 1 })
  })
  it('the role missing more (no employer AND a bare year) loses a tie to the one missing less', () => {
    const r = pickRoles([{ ...c('2026', 'unknown', 0), weak: 2 }, { ...c('Jun 2025 – Jul 2026', 'unknown', 1), weak: 1 }], AS_OF)
    expect(r.latest).toBe(1)
  })
})
