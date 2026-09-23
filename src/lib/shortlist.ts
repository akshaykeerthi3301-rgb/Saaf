import { locationRank, type ScoreBreakdown } from '@/match/score'
import { HIGH_PRECISION_MIN } from '@/lib/score-bands'

/**
 * How /today arranges a candidate's scored roles: which are new, which section
 * each lands in, the order within a section, the "Within reach" filter, and how
 * many cards are rendered. Pure — no database, no request — so it is tested on
 * its own (src/lib/__tests__/shortlist.test.ts). Moved verbatim out of
 * src/app/(app)/today/page.tsx on 2026-09-23 (TASK-093), which had no tests.
 *
 * The reasoning for each rule stays in the page beside the copy it produces;
 * this file is the arithmetic.
 */

/** Badges "seen in the last 7 days" rather than tracking each user's actual
 *  last-visit timestamp — simpler, no write-on-every-page-load. */
export const NEW_WITHIN_DAYS = 7

/** How many cards of a section are rendered before the "show more" link.
 *
 *  NOT a limit on what the candidate can see — every role stays one click away
 *  and every bucket states its full count above the cards, so nothing is
 *  hidden. It is a limit on what we make them download to find out.
 *
 *  Measured on a real 229-role list: rendering all of it produced 4.27MB of
 *  HTML (1.8MB markup and 2.4MB of hydration data for the same tree a second
 *  time) and took 6.8s to render, against 0.3s for the query that fed it. The
 *  page was slow because of how much of it existed, not because of the
 *  database. 20 a bucket is roughly what a person scans before deciding to
 *  narrow their search instead of scrolling further. */
export const CARDS_PER_BUCKET = 20

/**
 * How many more a "Show more" click adds. Replaced "Show all" on 2026-09-23:
 * rendering all 338 of one section was 6.3 MB of HTML (436 KB compressed) for
 * a phone to parse at once (docs/QA-AUDIT.md QA-02). Every role is still
 * reachable and the section's full count is still stated above its cards.
 */
export const SHOW_MORE_STEP = 40

/**
 * The columns a row needs to be arranged — deliberately not the whole
 * breakdown. /today reads these two standings for every scored role and the
 * full breakdown only for the cards it renders (src/lib/services/shortlist.ts).
 */
export type ArrangeableRow = {
  id: string
  role_id: string
  score: number | null
  score_breakdown: Pick<ScoreBreakdown, 'location' | 'experience'> | null
}

export type SectionKey = 'near' | 'far'

export type ArrangedSection<T> = {
  key: SectionKey
  /** Filtered and ordered — what the section's count reports. */
  rows: T[]
  /** Before the Within-reach filter, so the hidden count can be stated. */
  all: number
  /** What is actually rendered. */
  visible: T[]
}

export type ArrangeOptions = {
  onlyNew: boolean
  byNewest: boolean
  clearsOnly: boolean
  /** The section a "Show more" link expanded, if any. */
  show?: string
  /** How many of that section to render; parsed from the URL, so untrusted. */
  shown?: number
  /** role_id → the board's posting date. Read only for the Newest view. */
  postedAt?: Map<string, string>
  now?: number
}

/**
 * What the page may say about how many roles it holds for the candidate.
 *
 * ⚠️ 500 IS A CAP, AND IT USED TO BE PRINTED AS A TOTAL. The scorer takes the
 * 500 roles whose titles rank closest to the candidate's search and scores
 * those (src/lib/score-candidate.ts). Measured 2026-09-23: 6 of 9 profiles sit
 * exactly at 500, and the founder's search matches 5,368. "Showing 500 roles
 * matched" read as the whole market (docs/QA-AUDIT.md QA-06), against a
 * locked decision that no role is silently hidden.
 *
 * `matched` is null when the count was not available in time; the page then
 * says the list is capped without inventing a number.
 */
export type HoldingLine =
  | { kind: 'complete'; scored: number }
  | { kind: 'capped'; scored: number; matched: number; unscored: number }
  | { kind: 'capped-unknown'; scored: number }

