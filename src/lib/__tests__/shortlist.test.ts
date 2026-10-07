import { describe, it, expect } from 'vitest'
import type { ScoreBreakdown } from '@/match/score'
import {
  applyQuickPills, arrangeShortlist, cardsToShow, holdingLine, withinReach,
  CARDS_PER_BUCKET, SHOW_MORE_STEP, type ArrangeableRow,
} from '../shortlist'

const NOW = Date.parse('2026-09-23T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

type Loc = 'exact' | 'remote' | 'cluster' | 'elsewhere' | undefined
type Exp = 'meets' | 'unstated' | 'short' | 'over' | 'under' | undefined

let seq = 0
function row(score: number | null, location: Loc, experience: Exp = 'meets'): ArrangeableRow {
  seq += 1
  return {
    id: `g${seq}`,
    role_id: `r${seq}`,
    score,
    score_breakdown: { total: score ?? 0, components: [], confidence: 'high', location, experience } as unknown as ScoreBreakdown,
  }
}

const base = { onlyNew: false, byNewest: false, clearsOnly: false, now: NOW }

describe('arrangeShortlist — sections', () => {
  it('splits on location alone: exact, remote and the commute cluster are near; the rest far', () => {
    const rows = [row(80, 'exact'), row(70, 'remote'), row(60, 'cluster'), row(90, 'elsewhere'), row(50, undefined)]
    const { sections, farCount } = arrangeShortlist(rows, new Map(), base)
    const [near, far] = sections
    expect(near.rows.map((r) => r.score)).toEqual([80, 70, 60])
    // A row stored before standings existed sorts with the far group.
    expect(far.rows.map((r) => r.score)).toEqual([90, 50])
    expect(farCount).toBe(2)
  })

  it('orders best match first, and on a tie the exact city beats the cluster', () => {
    const cluster = row(70, 'cluster')
    const exact = row(70, 'exact')
    const { sections } = arrangeShortlist([cluster, row(40, 'exact'), exact], new Map(), base)
    expect(sections[0].rows.map((r) => r.id)).toEqual([exact.id, cluster.id, sections[0].rows[2].id])
    expect(sections[0].rows[2].score).toBe(40)
  })

  it('treats a null score as zero rather than dropping the row', () => {
    const { sections } = arrangeShortlist([row(null, 'exact'), row(10, 'exact')], new Map(), base)
    expect(sections[0].rows.map((r) => r.score)).toEqual([10, null])
  })

  it('counts strong matches (75+) across every row, whatever the filters', () => {
    const rows = [row(75, 'exact'), row(90, 'elsewhere', 'under'), row(74, 'exact')]
    expect(arrangeShortlist(rows, new Map(), { ...base, clearsOnly: true }).strong).toBe(2)
  })
})

describe('arrangeShortlist — new and newest', () => {
  it('"new" means first shown inside seven days, and the tab narrows to those', () => {
    const fresh = row(50, 'exact')
    const old = row(90, 'exact')
    const never = row(70, 'exact')
    const shown = new Map([[fresh.role_id, daysAgo(2)], [old.role_id, daysAgo(8)]])
    const all = arrangeShortlist([fresh, old, never], shown, base)
    expect(all.newCount).toBe(1)
    expect(all.isNew(fresh)).toBe(true)
    expect(all.isNew(old)).toBe(false)
    expect(all.isNew(never)).toBe(false)

    const onlyNew = arrangeShortlist([fresh, old, never], shown, { ...base, onlyNew: true })
    expect(onlyNew.visibleCount).toBe(1)
    expect(onlyNew.sections[0].rows).toEqual([fresh])
  })

  it('newest sorts by first-shown descending, then by score', () => {
    const a = row(40, 'exact')
    const b = row(90, 'exact')
    const c = row(60, 'exact')
    const shown = new Map([[a.role_id, daysAgo(1)], [b.role_id, daysAgo(3)], [c.role_id, daysAgo(1)]])
    const { sections } = arrangeShortlist([a, b, c], shown, { ...base, byNewest: true })
    expect(sections[0].rows.map((r) => r.id)).toEqual([c.id, a.id, b.id])
  })
})

describe('Newest — newest posted, where the board said when (QA-11)', () => {
  it('puts the most recently posted first, whatever order they were shown in', () => {
    const old = row(90, 'exact')
    const fresh = row(40, 'exact')
    // Shown the other way round: the old posting reached this candidate last.
    const shown = new Map([[old.role_id, daysAgo(1)], [fresh.role_id, daysAgo(5)]])
    const postedAt = new Map([[old.role_id, '2024-07-09T00:00:00Z'], [fresh.role_id, '2026-09-20T00:00:00Z']])
    const { sections } = arrangeShortlist([old, fresh], shown, { ...base, byNewest: true, postedAt })
    expect(sections[0].rows.map((r) => r.id)).toEqual([fresh.id, old.id])
  })

  it('compares instants, not strings, across offsets', () => {
    const a = row(50, 'exact')
    const b = row(50, 'exact')
    // 00:30 +05:30 is 19:00Z the previous day — earlier than b, though it sorts later as text.
    const postedAt = new Map([[a.role_id, '2026-09-20T00:30:00+05:30'], [b.role_id, '2026-09-19T20:00:00Z']])
    const { sections } = arrangeShortlist([a, b], new Map(), { ...base, byNewest: true, postedAt })
    expect(sections[0].rows.map((r) => r.id)).toEqual([b.id, a.id])
  })

  it('lists undated roles after dated ones, in first-shown order', () => {
    const dated = row(10, 'exact')
    const undatedRecent = row(20, 'exact')
    const undatedOld = row(99, 'exact')
    const shown = new Map([[undatedRecent.role_id, daysAgo(1)], [undatedOld.role_id, daysAgo(9)], [dated.role_id, daysAgo(30)]])
    const postedAt = new Map([[dated.role_id, '2025-01-01T00:00:00Z']])
    const { sections } = arrangeShortlist([undatedOld, dated, undatedRecent], shown, { ...base, byNewest: true, postedAt })
    expect(sections[0].rows.map((r) => r.id)).toEqual([dated.id, undatedRecent.id, undatedOld.id])
  })
})

describe('Within reach', () => {
  it('keeps meets, unstated, short and over; drops under', () => {
    expect(['meets', 'unstated', 'short', 'over'].map((e) => withinReach(row(50, 'exact', e as Exp)))).toEqual([true, true, true, true])
    expect(withinReach(row(50, 'exact', 'under'))).toBe(false)
  })

  it('filters the section but reports the pre-filter total, so the hidden count can be stated', () => {
    const rows = [row(80, 'exact', 'meets'), row(70, 'exact', 'under'), row(60, 'exact', 'under')]
    const [near] = arrangeShortlist(rows, new Map(), { ...base, clearsOnly: true }).sections
    expect(near.rows).toHaveLength(1)
    expect(near.all).toBe(3)
  })
})

describe('how many cards render', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => row(100 - (i % 100), 'elsewhere'))

  it('renders the default per section until that section is expanded', () => {
    const [near, far] = arrangeShortlist(many(338), new Map(), base).sections
    expect(near.visible).toHaveLength(0)
    expect(far.rows).toHaveLength(338)
    expect(far.visible).toHaveLength(CARDS_PER_BUCKET)
  })

  it('expands by one step, not to everything', () => {
    const [, far] = arrangeShortlist(many(338), new Map(), { ...base, show: 'far' }).sections
    expect(far.visible).toHaveLength(CARDS_PER_BUCKET + SHOW_MORE_STEP)
    expect(far.rows).toHaveLength(338)
  })

  it('honours a requested count, clamped to what exists', () => {
    expect(cardsToShow('far', 338, { show: 'far', shown: 100 })).toBe(100)
    expect(cardsToShow('far', 338, { show: 'far', shown: 5000 })).toBe(338)
    // A hand-edited URL cannot shrink a section below its default.
    expect(cardsToShow('far', 338, { show: 'far', shown: 3 })).toBe(CARDS_PER_BUCKET)
    expect(cardsToShow('far', 338, { show: 'far', shown: NaN })).toBe(CARDS_PER_BUCKET + SHOW_MORE_STEP)
    // Expanding one section leaves the other at its default.
    expect(cardsToShow('near', 162, { show: 'far', shown: 100 })).toBe(CARDS_PER_BUCKET)
    expect(cardsToShow('near', 7, {})).toBe(7)
  })

  it('no longer accepts show=all as "render everything"', () => {
    const [near, far] = arrangeShortlist(many(338), new Map(), { ...base, show: 'all' }).sections
    expect(far.visible).toHaveLength(CARDS_PER_BUCKET)
    expect(near.visible).toHaveLength(0)
  })
})

