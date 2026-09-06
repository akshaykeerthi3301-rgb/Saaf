import { createServiceClient } from '@/lib/supabase/service'
import { scoreAgainstIndex } from '@/lib/score-candidate'
import type { CandidateProfile } from '@/gates/types'

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
    currentTitle: profile.current_title ?? undefined,
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

  // Scoping and scoring live in scoreAgainstIndex() so the developer bench can
  // run this exact pipeline without writing anything. See src/lib/score-candidate.ts.
  const scored = await scoreAgainstIndex(db, candidate, {
    openToAdjacent: profile.open_to_adjacent === true,
  })

  const computedAt = new Date().toISOString()
  const rows = scored.map((r) => ({
    user_id: userId,
    role_id: r.roleId,
    // Nothing is withheld any more — every scoped role is ranked. The
    // outcome column survives only so older rows stay readable until the
    // recompute sweeps them. See migration 0013.
    outcome: 'ranked',
    refused_on: null,
    reason: r.reason,
    score: r.score,
    gap_years: null,
    score_breakdown: r.breakdown,
    computed_at: computedAt,
  }))

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
