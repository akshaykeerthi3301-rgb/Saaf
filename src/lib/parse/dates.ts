/**
 * The one definition of what a date on a résumé looks like.
 *
 * ⚠️ THERE WERE THREE COPIES OF THIS, AND ONLY ONE CARRIED THE FIX. When
 * numeric months ("07/2023 - Present", common on Indian résumés) were added on
 * 2026-09-09, the change landed in sections.ts and not in extract.ts or
 * ats-check.ts — which are byte-identical to each other and both wrong. The
 * visible result was a résumé whose job entry parsed correctly while the same
 * document's `earliestYear`, career-span arithmetic and date-gap findings were
 * computed from a regex that could not see half its dates.
 *
 * Duplicated regexes do not drift because anyone is careless; they drift
 * because a fix has no way to know where its copies are. One module, imported
 * three times, is the only structural answer.
 *
 * ⚠️ EVERY EXPORT IS A FACTORY, NOT A CONSTANT. A `g`-flagged RegExp carries
 * `lastIndex` between calls, so a shared instance makes `.test()` alternate
 * between true and false on identical input. Callers get a fresh one.
 */

/** A month name, abbreviated or spelled out. Exported because two checks in
 *  ats-check.ts match months outside a range — a title that is really a date,
 *  and a document mixing numeric with written dates. */
export const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DASH = '[-‐‑‒–—]'

/**
 * A month, written either way.
 *
 * Only "/" and "." are accepted as the numeric separator: "07-2023" cannot be
 * told apart from a range dash without guessing, and guessing here silently
 * changes somebody's employment dates.
 */
const MONTH_ANY = `(?:(?:${MONTH}\\.?|\\d{1,2}[/.])\\s*)?`

/** Words a résumé uses where an end date would go. */
const OPEN_ENDED = 'present|current|now|till date|to date|ongoing'

/** A range separator: a dash, or the word "to". */
const RANGE_SEP = `(?:\\s*${DASH}\\s*|\\s+to\\s+)`

/**
 * A full date range — the single most reliable signal that a line starts a job.
 * Captures the two halves as written, never normalised to a Date.
 */
export function dateRange(): RegExp {
  return new RegExp(
    `(${MONTH_ANY}\\d{4})${RANGE_SEP}(${MONTH_ANY}\\d{4}|${OPEN_ENDED})`,
    'i',
  )
}

/**
 * The same range, global, capturing the four-digit YEARS rather than the whole
 * date. Feeds career-span arithmetic — earliest year, gaps, claimed-vs-actual.
 */
export function dateRangeYears(): RegExp {
  return new RegExp(
    // The trailing period in "Jan. 2023" must be allowed here too — without it
    // an abbreviated-with-period résumé parsed its ranges and lost its years.
    `(?:${MONTH}\\.?\\s*|\\d{1,2}[/.]\\s*)?((?:19|20)\\d{2})${RANGE_SEP}` +
      `(?:(?:${MONTH}\\.?\\s*|\\d{1,2}[/.]\\s*)?((?:19|20)\\d{2})|${OPEN_ENDED})`,
    'gi',
  )
}

/** A role with no end date. More than one of these is a genuine ambiguity. */
export function openEnded(): RegExp {
  return new RegExp(`${RANGE_SEP}(${OPEN_ENDED})\\b`, 'gi')
}