describe('holdingLine — the 500 cap is never printed as a total', () => {
  it('under the cap, the list is everything', () => {
    expect(holdingLine(162, 500, null)).toEqual({ kind: 'complete', scored: 162 })
    expect(holdingLine(162, 500, 9999)).toEqual({ kind: 'complete', scored: 162 })
  })

  it('at the cap with a count, states both numbers and the gap', () => {
    // Founder's live search, 2026-09-23.
    expect(holdingLine(500, 500, 5368)).toEqual({ kind: 'capped', scored: 500, matched: 5368, unscored: 4868 })
  })

  it('at the cap without a count, says it is capped rather than inventing a number', () => {
    expect(holdingLine(500, 500, null)).toEqual({ kind: 'capped-unknown', scored: 500 })
  })

  it('does not announce a cap the index has since shrunk below', () => {
    expect(holdingLine(500, 500, 500)).toEqual({ kind: 'complete', scored: 500 })
    expect(holdingLine(500, 500, 480)).toEqual({ kind: 'complete', scored: 500 })
  })
})

describe('applyQuickPills', () => {
  const now = Date.parse('2026-09-23T12:00:00Z')
  const rows = [
    { id: 'a', role_id: 'ra', score: 90, score_breakdown: { location: 'remote' as const } },
    { id: 'b', role_id: 'rb', score: 70, score_breakdown: { location: 'exact' as const } },
    { id: 'c', role_id: 'rc', score: 85, score_breakdown: { location: 'exact' as const } },
  ]
  const off = { min80: false, fresh: false, remote: false, easy: false }

  it('passes everything with no pill on', () => {
    expect(applyQuickPills(rows, off, {}, now)).toHaveLength(3)
  })
  it('match > 80 and remote combine', () => {
    expect(applyQuickPills(rows, { ...off, min80: true, remote: true }, {}, now).map((r) => r.id)).toEqual(['a'])
  })
  it('fresh keeps only dated roles inside a day, never undated ones', () => {
    const postedAt = new Map([['ra', '2026-09-23T01:00:00Z'], ['rb', '2026-09-20T00:00:00Z']])
    expect(applyQuickPills(rows, { ...off, fresh: true }, { postedAt }, now).map((r) => r.id)).toEqual(['a'])
  })
  it('easy apply defers to the lookup', () => {
    expect(applyQuickPills(rows, { ...off, easy: true }, { isEasy: (id) => id === 'rc' }, now).map((r) => r.id)).toEqual(['c'])
  })
})

