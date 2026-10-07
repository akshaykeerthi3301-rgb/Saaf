import type { ScoreBreakdown } from '@/match/score'

/**
 * The three small bars on a card — Role, Skills, Experience — read straight from
 * the score's own components (TASK-178's three-bar summary, brought forward by the
 * feed redesign of 2026-10-08, from the teardown's UI spec §S3: "three mini bars").
 *
 * ⚠️ NOTHING IS COMPUTED HERE. Each bar is one stored component's points over its
 * maximum, so a bar can never disagree with the arithmetic it summarises. A
 * component the scorer did not apply (no skills on file, no posting text) gets NO bar,
 * rather than an empty one that would read as a zero.
 */
export type ScoreBar = { label: 'Role' | 'Skills' | 'Experience'; share: number }

type ComponentKey = ScoreBreakdown['components'][number]['key']
const PARTS: [ScoreBar['label'], ComponentKey][] = [
  ['Role', 'title'],
  ['Skills', 'skills'],
  ['Experience', 'seniority'],
]

export function scoreBars(breakdown: ScoreBreakdown | null | undefined): ScoreBar[] {
  return barsFromShares((breakdown?.components ?? []).filter((c) => c.max > 0).map((c) => ({ key: c.key, share: c.points / c.max })))
}

/** The same three bars from already-computed shares (the detail panel receives factors, not the raw breakdown). */
export function barsFromShares(parts: { key: string; share: number }[]): ScoreBar[] {
  const by = new Map(parts.map((p) => [p.key, p.share]))
  return PARTS.flatMap(([label, key]) => {
    const share = by.get(key)
    return share === undefined ? [] : [{ label, share: Math.max(0, Math.min(1, share)) }]
  })
}
