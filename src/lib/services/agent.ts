import { createClient } from '@/lib/supabase/server'
import { displayEmployer } from '@/lib/display-names'
import { isEasyApply } from '@/lib/job-facts'
import { sanitizeAgentSettings, proposeQueue, type AgentMode, type AgentSettings, type Candidate } from '@/lib/agent'
import { readFeedPrefs } from '@/lib/services/feed-prefs'
import { readTrackedStatuses } from '@/lib/services/workspace'
import { trackerStats, type Stage } from '@/lib/tracker-stats'
import { istDay } from '@/lib/day'

/**
 * The agent's reads and writes (migration 0048). The caller's client: the owner-only profiles policy is the
 * security. A read error on the settings means "not stored yet" — the agent then runs on its default and the
 * panel says the update is missing.
 */
export async function readAgentSettings(userId: string): Promise<{ settings: AgentSettings; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('agent_settings').eq('id', userId).maybeSingle()
  if (error) return { settings: sanitizeAgentSettings(null), stored: false }
  return { settings: sanitizeAgentSettings((data as { agent_settings?: unknown } | null)?.agent_settings), stored: true }
}

export async function writeAgentSettings(userId: string, settings: AgentSettings): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ agent_settings: sanitizeAgentSettings(settings) }).eq('id', userId)
  return { ok: !error }
}

/** Applications dated in the last seven days, by the tracker's own rule (applied_on, 0028). Null when the tracker cannot be read. */
export async function readAppliedThisWeek(): Promise<number | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('applications').select('status, applied_on').limit(1000)
  if (error) return null
  const rows = (data ?? []) as unknown as { status: Stage; applied_on: string | null }[]
  return trackerStats(rows.map((r) => ({ status: r.status, appliedOn: r.applied_on })), istDay()).appliedThisWeek
}

type Row = { role_id: string; score: number | null; roles: { title: string; company_name: string | null; apply_url: string } | null }

/** The candidate's highest-scored roles, as agent candidates: Easy apply or not, tracked or not, hidden or not. */
export async function readAgentCandidates(userId: string, limit = 60): Promise<Candidate[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('gate_results').select('role_id, score, roles(title, company_name, apply_url)').eq('user_id', userId).order('score', { ascending: false, nullsFirst: false }).limit(limit)
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.roles && r.score !== null)
  const [tracked, prefs] = await Promise.all([readTrackedStatuses(rows.map((r) => r.role_id)), readFeedPrefs(userId)])
  return rows.map((r) => ({
    roleId: r.role_id, title: r.roles!.title, company: displayEmployer(r.roles!.company_name), score: Math.round(r.score!),
    applyUrl: r.roles!.apply_url, easy: isEasyApply(r.roles!.apply_url), tracked: tracked.has(r.role_id), hidden: prefs.hidden.has(r.role_id),
  }))
}

/** What the agent would queue right now, for the signed-in candidate — or nothing, when it is off, at its weekly target, or unreadable. */
export async function proposeForCandidate(userId: string, o: { max?: number; onlyMode?: AgentMode } = {}): Promise<{ settings: AgentSettings; stored: boolean; appliedThisWeek: number | null; picks: Candidate[] }> {
  const { settings, stored } = await readAgentSettings(userId)
  // Settings first and cheap: every page load asks about auto-queue, and most candidates are not in that mode.
  if (settings.mode === 'off' || (o.onlyMode && settings.mode !== o.onlyMode)) return { settings, stored, appliedThisWeek: null, picks: [] }
  const [applied, candidates] = await Promise.all([readAppliedThisWeek(), readAgentCandidates(userId)])
  return { settings, stored, appliedThisWeek: applied, picks: proposeQueue(candidates, settings, { appliedThisWeek: applied ?? 0, max: o.max ?? 5 }) }
}

/** Remember roles that were queued, so they are never queued twice. Capped in sanitizeAgentSettings. */
export async function markQueued(userId: string, roleIds: string[]): Promise<{ ok: boolean }> {
  const { settings, stored } = await readAgentSettings(userId)
  if (!stored) return { ok: false }
  const at = new Date().toISOString()
  const have = new Set(settings.queued.map((q) => q.id))
  return writeAgentSettings(userId, { ...settings, queued: [...settings.queued, ...roleIds.filter((id) => !have.has(id)).map((id) => ({ id, at }))] })
}
