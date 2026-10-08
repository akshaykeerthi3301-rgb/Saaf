import type { CandidateProfile, Credential } from '@/gates/types'

/**
 * A stored profile row as the scorer's candidate. ONE place, used by both the nightly scoring
 * (src/lib/evaluate-user.ts) and the on-the-spot scoring of "Search all roles" (src/lib/services/explore.ts)
 * — so a role can never score differently depending on which way it reached the candidate.
 */
export type ProfileScoringRow = {
  years_experience: number | string | null
  current_title: string | null
  city: string | null
  credential: Credential | null
  preferred_role: string | null
  preferred_roles: string[] | null
  keywords: string[] | null
  work_mode_preference: string | null
  skills: string[] | null
}

export function candidateFromProfile(p: ProfileScoringRow): CandidateProfile {
  return {
    yearsExperience: Number(p.years_experience ?? 0),
    currentTitle: p.current_title ?? undefined,
    city: p.city ?? undefined,
    credential: p.credential ?? 'none',
    preferredRole: p.preferred_role ?? undefined,
    preferredRoles: p.preferred_roles ?? undefined,
    keywords: p.keywords ?? undefined,
    workModePreference: p.work_mode_preference ?? undefined,
    skills: p.skills ?? undefined,
  }
}
