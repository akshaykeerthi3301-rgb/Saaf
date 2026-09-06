import { describe, it, expect } from 'vitest'
import {
  bucketFor, locationRank, BUCKET_META,
  type ScoreBreakdown, type ScoreComponent, type ExperienceStanding, type LocationStanding,
} from '../score'

const comp = (key: ScoreComponent['key'], points: number, max: number): ScoreComponent =>
  ({ key, label: key, points, max, note: '' })

/** A breakdown as scoreRole writes them today, standings included. */
const build = (
  parts: Partial<Record<ScoreComponent['key'], [number, number]>>,
  confidence: 'high' | 'low' = 'high',
  standings: { experience?: ExperienceStanding; location?: LocationStanding } = {},
): ScoreBreakdown => ({
  total: 0,
  confidence,
  experience: standings.experience ?? 'meets',
  location: standings.location ?? 'exact',
  components: Object.entries(parts).map(([k, [p, m]]) =>
    comp(k as ScoreComponent['key'], p, m)),
})

/** A breakdown stored before the standings existed. */
const legacy = (
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

  it('separates a gap within the relaxation from one beyond it', () => {
    // CHANGED 2026-09-07. A gap of two years or less used to land in "Matches
    // you" — the relaxation was applied silently and put roles the candidate
    // does not qualify for at the top of the list. It now has its own bucket,
    // which says so in the heading.
    expect(bucketFor(build({ seniority: [13, 25] }, 'high', { experience: 'short' })))
      .toBe('experience_short')
    expect(bucketFor(build({ seniority: [6, 25] }, 'high', { experience: 'far_short' })))
      .toBe('experience_out')
  })

  it('calls location out of range for another city, but not hybrid, cluster or remote', () => {
    expect(bucketFor(build({}, 'high', { location: 'elsewhere' }))).toBe('location_out')
    expect(bucketFor(build({}, 'high', { location: 'hybrid' }))).toBe('matches')
    expect(bucketFor(build({}, 'high', { location: 'cluster' }))).toBe('matches')
    expect(bucketFor(build({}, 'high', { location: 'remote' }))).toBe('matches')
    expect(bucketFor(build({}, 'high', { location: 'exact' }))).toBe('matches')
  })

  it('reports the years before the city when both are out', () => {
    // Precedence, not a tie-break: the harder problem to solve is named first.
    expect(bucketFor(build({}, 'high', { experience: 'far_short', location: 'elsewhere' })))
      .toBe('experience_out')
  })

  it('sends an unreadable posting to "worth a look", not to a verdict', () => {
    expect(bucketFor(build({}, 'low', { experience: 'unread', location: 'exact' })))
      .toBe('worth_a_look')
  })

  it('prefers a known miss over an unknown one', () => {
    // Low confidence means we could not read the bar. A city we CAN read is the
    // stronger statement, so it wins.
    expect(bucketFor(build({}, 'low', { experience: 'unread', location: 'elsewhere' })))
      .toBe('location_out')
  })

  it('never throws on a missing or partial breakdown', () => {
    expect(bucketFor(null)).toBe('worth_a_look')
    expect(bucketFor(undefined)).toBe('worth_a_look')
    expect(bucketFor(build({}))).toBe('matches')
  })

  it('has display copy for every bucket it can return', () => {
    const keys = BUCKET_META.map((b) => b.key).sort()
    expect(keys).toEqual([
      'experience_out', 'experience_short', 'location_out', 'matches', 'worth_a_look',
    ])
  })
})

describe('below the stated bar is never a top choice', () => {
  // The two cases that prompted this: a candidate with 1.5 years against a
  // "2+ years" posting, and a candidate with 0 years against "1 - 5 years".
  // Both are under the floor, both used to land in "Matches you".
  it('separates a candidate who is short by any amount', () => {
    expect(bucketFor(build({ seniority: [18, 25] }, 'high', { experience: 'short' })))
      .toBe('experience_short')
    expect(bucketFor(build({ seniority: [13, 25] }, 'high', { experience: 'short' })))
      .toBe('experience_short')
  })

  it('keeps a candidate who meets or exceeds the bar in matches', () => {
    expect(bucketFor(build({ seniority: [25, 25] }, 'high', { experience: 'meets' }))).toBe('matches')
    expect(bucketFor(build({ seniority: [19, 25] }, 'high', { experience: 'unstated' }))).toBe('matches')
  })

  it('does not mistake an unread bar for a short candidate', () => {
    // Both score 50% of the component. One is a fact about the candidate, the
    // other an admission about us, and they must not share a bucket.
    expect(bucketFor(build({ seniority: [13, 25] }, 'low', { experience: 'unread' })))
      .toBe('worth_a_look')
    expect(bucketFor(build({ seniority: [13, 25] }, 'high', { experience: 'short' })))
      .toBe('experience_short')
  })

  it('still calls a gap beyond the relaxation out of range', () => {
    expect(bucketFor(build({ seniority: [6, 25] }, 'high', { experience: 'far_short' })))
      .toBe('experience_out')
  })

  it('will not call a role in the wrong city a good match', () => {
    expect(bucketFor(build({}, 'high', { experience: 'short', location: 'elsewhere' })))
      .toBe('location_out')
  })

  it('reads a pre-standings breakdown exactly as it was written', () => {
    expect(bucketFor(legacy({ seniority: [13, 25], location: [10, 10] }))).toBe('matches')
    expect(bucketFor(legacy({ seniority: [6, 25], location: [10, 10] }))).toBe('experience_out')
    expect(bucketFor(legacy({ seniority: [25, 25], location: [3, 10] }))).toBe('location_out')
  })
})

describe('locationRank', () => {
  it('puts the city the candidate asked for above the commute cluster', () => {
    expect(locationRank(build({}, 'high', { location: 'exact' }))).toBe(0)
    expect(locationRank(build({}, 'high', { location: 'remote' }))).toBe(0)
    expect(locationRank(build({}, 'high', { location: 'cluster' }))).toBe(1)
    expect(locationRank(build({}, 'high', { location: 'hybrid' }))).toBe(2)
  })

  it('sorts a weaker exact-city role above a stronger cluster one', () => {
    const delhi = { score: 61, b: build({}, 'high', { location: 'exact' }) }
    const noida = { score: 92, b: build({}, 'high', { location: 'cluster' }) }
    const order = [noida, delhi]
      .sort((a, b) => locationRank(a.b) - locationRank(b.b) || b.score - a.score)
      .map((r) => r.score)
    expect(order).toEqual([61, 92])
  })

  it('leaves a pre-standings row where it already was', () => {
    expect(locationRank(legacy({ location: [10, 10] }))).toBe(2)
  })
})
