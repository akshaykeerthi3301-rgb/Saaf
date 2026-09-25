import { createClient } from '@/lib/supabase/server'
import { viewFromParams, toggleSkill, type FeedView, type RoleText } from '@/lib/feed-query'
import { displayEmployer } from '@/lib/display-names'

/**
 * Hidden jobs, saved filters and skill corrections — the candidate's own feed
 * preferences (Phase 15, 2026-09-25). All on the caller's client: the profiles
 * owner-only policy is the security; the .eq('id', userId) is correctness.
 *
 * ⚠️ READS ARE ERROR-TOLERANT, BECAUSE MIGRATION 0030 MAY NOT BE APPLIED. If the
 * columns do not exist, /today must still render; `stored: false` lets the
 * controls say what is missing instead of failing silently.
 */

export const MAX_HIDDEN = 500
export const MAX_SAVED = 10

export type SavedFilter = { name: string; view: FeedView }
export type FeedPrefs = { hidden: Set<string>; saved: SavedFilter[]; stored: boolean }

function sanitizeSaved(raw: unknown): SavedFilter[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_SAVED).flatMap((x) => {
    if (!x || typeof x !== 'object') return []
    const o = x as { name?: unknown; view?: unknown }
    const name = typeof o.name === 'string' ? o.name.trim().slice(0, 40) : ''
    if (!name || !o.view || typeof o.view !== 'object') return []
    const v = o.view as Record<string, unknown>
    // Rebuilt through the whitelist: a stored value can only ever be a view the pills could make.
    const view = viewFromParams({
      min80: v.min80 ? '1' : undefined, fresh: v.fresh ? '1' : undefined,
      remote: v.remote ? '1' : undefined, easy: v.easy ? '1' : undefined,
      q: typeof v.q === 'string' ? v.q : undefined, city: typeof v.city === 'string' ? v.city : undefined,
    })
    return [{ name, view }]
  })
}

export async function readFeedPrefs(userId: string): Promise<FeedPrefs> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('hidden_role_ids, saved_filters').eq('id', userId).maybeSingle()
  if (error || !data) return { hidden: new Set(), saved: [], stored: !error }
  const row = data as unknown as { hidden_role_ids: string[] | null; saved_filters: unknown }
  return { hidden: new Set(row.hidden_role_ids ?? []), saved: sanitizeSaved(row.saved_filters), stored: true }
}

export async function setRoleHidden(userId: string, roleId: string, hidden: boolean): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('hidden_role_ids').eq('id', userId).maybeSingle()
  if (error) return { ok: false }
  const current = new Set(((data as { hidden_role_ids: string[] | null } | null)?.hidden_role_ids) ?? [])
  if (hidden) current.add(roleId); else current.delete(roleId)
  // Oldest drop off first past the cap; a Set keeps insertion order.
  const next = [...current].slice(-MAX_HIDDEN)
  const { error: wErr } = await supabase.from('profiles').update({ hidden_role_ids: next }).eq('id', userId)
  return { ok: !wErr }
}

export async function writeSavedFilters(userId: string, filters: SavedFilter[]): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ saved_filters: filters.slice(0, MAX_SAVED) }).eq('id', userId)
  return { ok: !error }
}

/** Title, company and location for the given roles — read only when a text filter is on. */
export async function readRoleText(roleIds: string[]): Promise<Map<string, RoleText>> {
  const out = new Map<string, RoleText>()
  if (!roleIds.length) return out
  const supabase = await createClient()
  for (let i = 0; i < roleIds.length; i += 100) {
    const { data } = await supabase
      .from('roles')
      .select('id, title, company_name, city, location_raw')
      .in('id', roleIds.slice(i, i + 100))
    for (const r of (data ?? []) as unknown as { id: string; title: string; company_name: string | null; city: string | null; location_raw: string | null }[]) {
      out.set(r.id, { title: r.title, company: displayEmployer(r.company_name), location: [r.city, r.location_raw].filter(Boolean).join(' · ') })
    }
  }
  return out
}

/** Add or remove one skill on the profile. Returns the new list, or null on failure. */
export async function correctSkill(userId: string, skill: string, have: boolean): Promise<string[] | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('skills').eq('id', userId).maybeSingle()
  if (error) return null
  const next = toggleSkill(((data as { skills: string[] | null } | null)?.skills) ?? [], skill, have)
  const { error: wErr } = await supabase.from('profiles').update({ skills: next, updated_at: new Date().toISOString() }).eq('id', userId)
  return wErr ? null : next
}

/** The candidate's stored score for one role, after a recompute. */
export async function readRoleScore(userId: string, roleId: string): Promise<number | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('gate_results').select('score').eq('user_id', userId).eq('role_id', roleId).maybeSingle()
  const s = (data as { score: number | null } | null)?.score
  return s === null || s === undefined ? null : Number(s)
}
