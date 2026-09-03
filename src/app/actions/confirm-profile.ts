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
    portals_used: v.portals ?? null,
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false as const, error: 'Could not save that. Try again.' }

  const { written } = await evaluateUser(user.id)
  return { ok: true as const, resultsReady: written > 0 }
}
