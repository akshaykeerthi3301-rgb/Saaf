import { describe, expect, it } from 'vitest'
import { monthsOf, parseRange, unionMonths, type Range } from '../experience'

/**
 * A second opinion on experience.ts, written differently on purpose.
 *  - The engine counts months with a SET of month indexes; the reference counts with closed-form arithmetic and merges
 *    sorted intervals. Two algorithms that must agree.
 *  - Dates are GENERATED from a known (year, month) and rendered in twelve written styles, then read back — so a
 *    style the reader mishandles fails with the string that broke it, not a vague mismatch.
 * Deterministic: a seeded generator, so a failure reproduces.
 */

const AS_OF = new Date('2026-10-14T00:00:00Z')
const AS_OF_IDX = 2026 * 12 + 9

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n: number) => String(n).padStart(2, '0')

/** Twelve ways Indian and global résumés write a month-and-year. */
const STYLES: ((y: number, m: number) => string)[] = [
  (y, m) => `${MON[m - 1]} ${y}`,
  (y, m) => `${LONG[m - 1]} ${y}`,
  (y, m) => `${MON[m - 1]}. ${y}`,
  (y, m) => `${MON[m - 1]}'${pad(y % 100)}`,
  (y, m) => `${MON[m - 1]}’${pad(y % 100)}`,
  (y, m) => `${MON[m - 1]}-${pad(y % 100)}`,
  (y, m) => `${MON[m - 1]}, ${y}`,
  (y, m) => `${pad(m)}/${y}`,
  (y, m) => `${pad(m)}/${pad(y % 100)}`,
  (y, m) => `${m}/${y}`,
  (y, m) => `${y}-${pad(m)}`,
  (y, m) => `${MON[m - 1].toUpperCase()} ${y}`,
]
const SEPS = [' - ', ' – ', ' — ', ' to ', '–', '-', ' – ']
const NOW = ['Present', 'Current', 'Till date', 'Till Date', 'To date', 'Ongoing', 'present', 'Currently']

type Iv = { s: number; e: number }
/** Reference: merge sorted intervals, sum closed-form lengths. */
function refUnion(ivs: Iv[]): number {
  const sorted = [...ivs].sort((a, b) => a.s - b.s)
  let total = 0
  let cur: Iv | null = null
  for (const iv of sorted) {
    if (cur && iv.s <= cur.e) cur = { s: cur.s, e: Math.max(cur.e, iv.e) }
    else { if (cur) total += cur.e - cur.s + 1; cur = { ...iv } }
  }
  if (cur) total += cur.e - cur.s + 1
  return total
}

describe('date styles round-trip', () => {
  it('reads every style back to the month it was generated from (4,000 random ranges)', () => {
    const r = rng(7)
    const bad: string[] = []
    for (let i = 0; i < 4000; i++) {
      const sy = 2005 + Math.floor(r() * 21)
      const sm = 1 + Math.floor(r() * 12)
      const span = Math.floor(r() * 90)
      let ey = sy + Math.floor((sm - 1 + span) / 12)
      let em = ((sm - 1 + span) % 12) + 1
      if (ey * 12 + em > AS_OF_IDX) { ey = 2026; em = 9 }
      const style = STYLES[Math.floor(r() * STYLES.length)]
      const open = r() < 0.2
      const text = `${style(sy, sm)}${SEPS[Math.floor(r() * SEPS.length)]}${open ? NOW[Math.floor(r() * NOW.length)] : style(ey, em)}`
      const got = parseRange(text, AS_OF)
      const ok = got.start?.y === sy && got.start?.m === sm && (open ? got.open : got.end?.y === ey && got.end?.m === em)
      if (!ok) bad.push(`${JSON.stringify(text)} → ${JSON.stringify({ s: got.start, e: got.end, open: got.open })}`)
    }
    expect(bad.slice(0, 12), `${bad.length} of 4000 misread`).toEqual([])
  })
})

