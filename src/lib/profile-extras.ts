import { z } from 'zod'

/**
 * The profile screen's extra fields — one jsonb on profiles (migration 0052).
 *
 * ⚠️ NOTHING HERE IS READ BY THE SCORER. These are the candidate's own answers, kept for them and for the extension to
 * fill forms with; a preference stored here narrows no list and moves no score. The screen says so where it matters.
 *
 * ⚠️ READ DEFENSIVELY. The column is written by an action, but a jsonb is whatever was last put in it, and a screen
 * that threw on a stray value would hide the whole profile. `readExtras` keeps what parses and drops what does not.
 */

const text = (max: number) => z.string().trim().max(max)
const list = (max: number, each: number) => z.array(z.string().trim().min(1).max(each)).max(max)
const yesNo = z.enum(['', 'yes', 'no']).default('')

export const PHONE_TYPES = ['Home', 'Mobile', 'Work', 'Other'] as const

export const extrasSchema = z.object({
  preferredName: text(60).default(''),
  suffixName: text(30).default(''),
  middleName: text(60).default(''),
  phoneType: z.enum(['', ...PHONE_TYPES]).default(''),
  /** YYYY-MM-DD, or empty. */
  birthday: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default(''),
  address1: text(160).default(''),
  address2: text(160).default(''),
  address3: text(160).default(''),
  postalCode: text(20).default(''),
  country: text(60).default(''),
  state: text(60).default(''),
  county: text(60).default(''),
  /** The three yes/no answers forms ask in every country. Authorised-to-work and sponsorship are about INDIA. */
  authorisedToWork: yesNo,
  needsSponsorship: yesNo,
  willingToRelocate: yesNo,
  /** "Anything else we should know?" — the person's own notes, kept for them to paste into free-text answers. Never filled on its own. */
  anythingElse: text(1000).default(''),
  githubUrl: text(300).default(''),
  otherUrl: text(300).default(''),
  languages: list(12, 40).default([]),
  values: list(3, 60).default([]),
  companySizes: list(8, 30).default([]),
  employmentTypes: list(5, 30).default([]),
  industriesLike: list(10, 60).default([]),
  industriesAvoid: list(10, 60).default([]),
  skillsAvoid: list(20, 60).default([]),
  hiddenCompanies: list(30, 80).default([]),
})

export type Extras = z.infer<typeof extrasSchema>

export const EMPTY_EXTRAS: Extras = extrasSchema.parse({})

/** Keep every field that parses on its own; a bad one falls back to empty instead of discarding the rest. */
export function readExtras(raw: unknown): Extras {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_EXTRAS
  const out: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(extrasSchema.shape)) {
    const parsed = field.safeParse((raw as Record<string, unknown>)[key])
    out[key] = parsed.success ? parsed.data : EMPTY_EXTRAS[key as keyof Extras]
  }
  return out as Extras
}

// ---- the answers a candidate chooses from -----------------------------------------------------------------------------

export const VALUE_OPTIONS = [
  'Mentorship & skill development', 'Innovative product & tech', 'Progressive leadership', 'Work-life balance',
  'Strong pay & benefits', 'Remote flexibility', 'Job stability', 'Social impact', 'Fast growth', 'Diverse, inclusive team',
] as const

export const COMPANY_SIZES = [
  '1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '501-1,000 employees',
  '1,001-5,000 employees', '5,001-10,000 employees', '10,001+ employees',
] as const

export const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'] as const

export const INDUSTRIES = [
  'Banking & Financial Services', 'Insurance', 'Fintech', 'Technology & Software', 'E-commerce & Retail',
  'Consulting', 'Healthcare & Pharma', 'Education & EdTech', 'Manufacturing', 'Automotive',
  'Telecom', 'Media & Entertainment', 'Real Estate & Construction', 'Energy & Utilities', 'FMCG & Consumer goods',
  'Logistics & Supply chain', 'Government & Public sector', 'Non-profit & Social impact', 'Travel & Hospitality', 'Agriculture',
] as const

/** A language is free text, but these are the ones most candidates here mean. */
export const LANGUAGE_SUGGESTIONS = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi'] as const

// ---- profile strength -------------------------------------------------------------------------------------------------

export type StrengthTier = { title: string; note: string }

/** The headline above the strength bar. `score` is profileHealth's 0–100: a checklist, never a verdict on the person. */
export function strengthTier(score: number): StrengthTier {
  if (score >= 100) return { title: 'All-Star Applicant ✨', note: 'Profile complete. Autofill and tailoring have everything they need.' }
  if (score >= 75) return { title: 'Almost there', note: 'A few more details and your matches and tailoring get sharper.' }
  if (score >= 40) return { title: 'Making progress', note: 'Fill in what is missing below — each item says what it is used for.' }
  return { title: 'Just getting started', note: 'Add your target role, skills and city first; they decide which jobs you are scored against.' }
}

// ---- hearted skills -----------------------------------------------------------------------------------------------------

/**
 * A "hearted" skill is a keyword: the candidate's own words for what they care about, which the scorer uses as a boost
 * and never as a filter. So the heart on the profile writes into the same list the Keywords field edits.
 *
 * `skillsBefore` and `skillsAfter` both count as "skills" so a removed skill's keyword goes with it; a keyword that was
 * never a skill (an industry, a tool they want to learn) is left exactly as it was. Capped at 20, the field's own cap.
 */
export function mergeFavouriteKeywords(existing: string[], skillsBefore: string[], skillsAfter: string[], favourites: string[]): string[] {
  const key = (t: string) => t.trim().toLowerCase()
  const skills = new Set([...skillsBefore, ...skillsAfter].map(key))
  const after = new Set(skillsAfter.map(key))
  const kept = existing.filter((k) => !skills.has(key(k)))
  const hearts = favourites.filter((f) => after.has(key(f)))
  const seen = new Set<string>()
  return [...kept, ...hearts].filter((k) => (seen.has(key(k)) ? false : (seen.add(key(k)), true))).slice(0, 20)
}

/** The skills that are also keywords — the ones drawn with a filled heart. Order follows the skills list. */
export function favouriteSkills(skills: string[], keywords: string[]): string[] {
  const kw = new Set(keywords.map((k) => k.trim().toLowerCase()))
  return skills.filter((s) => kw.has(s.trim().toLowerCase()))
}
