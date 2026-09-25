import type { ScoreBreakdown } from '@/match/score'

/**
 * "Why this job is a match" — two sentences on the feed card (Phase 15,
 * TASK-138; Jobright shows a written paragraph on every card, OBSERVED
 * 2026-09-25).
 *
 * ⚠️ ASSEMBLED, NEVER WRITTEN. Jobright's paragraph is model-written; ours is
 * built only from the score's own component notes, each of which is retrieved
 * from the posting or the candidate's profile (src/match/score.ts: "Retrieved
 * from the posting, never invented"). No model call, so nothing can be made up
 * and it costs nothing across hundreds of cards.
 *
 * Sentence one: the component that scored best. Sentence two: the one that
 * scored worst, if it scored under half — the thing to check before applying.
 * The card's reason line is skipped if a note repeats it word for word.
 */
export function whyThisMatches(breakdown: ScoreBreakdown | null | undefined, reason = ''): { strength: string | null; gap: string | null } {
  const scored = (breakdown?.components ?? [])
    .filter((c) => c.key !== 'cap' && c.max > 0 && c.note?.trim())
    .map((c) => ({ ...c, share: c.points / c.max }))
  const fresh = scored.filter((c) => c.note.trim() !== reason.trim())
  if (!fresh.length) return { strength: null, gap: null }

  const byShare = [...fresh].sort((a, b) => b.share - a.share || b.max - a.max)
  const best = byShare[0]
  const worst = [...fresh].sort((a, b) => a.share - b.share || b.max - a.max)[0]
  const sentence = (s: string) => (/[.!?”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`)

  return {
    strength: best.share >= 0.5 ? sentence(best.note) : null,
    gap: worst !== best && worst.share < 0.5 ? sentence(worst.note) : null,
  }
}
