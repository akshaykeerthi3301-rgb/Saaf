'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { evaluateUser } from '@/lib/evaluate-user'
import { resolveCity } from '@/lib/taxonomy/locations'

const schema = z.object({
  currentTitle: z.string().min(1, 'We need your current title.'),
  employer: z.string().min(1, 'We need your employer.'),
  yearsExperience: z.coerce.number().min(0).max(50),
  preferredRole: z.string().min(1, 'We need this to match you against roles.'),
  /**
   * Additional roles the candidate will also consider, most wanted first.
   * `preferredRole` stays the first one and is still written on its own, so a
   * profile is readable whether or not migration 0022 has been applied.
   */
  preferredRoles: z.array(z.string().min(1).max(120)).max(5).optional(),
  /** Their own words for what they care about. Boost only — never a filter. */
  keywords: z.array(z.string().min(1).max(40)).max(20).optional(),
  openToAdjacent: z.boolean().optional(),
  // Read from the résumé by a model, then confirmed on screen. Capped here as
  // well as in the parser — this action is reachable independently of it.
  skills: z.array(z.string().min(1).max(40)).max(40).optional(),
  domain: z.string().max(40).optional(),
  city: z.string().min(1, 'We need this to run the location gate.'),
  workAuthorisation: z.string().optional(),
  credential: z.enum(['CA', 'CFA', 'CS', 'none']).default('none'),
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

  /**
   * Store the canonical city, not what happened to be in the box.
   *
   * ⚠️ THE PICKER WAS NEVER THE PROBLEM. LocationInput has offered the taxonomy
   * since Stage F, but the field is prefilled from the résumé parser and accepts
   * free text, so a candidate who accepts the prefill — which is most of them,
   * because it is already correct-looking — stores "Bangalore, India".
   *
   * That string is not in the taxonomy, so resolveCity returned null,
   * matchLocation fell back to a literal substring test, and "Bengaluru,
   * Karnataka, India" — the commonest location in the whole index — scored as
   * ANOTHER CITY. The taxonomy was present, offered, and bypassed.
   *
   * Normalising here rather than in the component fixes it for every path into
   * this action: onboarding, the /profile edit form, and anything added later.
   * A city the taxonomy does not carry is stored as typed, exactly as before —
   * never turning a candidate away is a locked decision.
   */
  const city = resolveCity(v.city)?.name ?? v.city.trim()

  /**
   * ⚠️ THE ARRAY COLUMNS ARE WRITTEN SEPARATELY, AND THE FAILURE IS EXPECTED.
   *
   * Migration 0022 adds preferred_roles and keywords, and migrations here are
   * pasted into the Supabase SQL editor by hand — so there is a real window
   * where this code is deployed and the columns do not exist. Including them in
   * the main upsert would make that window fail EVERY profile save, taking
   * onboarding down for a feature nobody had asked for yet.
   *
   * So the core write happens first and must succeed; the arrays are a second,
   * best-effort write whose failure is logged and swallowed. The singular
   * preferred_role is always written, and scoreAgainstIndex reads both — so
   * until the migration lands, a candidate simply gets the single-role
   * behaviour they had before, with no error and no data loss.
   */
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    current_title: v.currentTitle,
    employer: v.employer,
    years_experience: v.yearsExperience,
    preferred_role: v.preferredRole,
    ...(v.openToAdjacent !== undefined ? { open_to_adjacent: v.openToAdjacent } : {}),
    ...(v.skills !== undefined ? { skills: v.skills } : {}),
    ...(v.domain !== undefined ? { domain: v.domain || null } : {}),
    city,
    work_authorisation: v.workAuthorisation ?? null,
    credential: v.credential,
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

  if (v.preferredRoles !== undefined || v.keywords !== undefined) {
    const { error: arrErr } = await supabase
      .from('profiles')
      .update({
        ...(v.preferredRoles !== undefined
          ? { preferred_roles: v.preferredRoles.length ? v.preferredRoles : [v.preferredRole] }
          : {}),
        ...(v.keywords !== undefined ? { keywords: v.keywords } : {}),
      })
      .eq('id', user.id)

    if (arrErr) {
      // Not surfaced to the candidate: their profile saved, their shortlist will
      // rebuild, and the only thing missing is a feature the database cannot
      // hold yet. Telling them "could not save" about a successful save would
      // be the worse lie.
      console.warn(
        'preferred_roles/keywords not written — run supabase/migrations/0022_multi_role_and_keywords.sql. ' +
        `Falling back to the single preferred_role. (${arrErr.message})`,
      )
    }
  }

  const { written } = await evaluateUser(user.id)
  return { ok: true as const, resultsReady: written > 0 }
}
