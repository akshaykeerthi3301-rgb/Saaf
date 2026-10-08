import { describe, it, expect } from 'vitest'
import { EMPTY_VIEW, parseFeedQuery, type FeedView } from '../feed-query'
import { planExplore, isOpenEnded, afterScoring, EXPLORE_SCAN, EXPLORE_SHOW } from '../explore'

const view = (o: Partial<FeedView>): FeedView => ({ ...EMPTY_VIEW, ...o })

describe('planExplore — the same parsed sentence, turned into what the database can honour', () => {
  it('reads words, city (with the scorer\'s own spellings), remote and a date window', () => {
    const p = planExplore(parseFeedQuery('remote data analyst jobs in Bangalore posted this week'))
    expect(p.tokens).toEqual(expect.arrayContaining(['data', 'analyst']))
    expect(p.cityPatterns).toEqual(expect.arrayContaining(['bengaluru', 'bangalore']))
    expect(p.remote).toBe(true)
    expect(p.postedDays).toBe(7)
  })
  it('takes the tighter of the date window and "fresh"', () => {
    expect(planExplore(view({ posted: '30', fresh: true })).postedDays).toBe(1)
    expect(planExplore(view({ posted: '7' })).postedDays).toBe(7)
    expect(planExplore(view({})).postedDays).toBeNull()
  })
  it('maps a contract filter to the employer\'s own words, with temporary filed under contract', () => {
    expect(planExplore(view({ type: 'contract' })).types).toEqual(['contract', 'temporary'])
    expect(planExplore(view({ type: 'fulltime' })).types).toEqual(['fulltime'])
    expect(planExplore(view({})).types).toEqual([])
  })
  it('strips wildcard and list characters from employer names and unknown cities — nothing typed can widen a pattern', () => {
    const p = planExplore(view({ skip: 'Acc%enture,TC_S,(x),@agencies', city: 'Pu%ne,(' }))
    expect(p.skipNames.join('|')).not.toMatch(/[%_,()\\]/)
    expect(p.skipAgencies).toBe(true)
    expect(p.cityPatterns.join('|')).not.toMatch(/[%_,()\\]/)
  })
  it('names what it cannot apply instead of dropping it silently', () => {
    const p = planExplore(view({ level: 'senior', pay: 15, sort: 'pay' }))
    expect(p.notApplied).toHaveLength(3)
    expect(p.notApplied.join(' ')).toMatch(/experience-level/)
    expect(p.notApplied.join(' ')).toMatch(/minimum-pay/)
    expect(planExplore(view({ remote: true })).notApplied).toEqual([])
  })
  it('refuses an open-ended search rather than reading "the newest 200 of everything"', () => {
    expect(isOpenEnded(planExplore(view({})))).toBe(true)
    expect(isOpenEnded(planExplore(view({ min80: true, easy: true })))).toBe(true)
    expect(isOpenEnded(planExplore(view({ q: 'analyst' })))).toBe(false)
    expect(isOpenEnded(planExplore(view({ remote: true })))).toBe(false)
  })
  it('keeps the scan and the display sizes the audit asked for', () => {
    expect(EXPLORE_SCAN).toBe(200)
    expect(EXPLORE_SHOW).toBeLessThanOrEqual(EXPLORE_SCAN)
  })
})

describe('afterScoring', () => {
  const r = (score: number, company: string, applyUrl: string | null, postedAt: string | null) => ({ score, company, applyUrl, postedAt })
  const rows = [
    r(70, 'Beta', 'https://jobs.lever.co/beta/1', '2026-10-01T00:00:00Z'),
    r(90, 'Acme', 'https://example.com/apply', '2026-09-01T00:00:00Z'),
    r(85, 'Randstad', 'https://boards.greenhouse.io/x/jobs/1', '2026-10-05T00:00:00Z'),
  ]
  it('orders best score first by default', () => {
    expect(afterScoring(rows, planExplore(view({}))).map((x) => x.company)).toEqual(['Acme', 'Randstad', 'Beta'])
  })
  it('applies Match > 80 and Easy Apply after scoring', () => {
    expect(afterScoring(rows, planExplore(view({ min80: true }))).map((x) => x.company)).toEqual(['Acme', 'Randstad'])
    expect(afterScoring(rows, planExplore(view({ easy: true }))).map((x) => x.company).sort()).toEqual(['Beta', 'Randstad'])
  })
  it('drops listed staffing agencies when asked, and honours newest-first and A–Z', () => {
    expect(afterScoring(rows, planExplore(view({ skip: '@agencies' }))).map((x) => x.company)).not.toContain('Randstad')
    expect(afterScoring(rows, planExplore(view({ sort: 'new' }))).map((x) => x.company)).toEqual(['Randstad', 'Beta', 'Acme'])
    expect(afterScoring(rows, planExplore(view({ sort: 'company' }))).map((x) => x.company)).toEqual(['Acme', 'Beta', 'Randstad'])
  })
})
