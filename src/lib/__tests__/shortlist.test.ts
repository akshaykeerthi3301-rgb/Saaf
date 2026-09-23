import { describe, it, expect } from 'vitest'
import type { ScoreBreakdown } from '@/match/score'
import {
  arrangeShortlist, cardsToShow, withinReach,
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
