import { createServiceClient } from '@/lib/supabase/service'
import { evaluate } from '@/gates/evaluate'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'

/**
 * Recompute gate results for one candidate and store them.
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
    fn: profile.function,
    city: profile.city ?? undefined,
    credential: profile.credential ?? 'none',
  }

  // The candidate's own function only.
  //
  // 'other' used to be included on the reasoning that a role the classifier
  // could not type should still be judged rather than dropped. In practice that
  // put voice-artist and delivery gigs on an engineer's list, because roughly
  // 60% of ingested roles landed in 'other'. PRODUCT.md is explicit that no
  // volume is promised and a short honest list beats a padded one — so an
  // unclassified role is a registry-quality problem to fix at ingest, not
  // something to show everyone and let them sort out.
  const { data: roles, error: rErr } = await db
    .from('roles')
    .select('id, function, role_requirements(kind, min_years, credential, value_text, source_quote, confidence)')
    .eq('in_india', true)
    .eq('function', profile.function)
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
    const result = evaluate(candidate, reqs)
    return {
      user_id: userId,
      role_id: role.id,
      outcome: result.outcome,
      refused_on: result.refusedOn ?? null,
      reason: result.reason,
      score: result.score ?? null,
      gap_years: result.gapYears ?? null,
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
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from('role_first_shown')
      .upsert(
        rows.slice(i, i + 500).map((r) => ({ user_id: r.user_id, role_id: r.role_id })),
        { onConflict: 'user_id,role_id', ignoreDuplicates: true }
      )
    if (error) throw error
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
