import { describe, it, expect } from 'vitest'
import { bucketFor, BUCKET_META, type ScoreBreakdown, type ScoreComponent } from '../score'

const comp = (key: ScoreComponent['key'], points: number, max: number): ScoreComponent =>
  ({ key, label: key, points, max, note: '' })

const build = (
  parts: Partial<Record<ScoreComponent['key'], [number, number]>>,
  confidence: 'high' | 'low' = 'high',
): ScoreBreakdown => ({
  total: 0,
  confidence,
  components: Object.entries(parts).map(([k, [p, m]]) =>
    comp(k as ScoreComponent['key'], p, m)),
})

describe('bucketFor', () => {
  it('puts a clean match in "matches you"', () => {
    expect(bucketFor(build({ seniority: [25, 25], location: [10, 10] }))).toBe('matches')
  })

  it('calls experience out of range only past a two-year gap', () => {
    // The scorer's own ratios: 0.5 is a gap of two years or less — still a
    // stretch worth showing in the main list, not an exclusion.
    expect(bucketFor(build({ seniority: [13, 25], location: [10, 10] }))).toBe('matches')
    // 0.25 is a gap of up to four years; 0.05 is beyond that. Both are out.
    expect(bucketFor(build({ seniority: [6, 25], location: [10, 10] }))).toBe('experience_out')
    expect(bucketFor(build({ seniority: [1, 25], location: [10, 10] }))).toBe('experience_out')
  })

  it('calls location out of range for another city, but not hybrid or remote', () => {
    expect(bucketFor(build({ seniority: [25, 25], location: [3, 10] }))).toBe('location_out')
    expect(bucketFor(build({ seniority: [25, 25], location: [6, 10] }))).toBe('matches') // hybrid
    expect(bucketFor(build({ seniority: [25, 25], location: [10, 10] }))).toBe('matches') // remote/in-city
  })

  it('reports the years before the city when both are out', () => {
    // Precedence, not a tie-break: the harder problem to solve is named first.
    expect(bucketFor(build({ seniority: [1, 25], location: [3, 10] }))).toBe('experience_out')
  })

  it('sends an unreadable posting to "worth a look", not to a verdict', () => {
    expect(bucketFor(build({ seniority: [13, 25], location: [10, 10] }, 'low'))).toBe('worth_a_look')
  })

  it('prefers a known miss over an unknown one', () => {
    // Low confidence means we could not read the bar. A city we CAN read is the
    // stronger statement, so it wins.
    expect(bucketFor(build({ seniority: [13, 25], location: [3, 10] }, 'low'))).toBe('location_out')
  })

  it('never throws on a missing or partial breakdown', () => {
    expect(bucketFor(null)).toBe('worth_a_look')
    expect(bucketFor(undefined)).toBe('worth_a_look')
    expect(bucketFor(build({}))).toBe('matches')
  })

  it('has display copy for every bucket it can return', () => {
    const keys = BUCKET_META.map((b) => b.key).sort()
    expect(keys).toEqual(['experience_out', 'location_out', 'matches', 'worth_a_look'])
  })
})
