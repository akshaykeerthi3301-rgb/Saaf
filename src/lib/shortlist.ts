import { locationRank, type ScoreBreakdown } from '@/match/score'

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
  now?: number
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
  const strong = rows.filter((r) => (r.score ?? 0) >= 75).length

  const near = visibleRows.filter((r) => locationRank(r.score_breakdown) <= 1)
  const far = visibleRows.filter((r) => locationRank(r.score_breakdown) > 1)

  const order = (list: T[]) =>
    [...list].sort((a, b) =>
      opts.byNewest
        ? (firstShownAt.get(b.role_id) ?? '').localeCompare(firstShownAt.get(a.role_id) ?? '') ||
          (b.score ?? 0) - (a.score ?? 0)
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
