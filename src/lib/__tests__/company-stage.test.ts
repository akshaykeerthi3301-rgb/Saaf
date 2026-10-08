import { describe, it, expect } from 'vitest'
import { stageChip, type StageRow } from '../company-stage'

const T: Record<string, StageRow> = {
  tcs: { p: 1, f: 1968, e: 600000 },
  razorpay: { f: 2014, e: 3000 },
  acmeai: { f: 2021, e: 80 },
  onlyyear: { f: 2022 },
  onlyheads: { e: 40 },
  oldsmall: { f: 1990, e: 50 },
}
const chip = (name: string) => stageChip(name, 2026, T)

describe('stage chips from open data', () => {
  it('calls a listed company Public, with where that comes from', () => {
    expect(chip('Tata Consultancy Services Ltd')?.label).toBeUndefined() // not in this fixture — absent, not guessed
    expect(chip('TCS Limited')?.label).toBe('Public')
    expect(chip('TCS')?.title).toContain('Wikidata')
  })
  it('calls a young AND small company a Startup, and shows the numbers it rests on', () => {
    const c = chip('Acme AI Inc')
    expect(c?.label).toBe('Startup')
    expect(c?.title).toContain('2021')
    expect(c?.title).toContain('80')
  })
  it('does not call it a startup on one fact alone, or when it is old or large', () => {
    for (const n of ['onlyyear', 'onlyheads', 'oldsmall', 'razorpay']) expect(chip(n)).toBeNull()
  })
  it('says nothing for an employer open data did not match', () => {
    expect(chip('Some Unknown Co')).toBeNull()
    expect(chip('')).toBeNull()
  })
  it('a listed company is Public even if it would otherwise look like a startup', () => {
    expect(stageChip('x', 2026, { x: { p: 1, f: 2020, e: 50 } })?.label).toBe('Public')
  })
})
