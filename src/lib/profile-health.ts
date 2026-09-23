/**
 * Profile Health — how much of what the scorer and the Co-Pilot can use is on
 * the profile, 0–100.
 *
 * ⚠️ A CHECKLIST WITH WEIGHTS, NOT A VERDICT. The saaf-ai export and the
 * category leader both show a "Profile Strength 92%" dial computed from
 * nothing visible, and /copilot's header records why that is refused here. This
 * one is different in the only way that matters: every point is an item the
 * candidate can see, with what it is used for, and the score is their sum. It
 * measures the PROFILE's completeness — never the person, never their odds.
 *
 * Weights follow what each field drives: title and role decide which postings
 * are scored at all; experience and skills are the two largest score
 * components; city decides the location component; the rest sharpen ranking or
 * feed the writing tools.
 */

export type HealthInput = {
  currentTitle?: string | null
  employer?: string | null
  yearsExperience?: number | null
  city?: string | null
  preferredRole?: string | null
  extraRoles?: string[]
  skills?: string[]
  workMode?: string | null
  seniority?: string | null
  salaryMin?: number | null
}

export type HealthItem = { key: string; label: string; weight: number; done: boolean; why: string }

export function profileHealth(p: HealthInput): { score: number; items: HealthItem[] } {
  const skills = p.skills?.length ?? 0
  const items: HealthItem[] = [
    { key: 'role', label: 'Target role chosen', weight: 20, done: !!p.preferredRole?.trim(), why: 'Decides which postings are scored at all.' },
    { key: 'years', label: 'Years of experience', weight: 15, done: p.yearsExperience !== null && p.yearsExperience !== undefined, why: 'Scored against every posting that states a bar.' },
    { key: 'skills5', label: 'At least 5 skills', weight: 15, done: skills >= 5, why: 'The skills component is a fifth of every score.' },
    { key: 'skills10', label: 'At least 10 skills', weight: 10, done: skills >= 10, why: 'More skills, more postings that can recognise you.' },
    { key: 'city', label: 'Where you want to work', weight: 10, done: !!p.city?.trim(), why: 'Decides the location component.' },
    { key: 'title', label: 'Current title', weight: 8, done: !!p.currentTitle?.trim(), why: 'Grounds every AI draft — nothing is claimed beyond it.' },
    { key: 'employer', label: 'Current employer', weight: 7, done: !!p.employer?.trim(), why: 'The one employer an AI draft may name.' },
    { key: 'mode', label: 'Remote / hybrid / on-site', weight: 5, done: !!p.workMode && p.workMode !== 'no_preference', why: 'Reorders your list toward how you want to work.' },
    { key: 'seniority', label: 'Seniority level', weight: 4, done: !!p.seniority, why: 'Recorded for you — the scorer reads your years instead.' },
    { key: 'extra', label: 'A second role you would take', weight: 3, done: (p.extraRoles?.length ?? 0) > 0, why: 'Widens a thin market without lowering any score.' },
    { key: 'salary', label: 'Pay floor', weight: 3, done: p.salaryMin !== null && p.salaryMin !== undefined && p.salaryMin > 0, why: 'Kept for your tracker and offer notes; postings rarely state pay.' },
  ]
  const score = items.reduce((n, i) => n + (i.done ? i.weight : 0), 0)
  return { score, items }
}

/** A first guess at seniority from years, for the candidate to correct. */
export function seniorityFromYears(years: number | null | undefined): 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | null {
  if (years === null || years === undefined || !Number.isFinite(years)) return null
  if (years < 2) return 'entry'
  if (years < 5) return 'mid'
  if (years < 9) return 'senior'
  if (years < 15) return 'lead'
  return 'executive'
}
