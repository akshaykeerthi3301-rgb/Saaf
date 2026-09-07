import { createClient } from '@/lib/supabase/server'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'

/**
 * The one read behind every Cookie surface.
 *
 * Cookie's features — the tailored bullets, the cover note, the interview
 * questions — all need the same two things: the candidate's confirmed profile,
 * and one role. That read was written inline inside
 * src/app/actions/tailor.ts, which is two of the 24 legacy `.from()` sites the
 * data-boundary rule warns about. Every new Cookie feature would have copied it
 * again, and the drift would have started the way the audit_daily drift did:
 * three call sites, three column lists, none of them wrong yet.
 *
 * ⚠️ THIS IS A `lib/services/` MODULE BECAUSE IT TOUCHES THE DATABASE — that is
 * the whole criterion. The pure logic Cookie runs on this data does NOT live
 * here: src/lib/tailor.ts holds the grounding filter, src/lib/interview-prep.ts
 * the question engine. Filing pure functions here to keep "Cookie" in one
 * folder would make the boundary rule mean "things about Cookie" rather than
 * "things that query", which is how a rule stops being enforceable.
 *
 * ⚠️ IT TAKES THE CALLER'S CLIENT AND THEREFORE THE CALLER'S RLS. Both reads
 * run on the request client, so `profiles` is scoped to auth.uid() by policy
 * rather than by the `.eq()` below — the filter is for correctness, the policy
 * is the security. Nothing here uses the service role.
 */

export type CookieContext = {
  me: CandidateFacts
  role: RoleFacts
}

export type CookieContextResult =
  | { ok: true; context: CookieContext }
  | { ok: false; error: string }

/**
 * Everything Cookie needs to say something about one role, or the reason it
 * cannot.
 *
 * The failure messages are written for the candidate rather than for a log:
 * each one names the single thing they can do about it. "Confirm your profile
 * first" is actionable; "profile not found" is not.
 */
export async function getCookieContext(
  userId: string,
  roleId: string
): Promise<CookieContextResult> {
  const supabase = await createClient()

  // Both reads at once. They are independent and this sits on the path to a
  // screen the candidate is waiting on.
  const [{ data: profile }, { data: role }] = await Promise.all([
    supabase
      .from('profiles')
      .select('current_title, employer, years_experience, skills, domain, credential')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('roles')
      .select('title, company_name, description')
      .eq('id', roleId)
      .maybeSingle(),
  ])

  if (!profile) return { ok: false, error: 'Confirm your profile first.' }
  if (!role) return { ok: false, error: 'That role is no longer in the index.' }

  return {
    ok: true,
    context: {
      me: {
        currentTitle: profile.current_title,
        employer: profile.employer,
        yearsExperience: profile.years_experience,
        skills: profile.skills ?? [],
        domain: profile.domain,
        credential: profile.credential,
      },
      role: {
        title: role.title,
        company: role.company_name ?? '',
        description: role.description,
      },
    },
  }
}
