// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ScoreBreakdown } from '@/match/score'

/**
 * THE CARD'S BUDGET. Rebuilt 2026-10-09 to the reference product's card after the founder's verdict ("cluttered, not even
 * close"): chips, a title, "company / one line", a grid of facts, the actions — and a score panel. No paragraphs of
 * reasoning on the card (they open in the job's detail). These tests exist so the card cannot quietly grow back: a new
 * element on it has to change a number here, in review, on purpose.
 */
vi.mock('@/components/features/track-role', () => ({ TrackRole: () => createElement('button', { 'data-t': 'track' }, 'Track') }))
vi.mock('@/components/features/quick-apply', () => ({ QuickApply: () => createElement('button', { 'data-t': 'apply' }, 'Quick apply') }))

const { RoleCard } = await import('../role-card')

const comp = (key: string, points: number, max: number, note = `${key} note.`) => ({ key, label: key, points, max, note })
const breakdown = {
  total: 81,
  components: [comp('title', 28, 28, 'Title matches every word of the role you asked for.'), comp('skills', 4, 20, 'Mentions 1 of your skills: SQL.'), comp('seniority', 25, 25, 'Asks for 2–5 years; you have 2.'), comp('location', 10, 10)],
} as unknown as ScoreBreakdown

const html = (over: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(RoleCard, {
      roleId: 'r1', title: 'Customer Success Manager I', company: 'Diligent Corporation', city: 'Bengaluru', score: 81,
      breakdown, reason: 'Mentions 1 of your skills: SQL.', applyUrl: 'https://boards.greenhouse.io/x/jobs/1',
      postedAt: new Date(Date.now() - 16 * 86_400_000).toISOString(), isNew: true, statedPay: '₹12–15 LPA', connections: 2,
      hideControl: createElement('button', { 'data-t': 'hide' }, 'Hide'), ...over,
    }),
  )
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

describe('the role card keeps to its budget', () => {
  it('has one title, one score ring and one band word — and no paragraph of reasoning', () => {
    const h = html()
    expect(count(h, /<h3/g)).toBe(1)
    expect(count(h, /role="img"/g)).toBeGreaterThanOrEqual(1) // the ring (a second, small one rides beside the title on a phone)
    expect(h).toContain('Great match')
    expect(h).not.toContain('Why this matches')
    expect(h).not.toContain('Check first')
  })

  it('puts the company and the one-line gist on ONE line', () => {
    const h = html({ gist: 'You will own onboarding for mid-market accounts.' })
    const line = h.match(/<p class="mt-0\.5 truncate[^>]*>(.*?)<\/p>/)![1].replace(/<[^>]+>/g, '')
    expect(line).toBe('Diligent Corporation / You will own onboarding for mid-market accounts.')
  })

  it('shows the facts as a grid: city, type, mode, level, years and pay — only the ones that are true', () => {
    const full = html({ workMode: 'remote', employmentType: 'fulltime', minYears: 3 })
    for (const t of ['Bengaluru', 'Full-time', 'Remote', 'Entry', '3+ years exp', '₹12–15 LPA']) expect(full).toContain(t)
    const bare = html({ city: undefined, statedPay: null, title: 'Account Manager' })
    expect(bare).not.toContain('Full-time')
    expect(bare).not.toContain('Remote')
    expect(count(bare, /<ul class="mt-4 grid/g)).toBe(0) // no facts, no grid
  })

  it('shows at most four chips, and only the true ones', () => {
    const rows = html()
    expect(count(rows, /rounded-lg px-2 py-0\.5 text-xs font-medium/g)).toBeLessThanOrEqual(4)
    const bare = html({ isNew: false, postedAt: undefined, connections: 0 })
    expect(count(bare, /rounded-lg px-2 py-0\.5 text-xs font-medium/g)).toBe(0)
  })

  it('shows up to two ticks in the score panel, from what the arithmetic says is strong', () => {
    const h = html()
    expect(h).toContain('Title match') // title 28 of 28
    expect(count(h, /✓/g)).toBeLessThanOrEqual(2)
  })

  it('keeps the actions: hide, track and quick apply', () => {
    const h = html()
    for (const t of ['data-t="hide"', 'data-t="track"', 'data-t="apply"']) expect(h).toContain(t)
  })
})
