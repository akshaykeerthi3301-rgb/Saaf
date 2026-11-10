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

/**
 * The one thing holding a score back, as a few words about the ROLE's fit — never about the person.
 *
 * ⚠️ NOTHING IS INVENTED HERE EITHER. When the scorer capped the total (the `cap` component: the candidate is outside the
 * experience band the posting states, or the bar could not be read), THAT is the reason, whatever the other parts say —
 * it is literally what held the number down. Otherwise it is the component that lost the most points. Before 2026-11-10
 * this looked only at Role / Skills / Experience below half, which left a capped or location-held score with no reason at all.
 */
const GAP: Record<string, string> = {
  title: 'Title differs',
  skills: 'Some skills missing',
  seniority: 'Experience differs',
  location: 'Location differs',
  work_mode: 'Work mode differs',
  credential: 'Asks for a credential',
  keywords: 'Few of your keywords',
}

export function scoreGap(breakdown: ScoreBreakdown | null | undefined): string | null {
  const parts = breakdown?.components ?? []
  const cap = parts.find((c) => c.key === 'cap')
  // CAP_REASON.unread in src/match/score.ts: a bar we could not read is not a finding about the candidate.
  if (cap) return cap.note.includes('could not read') ? 'Experience bar unclear' : 'Experience differs'
  const worst = parts.filter((c) => c.max > 0 && c.max > c.points).sort((a, b) => (b.max - b.points) - (a.max - a.points))[0]
  return worst ? (GAP[worst.key] ?? null) : null
}