describe('month arithmetic agrees with an independent reference', () => {
  it('single ranges: inclusive closed form', () => {
    const r = rng(11)
    for (let i = 0; i < 2000; i++) {
      const sy = 2000 + Math.floor(r() * 26), sm = 1 + Math.floor(r() * 12)
      const s = sy * 12 + sm - 1
      const e = Math.min(AS_OF_IDX, s + Math.floor(r() * 120))
      const range: Range = { start: { y: sy, m: sm }, end: { y: Math.floor(e / 12), m: (e % 12) + 1 }, open: false, endToken: null, endMissing: false, precision: 'month' }
      expect(monthsOf(range, AS_OF)?.mid, JSON.stringify(range)).toBe(e - s + 1)
    }
  })
  it('unions of many random overlapping ranges: set count = merged-interval sum', () => {
    const r = rng(23)
    for (let i = 0; i < 1500; i++) {
      const n = 1 + Math.floor(r() * 7)
      const ivs: Iv[] = []
      const ranges: Range[] = []
      for (let k = 0; k < n; k++) {
        const s = 2005 * 12 + Math.floor(r() * 250)
        const e = Math.min(AS_OF_IDX, s + Math.floor(r() * 70))
        if (s > AS_OF_IDX) continue
        ivs.push({ s, e })
        ranges.push({ start: { y: Math.floor(s / 12), m: (s % 12) + 1 }, end: { y: Math.floor(e / 12), m: (e % 12) + 1 }, open: false, endToken: null, endMissing: false, precision: 'month' })
      }
      expect(unionMonths(ranges, AS_OF).mid, JSON.stringify(ivs)).toBe(refUnion(ivs))
    }
  })
  it('the union never exceeds the sum of parts and never falls below the longest part', () => {
    const r = rng(31)
    for (let i = 0; i < 800; i++) {
      const ranges: Range[] = Array.from({ length: 1 + Math.floor(r() * 5) }, () => {
        const s = 2010 * 12 + Math.floor(r() * 190), e = Math.min(AS_OF_IDX, s + Math.floor(r() * 60))
        return { start: { y: Math.floor(s / 12), m: (s % 12) + 1 }, end: { y: Math.floor(e / 12), m: (e % 12) + 1 }, open: false, endToken: null, endMissing: false, precision: 'month' as const }
      })
      const parts = ranges.map((x) => monthsOf(x, AS_OF)!.mid)
      const u = unionMonths(ranges, AS_OF)
      expect(u.mid).toBeLessThanOrEqual(parts.reduce((a, b) => a + b, 0))
      expect(u.mid).toBeGreaterThanOrEqual(Math.max(...parts))
      expect(u.low).toBeLessThanOrEqual(u.mid)
      expect(u.mid).toBeLessThanOrEqual(u.high)
    }
  })
})

describe('written forms that have misled date readers', () => {
  const cases: [string, { y: number; m: number | null } | null, { y: number; m: number | null } | 'open' | null][] = [
    ['Jan 15, 2021 – Mar 20, 2022', { y: 2021, m: 1 }, { y: 2022, m: 3 }], // a DAY is not a year: must not read Jan 2015
    ['15 Jan 2021 – 20 Mar 2022', { y: 2021, m: 1 }, { y: 2022, m: 3 }],
    ['Sept 2020 – Dec 2021', { y: 2020, m: 9 }, { y: 2021, m: 12 }],
    ['Sept\'20 – Dec\'21', { y: 2020, m: 9 }, { y: 2021, m: 12 }],
    ['2019 – 21', { y: 2019, m: null }, { y: 2021, m: null }], // two-digit end year after a four-digit start
    ['2019-2021', { y: 2019, m: null }, { y: 2021, m: null }],
    ['2021', { y: 2021, m: null }, { y: 2021, m: null }],
    ['03/19 - 08/22', { y: 2019, m: 3 }, { y: 2022, m: 8 }],
    ['March 2020 - Present', { y: 2020, m: 3 }, 'open'],
    ['since Jan 2021', { y: 2021, m: 1 }, { y: 2021, m: 1 }],
    ['Jan – Mar 2021', { y: 2021, m: 3 }, { y: 2021, m: 3 }], // shared year: only one datable point; must not invent January 2000-something
  ]
  for (const [text, start, end] of cases) {
    it(`reads ${JSON.stringify(text)}`, () => {
      const r = parseRange(text, AS_OF)
      expect(r.start).toEqual(start)
      if (end === 'open') expect(r.open).toBe(true)
      else expect(r.end).toEqual(end)
    })
  }
})
