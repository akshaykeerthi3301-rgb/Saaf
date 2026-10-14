import type { ParsedFields } from './extract'
import type { ParsedResume } from '@/lib/types/parsed-resume'

/**
 * The seam between the new parsing engine (engine.ts) and the upload action (src/app/actions/parse-resume.ts). Pure
 * functions only, so the policy is testable without a file, a session or a model.
 *
 * THREE MODES, chosen by the RESUME_ENGINE environment variable and defaulting to `shadow`:
 *   off      the old reader alone — exactly the behaviour before this existed.
 *   shadow   the old reader answers; the new engine runs beside it and a line of COUNTS is logged. No résumé content is
 *            logged, ever: verdicts and enums only. In every mode a scan with no text layer is read by local OCR, because
 *            the alternative is a dead end.
 *   primary  the engine's title, employer, years and city replace the old reader's where it found them.
 * Flip `shadow` → `primary` only after the shadow log shows the two agreeing where the old one was right.
 */
export type EngineMode = 'off' | 'shadow' | 'primary'

export function engineMode(raw: string | undefined = process.env.RESUME_ENGINE): EngineMode {
  return raw === 'off' || raw === 'primary' ? raw : 'shadow'
}

/** The fields the engine can fill, in the shape the confirm screen already uses. Skills stay with the model reader. */
export function engineFields(p: ParsedResume): ParsedFields {
  const role = p.derived.latest_role
  const out: ParsedFields = {}
  if (role?.title) out.currentTitle = role.title
  if (role?.employer) out.employer = role.employer
  // 'unknown' means NOTHING could be worked out; its 0 must never reach a profile as "0 years".
  if (p.derived.total_experience_basis !== 'unknown') out.yearsExperience = p.derived.total_experience_years
  if (p.contact.city) out.city = p.contact.city
  return out
}

/** What the candidate should be told about how the engine read THEIR file. Plain sentences; nothing technical. */
export function engineWarnings(p: ParsedResume): string[] {
  const w: string[] = []
  if (p.meta.ocr_used) w.push('We read this file by text recognition (it had no selectable text), so please check every field carefully.')
  const basis = p.derived.total_experience_basis
  if (basis === 'stated') w.push('Your years of experience come from the sentence on your résumé, because the roles had no usable dates.')
  if (basis === 'partial_dates') w.push('Some of your roles have no dates, so your years of experience may be lower than the truth.')
  if (p.derived.flags.includes('placeholder_dates')) w.push('The dates on this résumé look like template placeholders (for example "June 20xx").')
  if (p.derived.flags.includes('stale_document') && p.meta.document_date) w.push(`This file was last saved on ${p.meta.document_date}, so "Present" may mean then rather than now — please check your years.`)
  return w
}

export type Verdict = 'same' | 'differ' | 'only_old' | 'only_new' | 'neither'
const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function verdict(a: string | number | undefined, b: string | number | undefined, same: (x: never, y: never) => boolean): Verdict {
  const hasA = a !== undefined && a !== ''
  const hasB = b !== undefined && b !== ''
  if (!hasA && !hasB) return 'neither'
  if (!hasA) return 'only_new'
  if (!hasB) return 'only_old'
  return same(a as never, b as never) ? 'same' : 'differ'
}

/** Field-by-field agreement between the old reader and the engine — verdicts only, never the values. */
export function compareReads(old: ParsedFields, p: ParsedResume): Record<'title' | 'employer' | 'years' | 'city', Verdict> {
  const n = engineFields(p)
  const text = (x: string, y: string) => norm(x) === norm(y)
  return {
    title: verdict(old.currentTitle, n.currentTitle, text),
    employer: verdict(old.employer, n.employer, text),
    // within a year counts as agreement: the old reader works in whole years and over-counts gaps
    years: verdict(old.yearsExperience, n.yearsExperience, (x: number, y: number) => Math.abs(x - y) <= 1),
    city: verdict(old.city, n.city, text),
  }
}

/** The one log line. Enums, booleans and numbers only — safe to ship to a log drain. */
export function shadowLogLine(old: ParsedFields, p: ParsedResume, ms: number): string {
  return JSON.stringify({
    event: 'resume_engine_shadow',
    parser: p.meta.parser_version,
    ms,
    source: p.meta.text_source,
    ocr: p.meta.ocr_used,
    columns: p.meta.layout_columns,
    basis: p.derived.total_experience_basis,
    roles: p.experience.length,
    internships: p.internships.length,
    flags: p.derived.flags,
    verdict: compareReads(old, p),
  })
}

/** Engine values win where it found one; the old reader's stand everywhere else. */
export function overlay(old: ParsedFields, p: ParsedResume): ParsedFields {
  return { ...old, ...engineFields(p) }
}
