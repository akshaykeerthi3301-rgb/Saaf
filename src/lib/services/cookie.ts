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

/** One row of the role picker on /interview-prep. */
export type ScoredRoleOption = { id: string; title: string; company: string; score: number | null }

/**
 * The candidate's scored roles, best first, for choosing which one to prepare for.
 *
 * ⚠️ IT READS `gate_results`, NOT `roles`. Preparation only means something
 * against a posting we have actually scored for THIS candidate — the plan is
 * built from the gap between their profile and that posting. Listing the index
 * would offer preparation for roles we never compared them to.
 *
 * Runs on the caller's client, so RLS scopes it to auth.uid() by policy rather
 * than by the .eq() below; the filter is for correctness, the policy is security.
 */
export async function listScoredRoles(userId: string, limit = 50): Promise<ScoredRoleOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gate_results')
    .select('role_id, score, roles(title, company_name)')
    .eq('user_id', userId)
    .order('score', { ascending: false, nullsFirst: false })
    .limit(limit)

  type Row = { role_id: string; score: number | null; roles: { title: string; company_name: string | null } | null }
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.roles)
    .map((r) => ({ id: r.role_id, title: r.roles!.title, company: r.roles!.company_name ?? '', score: r.score }))
}
