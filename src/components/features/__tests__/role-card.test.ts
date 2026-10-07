// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ScoreBreakdown } from '@/match/score'

/**
 * THE CARD'S BUDGET (docs/DESIGN.md: "four rows of text, and that is the budget").
 *
 * The card was cut from nine rows to four on 2026-09-07 and grew back to about twenty
 * things through the parity passes; the founder called the feed cluttered on
 * 2026-10-08. These tests exist so that cannot happen quietly again: a new element on
 * the card has to change a number in this file, in review, on purpose.
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
  it('has one title, one facts line, one why paragraph, one score ring and one band word', () => {
    const h = html()
    expect(count(h, /<h3/g)).toBe(1)
    expect(count(h, /Why this matches:/g)).toBe(1)
    expect(count(h, /role="img"/g)).toBe(1) // the ring
    expect(h).toContain('HIGH-PRECISION MATCH'.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace('High-Precision Match', 'High-precision match'))
  })

  it('puts company, city, level and stated pay on ONE line', () => {
    const h = html()
    const line = h.match(/<p class="mt-0\.5 truncate[^>]*>(.*?)<\/p>/)![1].replace(/<[^>]+>/g, '')
    expect(line).toBe('Diligent Corporation · Bengaluru · Entry · ₹12–15 LPA')
  })

  it('shows at most four chips, and only the true ones', () => {
    const rows = html()
    expect(count(rows, /rounded-full px-2 py-0\.5 text-\[11px\]/g)).toBeLessThanOrEqual(4)
    const bare = html({ isNew: false, postedAt: undefined, connections: 0, breakdown: { ...breakdown, confidence: 'high' } })
    expect(count(bare, /rounded-full px-2 py-0\.5 text-\[11px\]/g)).toBe(0)
  })

  it('shows the reason in full, once, inside the one paragraph — never dropped', () => {
    const h = html({ reason: 'Mentions 1 of your skills: SQL, and a very long reason that must stay on the face of the card in full.' })
    expect(h).toContain('a very long reason that must stay on the face of the card in full.')
    expect(count(h, /Mentions 1 of your skills/g)).toBe(1)
  })

  it('shows three bars — Role, Skills, Experience — each with its percentage', () => {
    const h = html()
    expect(h).toContain('aria-label="Score parts"')
    for (const [label, pct] of [['Role', '100%'], ['Skills', '20%'], ['Experience', '100%']]) {
      expect(h).toContain(`<span>${label}</span>`)
      expect(h).toContain(pct)
    }
  })

  it('leaves out a bar for a part that was not scored, rather than drawing a zero', () => {
    const h = html({ breakdown: { total: 70, components: [comp('title', 28, 28), comp('seniority', 25, 25)] } as unknown as ScoreBreakdown })
    expect(h).not.toContain('<span>Skills</span>')
  })

  it('has exactly the actions: save, hide and apply — nothing else to press', () => {
    const h = html()
    expect(count(h, /<button/g)).toBe(3)
    expect(h).toContain('data-t="track"')
    expect(h).toContain('data-t="hide"')
    expect(h).toContain('data-t="apply"')
  })

  it('does not bring back what was moved to the detail panel', () => {
    const h = html()
    for (const gone of ['Insights', 'View detailed match', 'looks wrong', 'Easy Apply', 'High-precision match</span><span', 'strong on', 'score factors', 'Check first: undefined']) {
      expect(h, gone).not.toContain(gone)
    }
  })

  it('keeps the tour anchor', () => {
    expect(html()).toContain('data-tour="card"')
  })

  it('renders without a posting date, city, pay, apply link or breakdown', () => {
    const h = html({ postedAt: undefined, city: undefined, statedPay: null, applyUrl: undefined, breakdown: null, isNew: false, connections: undefined })
    expect(h).toContain('Customer Success Manager I')
    expect(h).not.toContain('data-t="apply"')
    expect(h).not.toContain('Score parts')
  })

  it('names a "check first" only when the score has a gap to name', () => {
    const gapped = html({ breakdown: { total: 40, components: [comp('title', 28, 28, 'Title matches.'), comp('seniority', 3, 25, 'Asks for 8 years; you have 2.')] } as unknown as ScoreBreakdown, reason: 'Short on experience.' })
    expect(gapped).toContain('Check first:')
  })
})
