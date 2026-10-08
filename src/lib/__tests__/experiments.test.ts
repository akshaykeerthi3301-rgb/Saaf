import { describe, it, expect } from 'vitest'
import { assign, bucket, EXPERIMENTS, isLive, variantFor, type Experiment } from '../experiments'

const exp = (over: Partial<Experiment> = {}): Experiment => ({ id: 'e1', description: 'x', variants: ['control', 'b'], enabled: true, ...over })
const NOW = new Date('2026-10-08T00:00:00Z')

describe('bucketing', () => {
  it('is stable: the same person and experiment always land in the same place', () => {
    expect(bucket('user-1', 'e1')).toBe(bucket('user-1', 'e1'))
  })
  it('is independent across experiments — being in B of one says nothing about another', () => {
    const same = Array.from({ length: 400 }, (_, i) => (bucket(`u${i}`, 'e1') < 0.5) === (bucket(`u${i}`, 'e2') < 0.5)).filter(Boolean).length
    expect(same).toBeGreaterThan(140)
    expect(same).toBeLessThan(260) // ~200 if independent; ~400 if correlated
  })
  it('splits an even two-way test close to 50/50 over 10,000 people', () => {
    const b = Array.from({ length: 10_000 }, (_, i) => assign(`user-${i}`, exp(), NOW)).filter((v) => v === 'b').length
    expect(b).toBeGreaterThan(4_700)
    expect(b).toBeLessThan(5_300)
  })
  it('honours weights', () => {
    const e = exp({ weights: [90, 10] })
    const b = Array.from({ length: 10_000 }, (_, i) => assign(`user-${i}`, e, NOW)).filter((v) => v === 'b').length
    expect(b).toBeGreaterThan(800)
    expect(b).toBeLessThan(1_200)
  })
  it('ignores weights that do not add up to 100 instead of half-assigning', () => {
    const b = Array.from({ length: 2_000 }, (_, i) => assign(`user-${i}`, exp({ weights: [90, 5] }), NOW)).filter((v) => v === 'b').length
    expect(b).toBeGreaterThan(850) // fell back to an even split
  })
})

describe('the control for everyone who is not cleanly in', () => {
  it('a disabled experiment, a past end date, the global switch, an empty subject', () => {
    expect(assign('u', exp({ enabled: false }), NOW)).toBe('control')
    expect(assign('u', exp({ endsOn: '2026-10-01' }), NOW)).toBe('control')
    expect(assign('u', exp(), NOW, true)).toBe('control')
    expect(assign('', exp(), NOW)).toBe('control')
  })
  it('isLive reads the end date and the switch', () => {
    expect(isLive(exp({ endsOn: '2026-12-31' }), NOW, false)).toBe(true)
    expect(isLive(exp({ endsOn: '2026-01-01' }), NOW, false)).toBe(false)
  })
  it('an unknown experiment is null — "no flag" — never a guess', () => {
    expect(variantFor('u', 'nope', [exp()], NOW)).toBeNull()
    expect(variantFor('u', 'e1', [exp()], NOW)).toMatch(/control|b/)
  })
})

describe('the registry', () => {
  it('has no experiment running — adding one is a deliberate act', () => {
    expect(EXPERIMENTS).toHaveLength(0)
  })
})
