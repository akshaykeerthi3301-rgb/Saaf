'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { scoreAgainstIndex } from '@/lib/score-candidate'
import { bucketFor, locationRank, type Bucket, type ScoreBreakdown } from '@/match/score'
import type { CandidateProfile } from '@/gates/types'

/**
 * Score a hypothetical candidate against the live index. DEVELOPMENT ONLY.
 *
 * The bench exists so a résumé can be run end to end and the result judged by
 * eye, across several résumés at once, without any of them touching a real
 * account. Three things keep that true:
 *
 *  1. IT WRITES NOTHING. No profile, no gate_results, no role_first_shown. It
 *     calls the same scoreAgainstIndex() the real pipeline calls and returns
 *     the rows instead of upserting them, so a bench run cannot disturb the
 *     shortlist of the account you are signed in as.
 *  2. It refuses outside development, exactly like /api/dev-signin. NODE_ENV is
 *     'production' on every Vercel deployment including previews, which are
 *     also built in production mode.
 *  3. It reads through the REQUEST client, not the service client, so every
 *     query stays under RLS and the bench cannot see more than a signed-in
 *     user can.
 */

const schema = z.object({
  yearsExperience: z.coerce.number().min(0).max(50),
  city: z.string().max(80),
  preferredRole: z.string().min(1).max(120),
  credential: z.enum(['CA', 'CFA', 'CS', 'none']).default('none'),
  workModePreference: z.enum(['remote', 'hybrid', 'onsite', 'no_preference']).default('no_preference'),
  openToAdjacent: z.boolean().default(false),
  skills: z.array(z.string().max(40)).max(40).default([]),
})

export type BenchInput = z.input<typeof schema>

export type BenchRole = {
  title: string
  company: string | null
  city: string | null
  score: number
  reason: string
  bucket: Bucket
  breakdown: ScoreBreakdown
}

export type BenchResult =
  | {
      ok: true
      scoped: number
      indexed: number
      buckets: { bucket: Bucket; count: number }[]
      roles: BenchRole[]
    }
  | { ok: false; error: string }

/** How many scored roles come back for inspection. The bench is for reading, so
 *  this is a screenful, not the whole list — the bucket counts above it are
 *  computed over everything scoped. */
const SHOW = 40

export async function benchScore(input: BenchInput): Promise<BenchResult> {
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, error: 'The bench is not available in production.' }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the inputs.' }
  }
  const v = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sign in first.' }

  const candidate: CandidateProfile = {
    yearsExperience: v.yearsExperience,
    city: v.city || undefined,
    credential: v.credential,
    preferredRole: v.preferredRole,
    workModePreference: v.workModePreference,
    skills: v.skills,
  }

  let scored
  try {
    scored = await scoreAgainstIndex(supabase, candidate, { openToAdjacent: v.openToAdjacent })
  } catch {
    return { ok: false, error: 'The index query failed. Nothing was written.' }
  }

  const { count: indexed } = await supabase
    .from('roles').select('id', { count: 'exact', head: true }).eq('in_india', true)

  const tally = new Map<Bucket, number>()
  for (const r of scored) {
    const b = bucketFor(r.breakdown)
    tally.set(b, (tally.get(b) ?? 0) + 1)
  }

  // Same ordering the shortlist uses: the asked-for city first, then score.
  const ranked = [...scored].sort(
    (a, b) => locationRank(a.breakdown) - locationRank(b.breakdown) || b.score - a.score,
  )

  return {
    ok: true,
    scoped: scored.length,
    indexed: indexed ?? 0,
    buckets: [...tally.entries()].map(([bucket, count]) => ({ bucket, count })),
    roles: ranked.slice(0, SHOW).map((r) => ({
      title: r.title,
      company: r.company,
      city: r.city,
      score: r.score,
      reason: r.reason,
      bucket: bucketFor(r.breakdown),
      breakdown: r.breakdown,
    })),
  }
}