describe('Pay stated first and Company A–Z (TASK-210)', () => {
  const rowOf = (role_id: string, score: number) => ({ id: role_id, role_id, score, score_breakdown: { location: 'exact' as const, experience: 'meets' as const } })
  const rows = [rowOf('a', 90), rowOf('b', 70), rowOf('c', 80), rowOf('d', 60)]
  const ids = (sections: { visible: { role_id: string }[] }[]) => sections.flatMap((s) => s.visible.map((r) => r.role_id))

  it('puts roles that state pay first, highest first, then the rest by score', () => {
    const payOf = new Map([['b', 3_000_000], ['d', 1_200_000]])
    const { sections } = arrangeShortlist(rows, new Map(), { ...base, byPay: true, payOf })
    expect(ids(sections)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('falls back to score alone when nobody states pay — never reordering for a number it does not have', () => {
    const { sections } = arrangeShortlist(rows, new Map(), { ...base, byPay: true, payOf: new Map() })
    expect(ids(sections)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('orders by employer name, ignoring case, with unknown employers last', () => {
    const companyOf = new Map([['a', 'zeta'], ['b', 'Acme'], ['c', 'acme']])
    const { sections } = arrangeShortlist(rows, new Map(), { ...base, byCompany: true, companyOf })
    expect(ids(sections)).toEqual(['c', 'b', 'a', 'd']) // acme, Acme (score 80 then 70), zeta, then d (no name)
  })
})
