import { createClient } from '@/lib/supabase/server'
import { scoreRows, type RoleRow, type ScoredRole } from '@/lib/score-candidate'
import { candidateFromProfile, type ProfileScoringRow } from '@/lib/candidate-profile'
import { afterScoring, EXPLORE_SCAN, EXPLORE_SHOW, isOpenEnded, planExplore, type ExplorePlan } from '@/lib/explore'
import { payFromRow, ROLE_FACT_COLUMNS, type RoleFactsRow } from '@/lib/role-facts'
import { REMOTE_LOCATION } from '@/lib/services/public-jobs'
import { jobGist } from '@/lib/job-gist'
import type { FeedView } from '@/lib/feed-query'

/**
 * "Search all roles" (TASK-217): the whole index, read as the signed-in candidate (RLS: candidates read
 * `roles` and `role_requirements`, so no privilege is borrowed), the first EXPLORE_SCAN roles that fit the
 * parsed sentence scored on the spot with the SAME scorer the nightly run uses, best first.
 *
 * The result says what it is: how many roles in the whole index fit the words, how many were scored, and
 * which filters from the sentence could not be applied here. Nothing is written — an explored role is not
 * in the candidate's matches until they track it.
 */

const PROFILE_COLUMNS = 'confirmed_at, years_experience, current_title, city, credential, preferred_role, preferred_roles, keywords, work_mode_preference, skills'

const ROLE_COLUMNS =
  `id, title, company_name, apply_url, description, location_raw, city, unread_experience_mention, posted_at, first_seen_at, ${ROLE_FACT_COLUMNS}, role_requirements(*)`

export type ExploredRole = ScoredRole & { postedAt: string | null; statedPay: string | null; gist: string | null }

export type ExploreResult =
  | { kind: 'unconfirmed' }
  | { kind: 'open-ended'; plan: ExplorePlan }
  | { kind: 'failed' }
  | {
      kind: 'ok'
      plan: ExplorePlan
      /** Roles in the whole index that fit the words/city/remote/date/contract filters (exact). */
      total: number
      /** How many of those were read and scored (≤ EXPLORE_SCAN). */
      scanned: number
      /** Best first, after the score-dependent filters. */
      shown: ExploredRole[]
      /** How many scored roles the score-dependent filters (Match > 80, Easy Apply, agencies) removed. */
      removedAfterScoring: number
    }

type Row = RoleRow & RoleFactsRow & { posted_at: string | null; first_seen_at: string }

export async function exploreIndex(userId: string, view: FeedView): Promise<ExploreResult> {
  const supabase = await createClient()
  const { data: profile, error: pErr } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle()
  if (pErr) return { kind: 'failed' }
  if (!profile?.confirmed_at) return { kind: 'unconfirmed' }

  const plan = planExplore(view)
  if (isOpenEnded(plan)) return { kind: 'open-ended', plan }

  let q = supabase.from('roles').select(ROLE_COLUMNS, { count: 'exact' }).eq('in_india', true).is('closed_at', null)
  // Words: every word must be in the title or the employer's name (the public search's own rule; the tokens are
  // letters, digits, + and # only, so nothing typed can end the filter early).
  for (const t of plan.tokens) q = q.or(`title.ilike.%${t}%,company_name.ilike.%${t}%`)
  if (plan.cityPatterns.length) q = q.or(plan.cityPatterns.map((p) => `city.ilike.%${p}%`).join(','))
  if (plan.remote) q = q.or(REMOTE_LOCATION)
  if (plan.postedDays !== null) q = q.gte('posted_at', new Date(Date.now() - plan.postedDays * 86_400_000).toISOString())
  if (plan.types.length) q = q.in('employment_type', plan.types)
  if (plan.mode) q = q.eq('work_mode', plan.mode)
  for (const name of plan.skipNames) q = q.not('company_name', 'ilike', `%${name}%`)

  const { data, count, error } = await q
    .order('posted_at', { ascending: false, nullsFirst: false })
    .order('first_seen_at', { ascending: false })
    .limit(EXPLORE_SCAN)
  if (error) return { kind: 'failed' }

  const rows = (data ?? []) as unknown as Row[]
  const byId = new Map(rows.map((r) => [r.id, r]))
  const candidate = candidateFromProfile(profile as unknown as ProfileScoringRow)
  const scored = scoreRows(rows, candidate).map((s): ExploredRole => {
    const r = byId.get(s.roleId)!
    return { ...s, postedAt: r.posted_at, statedPay: payFromRow(r)?.text ?? null, gist: jobGist(r.description, r.title) }
  })
  const kept = afterScoring(scored.map((s) => ({ ...s, company: s.company, applyUrl: s.applyUrl })), plan)
  return {
    kind: 'ok',
    plan,
    total: count ?? rows.length,
    scanned: rows.length,
    shown: kept.slice(0, EXPLORE_SHOW),
    removedAfterScoring: scored.length - kept.length,
  }
}
