'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { draftApplication, type Draft } from '@/lib/tailor'
import { PROVIDER_LABEL } from '@/lib/parse/llm'
import { checkRateLimit } from '@/lib/rate-limit'

const schema = z.object({ roleId: z.string().uuid() })

/**
 * Ten drafts per ten minutes, per candidate.
 *
 * ⚠️ THIS WAS THE ONE UNMETERED MODEL CALL BEHIND A BUTTON (docs/QA-AUDIT.md
 * QA-07). Every "Review & Approve" drafts afresh — the drawer caches only in
 * component state, so a reload re-drafts — and Groq's free tier is 8,000
 * tokens a minute shared across the whole site (src/lib/parse/llm.ts). One
 * candidate opening drawers in a loop would starve everyone else's rewrite.
 *
 * Keyed on the user, not the IP: the caller is always signed in, and many
 * Indian candidates share an address behind carrier-grade NAT or an office
 * network, where an IP key would make strangers exhaust each other. Ten is
 * generous for a person working down a shortlist and bounds a loop at one a
 * minute.
 */
const TAILOR_ROLE_LIMIT = { scope: 'tailor-role', limit: 10, windowMs: 10 * 60_000 }

export type TailorResult =
  | { ok: true; draft: Draft; providerLabel: string }
  | { ok: false; error: string }

/**
 * Draft the application material for one role.
 *
 * ⚠️ THE ROLE AND THE PROFILE ARE BOTH READ SERVER-SIDE FROM THE ID. Nothing
 * the browser sends describes the candidate or the posting — a client that
 * could supply the "profile" could put any claim it liked through the grounding
 * filter and out the other side wearing a badge that says it was verified.
 * The only input from the browser is which role, and RLS decides whether this
 * user may read it.
 */
export async function tailorForRole(input: z.input<typeof schema>): Promise<TailorResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That role could not be found.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const [{ data: profile }, { data: role }] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_title, employer, years_experience, skills, domain, credential')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('roles')
      .select('title, company_name, description')
      .eq('id', parsed.data.roleId)
      .maybeSingle(),
  ])

  if (!profile) return { ok: false, error: 'Confirm your profile first.' }
  if (!role) return { ok: false, error: 'That role is no longer in the index.' }

  // Charged here, once a model will run — a missing profile or role costs nothing.
  const limit = checkRateLimit(user.id, TAILOR_ROLE_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have drafted a lot of applications in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`} — you can still apply directly.`,
    }
  }

  const draft = await draftApplication(
    {
      currentTitle: profile.current_title,
      employer: profile.employer,
      yearsExperience: profile.years_experience,
      skills: profile.skills ?? [],
      domain: profile.domain,
      credential: profile.credential,
    },
    { title: role.title, company: role.company_name ?? '', description: role.description },
  )

  if (!draft) {
    // Named honestly. A drafting failure is not an application failure — the
    // drawer still lets them apply, because the application is theirs to send.
    return { ok: false, error: 'We could not draft anything just now. You can still apply directly.' }
  }

  return { ok: true, draft, providerLabel: PROVIDER_LABEL[draft.provider] }
}
