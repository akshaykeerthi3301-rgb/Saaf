import type { ResumeSections } from '@/lib/parse/sections'

/**
 * A résumé's employment timeline, read from the dates it already carries.
 *
 * ⚠️ THIS EXISTS TO MAKE THE "RECRUITER" CHECKS DETERMINISTIC. The category
 * leader groups nine of its 27 checks under recruiter red flags, bias and
 * seniority — employment gaps, age signals, career progression, leadership,
 * credibility — and runs models over them. Every one of those is a JUDGEMENT
 * about a person when a model does it, and a MEASUREMENT when it comes from
 * dates the candidate wrote down. This module is the difference between the two.
 *
 * ⚠️ THE VOICE RULE BINDS HARDEST HERE. These findings are about gaps in
 * someone's employment, their age, whether they have been promoted. A checker
 * that gets the tone wrong on those is not annoying, it is cruel — and
 * `docs/PRODUCT.md` is explicit that telling somebody the truth about their
 * position must not demoralise them. So every finding built on this module
 * describes WHAT A READER WILL WONDER, never what the candidate should have
 * done with their life. A two-year gap is not a defect; a two-year gap that the
 * document does not account for is a question the résumé leaves open, and the
 * fix is one line of explanation, not a different life.
 */

export type Month = { year: number; month: number }

export type Tenure = {
  entry: number
  title: string | null
  employer: string | null
  start: Month | null
  /** Null means "Present" — still there. */
  end: Month | null
  isCurrent: boolean
  /** Whole months, when both ends are known. */
  months: number | null
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const PRESENT = /\b(present|current|now|till date|to date|ongoing)\b/i

/** "Jul 2023", "07/2023", "2023" → a month, as far as the text supports. */
function readMonth(raw: string): Month | null {
  const t = raw.trim().toLowerCase()

  const named = t.match(/([a-z]{3,9})\.?\s*(\d{4})/)
  if (named && MONTHS[named[1].slice(0, 3)]) {
    return { year: Number(named[2]), month: MONTHS[named[1].slice(0, 3)] }
  }

  const numeric = t.match(/(\d{1,2})[/.](\d{4})/)
  if (numeric) {
    const m = Number(numeric[1])
    if (m >= 1 && m <= 12) return { year: Number(numeric[2]), month: m }
  }

  const yearOnly = t.match(/\b(19|20)\d{2}\b/)
  // A bare year is taken as mid-year rather than January. Assuming January
  // manufactures up to eleven months of gap or tenure that the document never
  // claimed, and these checks are about being fair to what was written.
  if (yearOnly) return { year: Number(yearOnly[0]), month: 6 }

  return null
}

function toIndex(m: Month): number {
  return m.year * 12 + m.month
}

export function monthsBetween(a: Month, b: Month): number {
  return toIndex(b) - toIndex(a)
}

/**
 * Every dated role, oldest first.
 *
 * Entries whose dates could not be read are returned with nulls rather than
 * dropped — a role we cannot date is exactly the kind of thing a reader
 * notices, and silently omitting it would make every downstream count wrong.
 */
export function timeline(sections: ResumeSections): Tenure[] {
  const out: Tenure[] = sections.experience.map((e, i) => {
    const raw = e.dates ?? ''
    const isCurrent = PRESENT.test(raw)
    // Split on the range dash, not on every dash — "Jul 2023 - Present".
    const halves = raw.split(/[-–—‐]|\bto\b/i).map((h) => h.trim()).filter(Boolean)
    const start = halves[0] ? readMonth(halves[0]) : null
    const end = isCurrent ? null : halves[1] ? readMonth(halves[1]) : null

    const now = new Date()
    const endForLength: Month | null = isCurrent
      ? { year: now.getFullYear(), month: now.getMonth() + 1 }
      : end

    return {
      entry: i,
      title: e.title,
      employer: e.employer,
      start,
      end,
      isCurrent,
      months: start && endForLength ? Math.max(0, monthsBetween(start, endForLength)) : null,
    }
  })

  return out.sort((a, b) => {
    if (!a.start) return 1
    if (!b.start) return -1
    return toIndex(a.start) - toIndex(b.start)
  })
}

export type Gap = {
  afterEmployer: string | null
  beforeEmployer: string | null
  months: number
  /** The window itself, so a caller can ask what else was happening then. */
  start: Month
  end: Month
}

/**
 * Unexplained months between one role ending and the next beginning.
 *
 * ⚠️ SIX MONTHS, NOT THREE. A notice period plus a job search is routinely
 * three or four months in India and is nobody's business; flagging it would
 * turn an ordinary career into a list of accusations. Six months is where a
 * reader starts to wonder, which is the only thing this check is entitled to
 * report.
 */
export const GAP_THRESHOLD_MONTHS = 6

export function gaps(t: Tenure[]): Gap[] {
  const out: Gap[] = []
  for (let i = 1; i < t.length; i++) {
    const prev = t[i - 1]
    const next = t[i]
    if (!prev.end || !next.start) continue
    const months = monthsBetween(prev.end, next.start)
    if (months >= GAP_THRESHOLD_MONTHS) {
      out.push({
        afterEmployer: prev.employer,
        beforeEmployer: next.employer,
        months,
        start: prev.end,
        end: next.start,
      })
    }
  }
  return out
}

/**
 * Seniority, read from the words in a title.
 *
 * Deliberately coarse — four bands, matched on the words that actually appear
 * in Indian job titles. It is used to ask "did this move forward?", which needs
 * an ordering and not a precise level.
 */
const BANDS: [RegExp, number][] = [
  [/\b(intern|trainee|apprentice)\b/i, 0],
  [/\b(junior|associate|assistant|jr\.?|analyst i\b|executive)\b/i, 1],
  [/\b(senior|sr\.?|lead|specialist|ii+\b|iii\b)\b/i, 3],
  [/\b(principal|staff|head|manager|director|vp|vice president|chief|founder|partner)\b/i, 4],
]

export function seniorityBand(title: string | null): number {
  if (!title) return 2
  for (let i = BANDS.length - 1; i >= 0; i--) {
    if (BANDS[i][0].test(title)) return BANDS[i][1]
  }
  return 2
}

/** Did the titles move forward across the résumé? Null when it cannot be told. */
export function progressed(t: Tenure[]): boolean | null {
  const titled = t.filter((x) => x.title)
  if (titled.length < 2) return null
  const first = seniorityBand(titled[0].title)
  const last = seniorityBand(titled[titled.length - 1].title)
  if (first === last) return null
  return last > first
}

/** Skills claimed in the skills list that appear nowhere in the experience. */
export function skillsWithoutEvidence(sections: ResumeSections): string[] {
  const evidence = [
    sections.summary ?? '',
    ...sections.experience.flatMap((e) => [e.title ?? '', ...e.bullets]),
  ]
    .join(' ')
    .toLowerCase()

  return sections.skills.filter((s) => {
    const skill = s.trim().toLowerCase()
    // One- and two-character entries are almost always list artefacts, and a
    // very long one is a sentence rather than a skill.
    if (skill.length < 3 || skill.length > 40) return false
    return !evidence.includes(skill)
  })
}

/** Words that evidence running something, rather than claiming to. */
const LEADERSHIP =
  /\b(led|leading|managed|managing|mentored|mentoring|owned|owning|coached|hired|built the team|ran the|headed|chaired|directed|coordinated|supervised|onboarded|line.managed)\b/i

export function leadershipEvidence(sections: ResumeSections): number {
  return sections.experience
    .flatMap((e) => e.bullets)
    .filter((b) => LEADERSHIP.test(b)).length
}
