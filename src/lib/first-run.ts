import type { ParsedFields } from '@/lib/parse/extract'

/**
 * The first run, as pure functions: what a parsed résumé needs before we may save a profile from it, and the
 * experience levels the welcome card offers.
 */

export type Seniority = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
/** The feed's own Experience filter has three buckets (src/app/(app)/today/page.tsx). */
export type FeedLevel = 'entry' | 'mid' | 'senior'

export const LEVELS: { key: string; label: string; hint: string; seniority: Seniority; feed: FeedLevel }[] = [
  { key: 'intern', label: 'Intern / Fresher', hint: 'Studying, or starting out', seniority: 'entry', feed: 'entry' },
  { key: 'entry', label: 'Entry level', hint: 'Up to 2 years', seniority: 'entry', feed: 'entry' },
  { key: 'mid', label: 'Mid level', hint: '3 to 5 years', seniority: 'mid', feed: 'mid' },
  { key: 'senior', label: 'Senior level', hint: '6 or more years', seniority: 'senior', feed: 'senior' },
  { key: 'lead', label: 'Lead / Staff', hint: 'Leads a team or owns an area', seniority: 'lead', feed: 'senior' },
  { key: 'executive', label: 'Director / Executive', hint: 'Heads a function or a business', seniority: 'executive', feed: 'senior' },
]

/** The card to tick before the person has chosen: the one their own years fall in. None when years are unknown. */
export function levelFromYears(years: number | null | undefined): string | null {
  if (years === null || years === undefined || !Number.isFinite(years)) return null
  if (years < 1) return 'intern'
  if (years <= 2) return 'entry' // "Up to 2 years"
  if (years < 6) return 'mid' // "3 to 5 years"
  if (years < 9) return 'senior'
  if (years < 15) return 'lead'
  return 'executive'
}

/** The lowest level ticked — the one the person is at, not the one they would stretch to. */
export function seniorityFor(keys: string[]): Seniority | null {
  return LEVELS.find((l) => keys.includes(l.key))?.seniority ?? null
}

/** A feed filter only when every ticked level falls in one bucket; otherwise the feed stays unfiltered. */
export function feedLevelFor(keys: string[]): FeedLevel | null {
  const buckets = new Set(LEVELS.filter((l) => keys.includes(l.key)).map((l) => l.feed))
  return buckets.size === 1 ? [...buckets][0] : null
}

export type ProfileFromRead =
  | { ok: true; input: { currentTitle: string; employer: string; yearsExperience: number; preferredRole: string; city: string; skills: string[]; domain?: string } }
  | { ok: false; missing: string[] }

/**
 * Whether a parsed résumé is complete enough to save a profile from with no typing. All five are required by the
 * save itself (src/app/actions/confirm-profile.ts) and none is ever guessed: the target role is the résumé's own
 * title and only when the index holds postings for it (`suggestedRole`). Anything missing sends the person to the
 * check-your-details screen with what was read already filled in — never a dead end, never a made-up value.
 */
export function profileFromRead(fields: ParsedFields, suggestedRole: string | undefined): ProfileFromRead {
  const missing: string[] = []
  const title = fields.currentTitle?.trim()
  const employer = fields.employer?.trim()
  const city = fields.city?.trim()
  const years = fields.yearsExperience
  const role = suggestedRole?.trim()
  if (!title) missing.push('current title')
  if (!employer) missing.push('employer')
  if (!city) missing.push('city')
  if (years === undefined || !Number.isFinite(years) || years < 0 || years > 50) missing.push('years of experience')
  if (!role) missing.push('target role')
  if (missing.length || !title || !employer || !city || years === undefined || !role) return { ok: false, missing }
  return {
    ok: true,
    input: { currentTitle: title, employer, yearsExperience: years, preferredRole: role, city, skills: fields.skills ?? [], ...(fields.domain ? { domain: fields.domain } : {}) },
  }
}
