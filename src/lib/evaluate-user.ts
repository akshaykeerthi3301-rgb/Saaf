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
    city: profile.city ?? undefined,
    credential: profile.credential ?? 'none',
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
    .select('id, function, role_requirements(kind, min_years, credential, value_text, source_quote, confidence)')
    .eq('in_india', true)

  const { data: roles, error: rErr } = profile.open_to_adjacent && terms.length > 1
    ? await query.textSearch('title_tsv', terms.join(' | '))
    : await query.textSearch('title_tsv', profile.preferred_role, { type: 'websearch', config: 'english' })
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
