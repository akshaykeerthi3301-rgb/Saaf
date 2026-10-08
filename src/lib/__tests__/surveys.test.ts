import { describe, it, expect } from 'vitest'
import { countVisit, eligible, EMPTY_VISITS, parseVisits, SURVEYS, surveyById, validAnswer } from '../surveys'

describe('surveys', () => {
  const s = SURVEYS[0]
  it('accepts only the survey’s own options', () => {
    expect(validAnswer(s, 'Very')).toBe(true)
    for (const bad of ['', 'very', 'Maybe', '<script>', 'x'.repeat(100)]) expect(validAnswer(s, bad)).toBe(false)
  })
  it('knows which survey an id means, and none for an unknown one', () => {
    expect(surveyById(s.id)).toBe(s)
    expect(surveyById('nope')).toBeNull()
  })
  it('asks only people who have been back enough to have an opinion', () => {
    expect(eligible(s, { n: s.minVisits - 1, lastSession: 'a' })).toBe(false)
    expect(eligible(s, { n: s.minVisits, lastSession: 'a' })).toBe(true)
  })
  it('counts a visit once per session, however many pages are opened', () => {
    let v = EMPTY_VISITS
    v = countVisit(v, 's1'); v = countVisit(v, 's1'); v = countVisit(v, 's1')
    expect(v.n).toBe(1)
    expect(countVisit(v, 's2').n).toBe(2)
  })
  it('reads garbage in storage as a fresh start', () => {
    for (const raw of [null, '', 'nope', '{"n":-3}', '{"n":"4"}', '[]']) expect(parseVisits(raw).n).toBe(0)
    expect(parseVisits('{"n":5,"lastSession":"x"}')).toEqual({ n: 5, lastSession: 'x' })
  })
  it('has no payment survey — nothing is for sale', () => {
    expect(SURVEYS.map((x) => x.question).join(' ')).not.toMatch(/upgrade|pay|price|subscribe/i)
  })
})
