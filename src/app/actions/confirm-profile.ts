'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { evaluateUser } from '@/lib/evaluate-user'

const schema = z.object({
  currentTitle: z.string().min(1, 'We need your current title.'),
  employer: z.string().min(1, 'We need your employer.'),
  yearsExperience: z.coerce.number().min(0).max(50),
  fn: z.enum(['engineering', 'finance', 'marketing', 'consulting', 'hr']),
  city: z.string().min(1, 'We need this to run the location gate.'),
  workAuthorisation: z.string().optional(),
  credential: z.enum(['CA', 'CFA', 'CS', 'none']).default('none'),
  // One field, not three — channel_budget/institute_tier/hr_track are
  // mutually exclusive by construction (a candidate only ever answers their
  // own function's question), so which column this lands in is decided by
  // `fn` below rather than threading three near-identical optional fields.
  assessmentAnswer: z.string().optional(),
  // Preference fields, only ever sent from the /profile edit form — the
  // onboarding gate screen never asks. Genuinely optional (not defaulted),
  // so the upsert below can distinguish "not part of this call" (leave
  // whatever's already stored alone) from "explicitly cleared."
  workModePreference: z.enum(['remote', 'hybrid', 'onsite', 'no_preference']).optional(),
  salaryExpectation: z.string().optional(),
  portals: z.array(z.string()).optional(),
})

export type ConfirmInput = z.input<typeof schema>

/**
 * Confirm the profile and run the first gate evaluation.
 *
 * `confirmed_at` is set here and nowhere else — it is the guard that stops gates
 * running against a profile the candidate has not checked, and it is enforced
 * again inside evaluateUser rather than trusted from the UI.
 */
export async function confirmProfile(input: ConfirmInput) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Please check the fields.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const v = parsed.data
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    current_title: v.currentTitle,
    employer: v.employer,
    years_experience: v.yearsExperience,
    function: v.fn,
    city: v.city,
    work_authorisation: v.workAuthorisation ?? null,
    credential: v.credential,
    // Collected, not gated on — see docs/PRD.md §13 and
    // supabase/migrations/0008_profile_assessment_answers.sql.
    channel_budget: v.fn === 'marketing' ? v.assessmentAnswer ?? null : null,
    institute_tier: v.fn === 'consulting' ? v.assessmentAnswer ?? null : null,
    hr_track: v.fn === 'hr' ? v.assessmentAnswer ?? null : null,
    // Only included when this call actually carries them — the onboarding
    // gate screen never sends these keys at all, so restarting onboarding
    // (restart-onboarding.ts) can't silently wipe a preference set earlier
    // on /profile. See supabase/migrations/0009_preferences.sql.
    ...(v.workModePreference !== undefined ? { work_mode_preference: v.workModePreference } : {}),
    ...(v.salaryExpectation !== undefined ? { salary_expectation: v.salaryExpectation || null } : {}),
    portals_used: v.portals ?? null,
    // True only for a sign-in method that actually confirmed the address —
    // Google today. Instant sign-in (src/lib/instant-signin.ts) never sets
    // this, which is what keeps an unverified address out of the daily
    // digest — see ingest/digest.ts.
    email_verified: user.app_metadata?.provider === 'google',
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false as const, error: 'Could not save that. Try again.' }

  const { written } = await evaluateUser(user.id)
  return { ok: true as const, resultsReady: written > 0 }
}
