import { describe, it, expect } from 'vitest'
import { functionGap } from '../function-gap'

describe('functionGap', () => {
  it('names the requirement for each under-read function', () => {
    expect(functionGap('growth marketing lead')?.function).toBe('marketing')
    expect(functionGap('management consultant')?.function).toBe('consulting')
    expect(functionGap('HRBP')?.function).toBe('hr')
    expect(functionGap('talent acquisition partner')?.function).toBe('hr')
  })

  it('says nothing for functions the score actually reads', () => {
    expect(functionGap('backend engineer')).toBeNull()
    expect(functionGap('financial planning and analysis')).toBeNull()
    expect(functionGap('product manager')).toBeNull()
  })

  // A false positive tells a candidate their score is missing something when it
  // is not. These are the near-misses that made the patterns narrow.
  it('does not fire on titles that merely contain a matching substring', () => {
    expect(functionGap('growth engineer')).toBeNull()
    expect(functionGap('strategy and operations')).toBeNull()
    expect(functionGap('threat analyst')).toBeNull()   // "hr" inside "threat"
    expect(functionGap('chrome platform engineer')).toBeNull() // "hr" inside "chrome"
  })

  it('is null-safe — an unconfirmed profile has no preferred role', () => {
    expect(functionGap(null)).toBeNull()
    expect(functionGap(undefined)).toBeNull()
    expect(functionGap('')).toBeNull()
  })
})
