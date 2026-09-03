import { createClient } from '@supabase/supabase-js'
import { evaluate } from '../src/gates/evaluate'
import type { CandidateProfile, TypedRequirement } from '../src/gates/types'

/**
 * Re-evaluate every confirmed profile against the current role set.
 *
 * O(users × roles), which is fine at MVP scale. Beyond roughly 5,000 users this
 * becomes incremental recompute against roles changed since the last run.
 */
export async function recomputeAll(): Promise<void> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profiles, error: pErr } = await db
    .from('profiles').select('*').not('confirmed_at', 'is', null)
  if (pErr) throw pErr
  if (!profiles?.length) { console.log('  recompute: no confirmed profiles'); return }

  for (const p of profiles) {
    const { data: roles, error } = await db
      .from('roles')
      .select('id, role_requirements(kind, min_years, credential, value_text, source_quote, confidence)')
      .eq('in_india', true)
      .in('function', [p.function, 'other'])
    if (error) throw error

    const candidate: CandidateProfile = {
      yearsExperience: Number(p.years_experience ?? 0),
      fn: p.function,
      city: p.city ?? undefined,
      credential: p.credential ?? 'none',
    }

    const rows = (roles ?? []).map((role) => {
      const reqs: TypedRequirement[] = (role.role_requirements ?? []).map((q) => ({
        kind: q.kind,
        minYears: q.min_years ?? undefined,
        credential: q.credential ?? undefined,
        valueText: q.value_text ?? undefined,
        sourceQuote: q.source_quote,
        confidence: Number(q.confidence),
      }))
      const r = evaluate(candidate, reqs)
      return {
        user_id: p.id, role_id: role.id, outcome: r.outcome,
        refused_on: r.refusedOn ?? null, reason: r.reason,
        score: r.score ?? null, gap_years: r.gapYears ?? null,
        computed_at: new Date().toISOString(),
      }
    })

    for (let i = 0; i < rows.length; i += 500) {
      const { error: uErr } = await db.from('gate_results')
        .upsert(rows.slice(i, i + 500), { onConflict: 'user_id,role_id' })
      if (uErr) throw uErr
    }
    console.log(`  recomputed ${rows.length} results for one profile`)
  }
}
