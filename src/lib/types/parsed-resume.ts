import { z } from 'zod'

/**
 * What the parsing engine (`src/lib/parse/engine.ts`) returns — the strict shape every downstream consumer reads.
 * See docs/RESUME-PARSING-BLUEPRINT.md §2.4 for the fuller design (per-field provenance and line citations are TASK-259;
 * this is the subset the engine fills today).
 *
 * ⚠️ TWO RULES ARE ENCODED IN THE SHAPE, NOT IN COMMENTS:
 *  - `internships` and `projects` are SEPARATE ARRAYS from `experience`. A role cannot be in both, so it cannot be
 *    counted by accident: `derived.total_experience_*` is computed from `experience` alone.
 *  - Everything under `derived` is computed by code from dates; no model writes it.
 */

const Ym = z.object({ y: z.number().int().min(1950).max(2100), m: z.number().int().min(1).max(12).nullable() })

export const EmploymentType = z.enum(['unknown', 'part_time', 'freelance', 'advisory', 'volunteer'])

export const ExperienceSchema = z.object({
  title: z.string().max(200).nullable(),
  employer: z.string().max(200).nullable(),
  /** Verbatim — "Jan 2021 – Present" stays as written. */
  dates_raw: z.string().max(80).nullable(),
  start: Ym.nullable(),
  end: Ym.nullable(),
  is_open: z.boolean(),
  end_token: z.string().max(30).nullable(),
  location: z.string().max(120).nullable(),
  bullets: z.array(z.string().max(600)).max(30),
  employment_type: EmploymentType,
  is_internship: z.boolean(),
  is_project: z.boolean(),
  /** 'year' = a year-only date, so the length is a range; 'ambiguous' = a numeric date read month-first. */
  date_precision: z.enum(['month', 'year', 'ambiguous', 'none']),
  months: z.object({ low: z.number().int(), mid: z.number().int(), high: z.number().int() }).nullable(),
  /** True only for roles that feed `derived.total_experience_*`. */
  counts_toward_total: z.boolean(),
})

export const RoleRef = z.object({
  title: z.string().nullable(),
  employer: z.string().nullable(),
  source: z.enum(['dates', 'rule', 'model']),
})

export const FLAGS = [
  'concurrent_roles',
  'dates_reversed',
  'future_start',
  'end_missing',
  'ambiguous_dates',
  'entry_without_dates',
  'stated_vs_computed',
  'recently_ended',
  'trainee_role_counted',
  'placeholder_dates',
  'future_end',
  'stale_document',
] as const

export const ParsedResumeSchema = z.object({
  schema_version: z.literal(1),
  meta: z.object({
    parser_version: z.string(),
    text_source: z.enum(['pdf_text', 'docx', 'docx_fallback', 'ocr', 'image_ocr']),
    pages: z.number().int().nonnegative(),
    layout_columns: z.number().int().min(0).max(8),
    ocr_used: z.boolean(),
    ocr_confidence: z.number().min(0).max(100).nullable(),
    model_used: z.boolean(),
    chars: z.number().int().nonnegative(),
    /** When the file was last saved, if the file says. A "Present" in an old file may mean then, not now. */
    document_date: z.string().nullable(),
    warnings: z.array(z.string().max(300)).max(40),
  }),
  contact: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    links: z.array(z.string().max(300)).max(8),
    city: z.string().nullable(),
  }),
  summary: z.string().max(2000).nullable(),
  /** Professional roles only — no internships, projects or fellowships. */
  experience: z.array(ExperienceSchema).max(40),
  internships: z.array(ExperienceSchema).max(40),
  projects: z.array(ExperienceSchema).max(40),
  education: z.array(
    z.object({
      degree: z.string().max(300),
      institution: z.string().max(200).nullable(),
      dates_raw: z.string().max(80).nullable(),
      start_year: z.number().int().nullable(),
      end_year: z.number().int().nullable(),
    }),
  ).max(12),
  skills: z.array(z.string().max(80)).max(120),
  certifications: z.array(z.string().max(300)).max(40),
  derived: z.object({
    as_of: z.string(),
    current_role: RoleRef.nullable(),
    latest_role: RoleRef.nullable(),
    /**
     * HOW the headline number was obtained — a 0 must never mean "no dates found".
     *  dates          every counted role had usable dates
     *  partial_dates  some did; the number covers only those (see flag `entry_without_dates`)
     *  stated         no role had dates; the number is the résumé's own "N years of experience" sentence
     *  unknown        nothing to go on; months = 0 means UNKNOWN, not zero
     */
    total_experience_basis: z.enum(['dates', 'partial_dates', 'stated', 'unknown']),
    stated_experience_years: z.number().nonnegative().nullable(),
    total_experience_months: z.number().int().nonnegative(),
    total_experience_years: z.number().nonnegative(),
    total_experience_months_low: z.number().int().nonnegative(),
    total_experience_months_high: z.number().int().nonnegative(),
    internship_months: z.number().int().nonnegative(),
    gaps: z.array(z.object({ after: z.string(), months: z.number().int(), reason: z.enum(['education', 'unexplained']) })).max(20),
    flags: z.array(z.enum(FLAGS)),
  }),
})

export type ParsedResume = z.infer<typeof ParsedResumeSchema>
export type ParsedExperience = z.infer<typeof ExperienceSchema>
