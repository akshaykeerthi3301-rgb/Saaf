import { describe, it, expect } from 'vitest'
import { hiringSignals } from '../hiring-signals'

const NOW = Date.parse('2026-10-08T00:00:00Z')
const row = (fn: string | null, daysAgo: number) => ({ function: fn, first_seen_at: new Date(NOW - daysAgo * 86_400_000).toISOString() })

describe('hiringSignals', () => {
  it('counts roles first seen in the last 30 days, exactly', () => {
    const h = hiringSignals([row('engineering', 2), row('engineering', 29), row('finance', 31), row('hr', 90)], NOW)
    expect(h.newLast30).toEqual({ count: 2, atLeast: false })
  })
  it('names the top three functions, most first, in words', () => {
    const h = hiringSignals([row('engineering', 1), row('engineering', 1), row('engineering', 1), row('finance', 1), row('finance', 1), row('hr', 1), row('marketing', 1)], NOW)
    expect(h.functions).toEqual([{ name: 'Engineering', count: 3 }, { name: 'Finance', count: 2 }, { name: 'HR', count: 1 }])
  })
  it('says "at least" only when a full sample is entirely new — there may be more we did not read', () => {
    const full = Array.from({ length: 200 }, () => row('engineering', 1))
    expect(hiringSignals(full, NOW, 200).newLast30).toEqual({ count: 200, atLeast: true })
    expect(hiringSignals([...full.slice(1), row('engineering', 60)], NOW, 200).newLast30.atLeast).toBe(false)
  })
  it('names every function the database allows, and capitalises one it has not heard of', () => {
    const h = hiringSignals([row('support', 1), row('support', 1), row('sales', 1), row('operations', 1), row('design', 1), row('legal', 1)], NOW)
    expect(h.functions.map((f) => f.name)).toEqual(['Support', 'Sales', 'Operations'])
    expect(hiringSignals([row('legal', 1)], NOW).functions[0].name).toBe('Legal')
  })
  it('survives no rows, bad dates and no function', () => {
    expect(hiringSignals([], NOW)).toEqual({ newLast30: { count: 0, atLeast: false }, functions: [] })
    expect(hiringSignals([{ function: null, first_seen_at: 'not a date' }], NOW).newLast30.count).toBe(0)
  })
})
