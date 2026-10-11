import type { EducationEntry, ExperienceEntry, ResumeSections } from '@/lib/parse/sections'

/**
 * Work experience, projects and education as the profile screen shows them — month and year pickers, a "currently
 * work here" box, a description box — read from and written to the SAME résumé the library holds.
 *
 * ⚠️ NO SECOND COPY OF A CAREER. The profile reads and edits the candidate's primary saved résumé, so the page the
 * résumé is built from and the page that shows it can never disagree. The résumé keeps dates as the person wrote them
 * ("Jan 2023 – Present", verbatim); these functions read that string into parts and write it back in one house style.
 *
 * Pure and framework-free so the date handling — where a résumé's free text meets a picker — is tested directly.
 */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

export type DateParts = {
  startMonth: number | null // 1–12
  startYear: number | null
  endMonth: number | null
  endYear: number | null
  current: boolean
}

const NOW_WORDS = /^(present|current|currently|now|today|till date|to date|ongoing)$/i

function readPoint(raw: string): { month: number | null; year: number | null; now: boolean } {
  const s = raw.trim()
  if (!s) return { month: null, year: null, now: false }
  if (NOW_WORDS.test(s)) return { month: null, year: null, now: true }
  const year = s.match(/\b(19|20)\d{2}\b/)?.[0]
  const word = s.match(/[A-Za-z]{3,}/)?.[0]?.slice(0, 3).toLowerCase()
  const m = word ? MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === word) : -1
  return { month: m >= 0 ? m + 1 : null, year: year ? Number(year) : null, now: false }
}

export function parseDates(dates: string | null | undefined): DateParts {
  const empty: DateParts = { startMonth: null, startYear: null, endMonth: null, endYear: null, current: false }
  if (!dates) return empty
  const parts = dates.split(/\s*(?:[-–—]|\bto\b)\s*/i)
  const a = readPoint(parts[0] ?? '')
  const b = readPoint(parts.slice(1).join(' '))
  return { startMonth: a.month, startYear: a.year, endMonth: b.month, endYear: b.year, current: b.now }
}

function point(month: number | null, year: number | null): string {
  if (!year) return ''
  return month ? `${MONTHS[month - 1].slice(0, 3)} ${year}` : String(year)
}

/** "Jun 2025 - Jul 2026", "Jun 2025 - Present", "2019 - 2023"; empty when there is no start year. */
export function formatRange(p: DateParts): string {
  const start = point(p.startMonth, p.startYear)
  if (!start) return ''
  const end = p.current ? 'Present' : point(p.endMonth, p.endYear)
  return end ? `${start} - ${end}` : start
}

/** Why a set of dates cannot be saved, or null. Dates are optional; a half-filled or backwards range is not. */
export function dateProblem(p: DateParts): string | null {
  if (!p.startYear && !p.endYear && !p.current) return null
  if (!p.startYear) return 'Add a start year.'
  if (!p.current && !p.endYear && p.endMonth) return 'Add an end year.'
  if (!p.current && p.endYear) {
    const s = p.startYear * 12 + (p.startMonth ?? 1)
    const e = p.endYear * 12 + (p.endMonth ?? 12)
    if (e < s) return 'The end date is before the start date.'
  }
  return null
}

// ---- the description box ----------------------------------------------------------------------------------------------

const BULLET = /^\s*(?:[●•▪◦‣∙·*-]|•)\s*/

/** Bullets → the textarea's text: one "● line" per bullet. */
export function bulletsToText(bullets: string[]): string {
  return bullets.map((b) => `● ${b}`).join('\n')
}

/** The textarea's text → bullets: a leading marker is dropped, blank lines too. A plain paragraph becomes one bullet per line. */
export function textToBullets(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.replace(BULLET, '').trim()).filter(Boolean)
}

// ---- the three lists --------------------------------------------------------------------------------------------------

export type EntryKind = 'experience' | 'project' | 'education'

export type ExperienceItem = ExperienceEntry & { /** Position in `sections.experience`; the stable handle for edit and delete. */ index: number }
export type EducationItem = EducationEntry & { index: number }

export function listExperience(s: ResumeSections): ExperienceItem[] {
  return s.experience.map((e, index) => ({ ...e, index })).filter((e) => !e.isProject)
}
export function listProjects(s: ResumeSections): ExperienceItem[] {
  return s.experience.map((e, index) => ({ ...e, index })).filter((e) => e.isProject)
}
export function listEducation(s: ResumeSections): EducationItem[] {
  return s.education.map((e, index) => ({ ...e, index }))
}

/** A résumé with nothing in it, for a candidate who adds their first entry before they have uploaded one. */
export function emptySections(): ResumeSections {
  return { contact: { name: null, email: null, phone: null, links: [] }, summary: null, experience: [], education: [], skills: [], other: [], unplaced: 0, order: [] }
}

/**
 * Add (index = null) or replace one entry. Experience and projects share an array and are told apart by `isProject`, so a
 * replace keeps its place and a new entry goes first — the profile lists most recent first, as every résumé does.
 */
export function upsertEntry(
  s: ResumeSections,
  kind: EntryKind,
  index: number | null,
  entry: ExperienceEntry | EducationEntry,
): ResumeSections {
  if (kind === 'education') {
    const list = [...s.education]
    if (index === null) list.unshift(entry as EducationEntry)
    else if (list[index]) list[index] = entry as EducationEntry
    else return s
    return { ...s, education: list }
  }
  const e = { ...(entry as ExperienceEntry), isProject: kind === 'project' }
  const list = [...s.experience]
  if (index === null) list.unshift(e)
  else if (list[index] && !!list[index].isProject === (kind === 'project')) list[index] = e
  else return s
  return { ...s, experience: list }
}

export function removeEntry(s: ResumeSections, kind: EntryKind, index: number): ResumeSections {
  if (kind === 'education') return s.education[index] ? { ...s, education: s.education.filter((_, i) => i !== index) } : s
  const e = s.experience[index]
  if (!e || !!e.isProject !== (kind === 'project')) return s
  return { ...s, experience: s.experience.filter((_, i) => i !== index) }
}

/** "Previously Manager @ ICICI Bank" — the line under the name. Empty parts are left out rather than printed as "null". */
export function headline(title: string | null | undefined, employer: string | null | undefined): string {
  const t = title?.trim()
  const e = employer?.trim()
  if (t && e) return `${t} @ ${e}`
  return t || e || ''
}
