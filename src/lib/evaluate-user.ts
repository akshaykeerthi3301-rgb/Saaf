import { createServiceClient } from '@/lib/supabase/service'
import { scoreRole, summarise } from '@/match/score'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'

/**
 * Recompute match scores for one candidate and store them.
 *
 * Deliberately materialised: evaluating every user against every role at request
 * time would put a multi-thousand-row scan on the 90-second path to the magic
 * moment. The shortlist is a read of what this writes.
 *
 * Runs under the service role, so it is called from server actions and the
 * ingest job — never from anything a browser can reach.
 *
 * Deliberately not marked `server-only`: the ingest and seeding scripts run it
 * through tsx, outside Next's bundler, where that guard throws. The protections
 * that matter are elsewhere and are real — createServiceClient() throws without
 * SUPABASE_SERVICE_ROLE_KEY, which is never exposed to the browser, and an
 * ESLint rule blocks src/app and src/components from importing it.
 */
/**
 * Most recent roles scored per candidate.
 *
 * Descriptions are now pulled for skill matching, so an unbounded query is
 * both a memory and a time cost. A broad preferred role already matches 228 of
 * 650 roles; at Stage B's target index size it would match thousands. Freshest
 * first, because a stale posting is the least useful thing to rank.
 */
const MAX_ROLES_PER_CANDIDATE = 500

export async function evaluateUser(userId: string): Promise<{ written: number }> {
  const db = createServiceClient()

  const { data: profile, error: pErr } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (pErr) throw pErr

  // Gates must never run against an unconfirmed profile. Checked here, not only
  // in the UI — the UI is one refactor away from forgetting.
  if (!profile?.confirmed_at) return { written: 0 }

  const candidate: CandidateProfile = {
    yearsExperience: Number(profile.years_experience ?? 0),
    city: profile.city ?? undefined,
    credential: profile.credential ?? 'none',
    preferredRole: profile.preferred_role ?? undefined,
    workModePreference: profile.work_mode_preference ?? undefined,
    skills: profile.skills ?? undefined,
  }

  // Matching used to be an exact equality against the candidate's own guessed
  // function bucket. That bucket was itself guessed from the résumé by a
  // whole-document keyword scan, which reliably misrouted candidates whose
  // résumé used a different function's incidental vocabulary before it ever
  // reached the right one — see src/lib/parse/extract.ts's deleted FN_HINTS.
  // The fix: stop guessing. Ask the candidate directly what role they want
  // (profiles.preferred_role) and match that free text against a role's own
  // title via Postgres full-text search — title-only, mirroring
  // ingest/classify.ts's own title-only reasoning, since role descriptions are
  // untrusted third-party text and a free-text query is more exposed to
  // incidental description-word collisions than a fixed taxonomy ever was.
  //
  // No preferred role yet (shouldn't happen post-confirm, but a candidate
  // profile edited mid-migration could transiently lack one) means nothing to
  // match against — return rather than run an unfiltered/all-roles query.
  if (!profile.preferred_role?.trim()) return { written: 0 }

  // Strict by default, and that default is the product decision: a candidate
  // who asked for "Product Manager" is not shown a credit analyst role unless
  // they said they wanted adjacent ones. websearch_to_tsquery ANDs the terms,
  // so every word must appear in the title. Opting in switches to an OR of the
  // same terms, which widens the net and costs precision — the candidate makes
  // that trade knowingly. See supabase/migrations/0012_open_to_adjacent.sql.
  const terms = profile.preferred_role
    .toLowerCase()
    .replace(/[^a-z0-9&+ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const query = db
    .from('roles')
    .select('id, title, description, location_raw, city, unread_experience_mention, role_requirements(kind, min_years, credential, value_text, source_quote, confidence)')
    .eq('in_india', true)

  // The ternary picks the tsquery SHAPE only. Ordering and the cap are applied
  // to whichever branch wins, deliberately outside it: they used to chain off
  // the else-expression alone, so an `open_to_adjacent` candidate ran an
  // unbounded, unordered query that pulled every matching role's full
  // description into memory. At 650 roles that was survivable; it is the
  // fastest path to an OOM as the index grows.
  const scoped = profile.open_to_adjacent && terms.length > 1
    ? query.textSearch('title_tsv', terms.join(' | '))
    : query.textSearch('title_tsv', profile.preferred_role, { type: 'websearch', config: 'english' })

  const { data: roles, error: rErr } = await scoped
    .order('last_seen_at', { ascending: false })
    .limit(MAX_ROLES_PER_CANDIDATE)
  if (rErr) throw rErr

  const computedAt = new Date().toISOString()
  const rows = (roles ?? []).map((role) => {
    const reqs: TypedRequirement[] = (role.role_requirements ?? []).map((q) => ({
      kind: q.kind,
      minYears: q.min_years ?? undefined,
      credential: q.credential ?? undefined,
      valueText: q.value_text ?? undefined,
      sourceQuote: q.source_quote,
      confidence: Number(q.confidence),
    }))
    const breakdown = scoreRole(
      candidate,
      {
        title: role.title,
        description: role.description ?? undefined,
        locationRaw: role.location_raw ?? undefined,
        city: role.city ?? undefined,
        unreadExperienceMention: role.unread_experience_mention === true,
      },
      reqs
    )
    return {
      user_id: userId,
      role_id: role.id,
      // Nothing is withheld any more — every scoped role is ranked. The
      // outcome column survives only so older rows stay readable until the
      // recompute sweeps them. See migration 0013.
      outcome: 'ranked',
      refused_on: null,
      reason: summarise(breakdown),
      score: breakdown.total,
      gap_years: null,
      score_breakdown: breakdown,
      computed_at: computedAt,
    }
  })

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from('gate_results')
      .upsert(rows.slice(i, i + 500), { onConflict: 'user_id,role_id' })
    if (error) throw error
  }

  // Insert-once record of when this candidate first saw each role — survives
  // gate_results rows being deleted and recreated by the sweep below, unlike
  // gate_results.first_shown_at itself, whose freeze trigger only covers
  // UPDATE. See supabase/migrations/0007_role_first_shown.sql.
  //
  // Never throws: this only powers a "New" badge, and a candidate getting
  // their shortlist must never depend on this secondary bookkeeping table
  // succeeding — including the real window between this code deploying and
  // that migration actually being run.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from('role_first_shown')
      .upsert(
        rows.slice(i, i + 500).map((r) => ({ user_id: r.user_id, role_id: r.role_id })),
        { onConflict: 'user_id,role_id', ignoreDuplicates: true }
      )
    if (error) console.error('role_first_shown upsert failed (non-fatal):', error.message)
  }

  // Sweep results this pass did not rewrite.
  //
  // Upsert alone leaves orphans behind: a role that leaves the candidate's
  // function — or leaves the index entirely — keeps its old verdict forever.
  // That is how an HR candidate ended up being shown finance roles. Deleting
  // after the upsert rather than before means the list is never momentarily
  // empty for someone loading the page mid-recompute.
  const { error: sweepErr } = await db
    .from('gate_results')
    .delete()
    .eq('user_id', userId)
    .lt('computed_at', computedAt)
  if (sweepErr) throw sweepErr

  return { written: rows.length }
}