export function holdingLine(scored: number, cap: number, matched: number | null): HoldingLine {
  if (scored < cap) return { kind: 'complete', scored }
  if (matched === null) return { kind: 'capped-unknown', scored }
  // The index moves between the nightly score and this render; a count that
  // no longer exceeds the list is not a cap worth announcing.
  if (matched <= scored) return { kind: 'complete', scored }
  return { kind: 'capped', scored, matched, unscored: matched - scored }
}

/** The experience standings "Within reach" keeps. The page's comment on the
 *  control says why `short` and `over` count. */
export function withinReach(r: ArrangeableRow): boolean {
  const e = r.score_breakdown?.experience
  return e === 'meets' || e === 'unstated' || e === 'short' || e === 'over'
}

/**
 * How many cards of a section to render. The default unless this section was
 * expanded; an expanded count is clamped so a hand-edited URL can neither
 * shrink the section below its default nor ask for more than exists.
 */
export function cardsToShow(key: SectionKey, total: number, opts: Pick<ArrangeOptions, 'show' | 'shown'>): number {
  if (opts.show !== key) return Math.min(CARDS_PER_BUCKET, total)
  const asked = Number.isFinite(opts.shown) ? Math.floor(opts.shown as number) : CARDS_PER_BUCKET + SHOW_MORE_STEP
  return Math.min(total, Math.max(CARDS_PER_BUCKET, asked))
}

export function arrangeShortlist<T extends ArrangeableRow>(
  rows: T[],
  firstShownAt: Map<string, string>,
  opts: ArrangeOptions,
) {
  const newCutoff = (opts.now ?? Date.now()) - NEW_WITHIN_DAYS * 86_400_000
  const isNew = (r: T) => {
    const shown = firstShownAt.get(r.role_id)
    return shown ? new Date(shown).getTime() >= newCutoff : false
  }

  const newCount = rows.filter(isNew).length
  const visibleRows = opts.onlyNew ? rows.filter(isNew) : rows
  const strong = rows.filter((r) => (r.score ?? 0) >= HIGH_PRECISION_MIN).length

  const near = visibleRows.filter((r) => locationRank(r.score_breakdown) <= 1)
  const far = visibleRows.filter((r) => locationRank(r.score_breakdown) > 1)

  /**
   * ⚠️ "NEWEST" IS NEWEST POSTED, WHERE THE BOARD SAID WHEN. It sorted by when
   * the role was first shown to this candidate, which was the only date we had
   * — until the card started printing "Posted 2 years ago" (TASK-086), and a
   * two-year-old posting could head the Newest list (docs/QA-AUDIT.md QA-11).
   * Dated roles lead, newest first; roles whose board gave no date follow in
   * first-shown order, rather than being slotted among dated ones by a date
   * that means something else. Compared as instants, not strings: boards write
   * offsets differently.
   */
  const posted = (r: T) => {
    const iso = opts.postedAt?.get(r.role_id)
    const t = iso ? Date.parse(iso) : NaN
    return Number.isNaN(t) ? null : t
  }
  const newest = (a: T, b: T) => {
    const pa = posted(a)
    const pb = posted(b)
    if (pa !== null && pb !== null && pa !== pb) return pb - pa
    if (pa !== null && pb === null) return -1
    if (pa === null && pb !== null) return 1
    if (pa === null && pb === null) {
      const byShown = (firstShownAt.get(b.role_id) ?? '').localeCompare(firstShownAt.get(a.role_id) ?? '')
      if (byShown) return byShown
    }
    return (b.score ?? 0) - (a.score ?? 0)
  }
  const order = (list: T[]) =>
    [...list].sort((a, b) =>
      opts.byNewest
        ? newest(a, b)
        : (b.score ?? 0) - (a.score ?? 0) ||
          locationRank(a.score_breakdown) - locationRank(b.score_breakdown),
    )

  const section = (key: SectionKey, list: T[]): ArrangedSection<T> => {
    const ordered = order(opts.clearsOnly ? list.filter(withinReach) : list)
    return { key, rows: ordered, all: list.length, visible: ordered.slice(0, cardsToShow(key, ordered.length, opts)) }
  }

  return {
    isNew,
    newCount,
    visibleCount: visibleRows.length,
    strong,
    farCount: far.length,
    sections: [section('near', near), section('far', far)],
  }
}
