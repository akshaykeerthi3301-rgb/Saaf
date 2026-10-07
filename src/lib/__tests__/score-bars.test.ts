import { describe, it, expect } from 'vitest'
import { scoreBars } from '../score-bars'
import type { ScoreBreakdown } from '@/match/score'

const bd = (components: { key: string; points: number; max: number }[]) =>
  ({ components: components.map((c) => ({ ...c, label: c.key, note: '' })) }) as unknown as ScoreBreakdown

describe('scoreBars', () => {
  it('gives Role, Skills and Experience, in that order, from the matching components', () => {
    const bars = scoreBars(bd([
      { key: 'seniority', points: 25, max: 25 }, { key: 'title', points: 14, max: 28 }, { key: 'skills', points: 5, max: 20 }, { key: 'location', points: 10, max: 10 },
    ]))
    expect(bars).toEqual([
      { label: 'Role', share: 0.5 },
      { label: 'Skills', share: 0.25 },
      { label: 'Experience', share: 1 },
    ])
  })
  it('leaves out a part the scorer did not apply, instead of drawing it as zero', () => {
    const bars = scoreBars(bd([{ key: 'title', points: 28, max: 28 }, { key: 'seniority', points: 10, max: 25 }]))
    expect(bars.map((b) => b.label)).toEqual(['Role', 'Experience'])
  })
  it('is empty for no breakdown at all', () => {
    expect(scoreBars(null)).toEqual([])
    expect(scoreBars(undefined)).toEqual([])
    expect(scoreBars(bd([]))).toEqual([])
  })
  it('ignores a component with no weight and clamps a share to 0..1', () => {
    expect(scoreBars(bd([{ key: 'title', points: 5, max: 0 }]))).toEqual([])
    expect(scoreBars(bd([{ key: 'title', points: 40, max: 28 }, { key: 'skills', points: -3, max: 20 }]))).toEqual([
      { label: 'Role', share: 1 }, { label: 'Skills', share: 0 },
    ])
  })
  it('ignores every other component: location, work mode, credential and keywords are not bars', () => {
    expect(scoreBars(bd([{ key: 'location', points: 1, max: 10 }, { key: 'work_mode', points: 1, max: 7 }, { key: 'credential', points: 1, max: 10 }, { key: 'keywords', points: 1, max: 8 }]))).toEqual([])
  })
})

import { barsFromShares } from '../score-bars'

describe('barsFromShares', () => {
  it('builds the same three bars from shares, in order, skipping what is absent', () => {
    expect(barsFromShares([{ key: 'seniority', share: 1 }, { key: 'location', share: 0.2 }, { key: 'title', share: 0.5 }])).toEqual([
      { label: 'Role', share: 0.5 }, { label: 'Experience', share: 1 },
    ])
  })
  it('clamps', () => {
    expect(barsFromShares([{ key: 'skills', share: 3 }])).toEqual([{ label: 'Skills', share: 1 }])
  })
})
