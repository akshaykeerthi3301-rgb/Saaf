import { createClient } from '@/lib/supabase/server'
import type { Connection } from '@/lib/linkedin-connections'

/**
 * The candidate's own LinkedIn connections (migration 0031). Owner-only by
 * RLS; every function runs on the caller's client. Third-party personal data —
 * see the table comment — so nothing here reads another user's rows or writes
 * anywhere but the caller's own.
 */

export type ConnectionAt = { fullName: string; position: string | null; profileUrl: string | null }

/** Replace the whole set: an upload is a snapshot, not an append. Null on failure (e.g. 0031 not applied). */
export async function replaceConnections(userId: string, rows: Connection[]): Promise<number | null> {
  const supabase = await createClient()
  const { error: delErr } = await supabase.from('connections').delete().eq('user_id', userId)
  if (delErr) return null
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase.from('connections').insert(rows.slice(i, i + 1000).map((c) => ({
      user_id: userId, full_name: c.fullName, company: c.company, company_norm: c.companyNorm,
      position: c.position, profile_url: c.profileUrl, connected_on: c.connectedOn,
    })))
    if (error) return null
  }
  return rows.length
}

export async function deleteConnections(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('connections').delete().eq('user_id', userId)
  return !error
}

/** How many connections the candidate holds; null when the table is missing. */
export async function countConnections(userId: string): Promise<number | null> {
  const supabase = await createClient()
  const { count, error } = await supabase.from('connections').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  // ⚠️ A head-only count on a MISSING table returns error: null, count: null
  // (status 204) — measured 2026-10-02 before 0031 was applied. So a null
  // count means "no table", not zero; reading it as 0 hid the missing-update note.
  return error || count === null ? null : count
}

/** company key → how many connections work there, for the given keys only. */
export async function connectionsByCompany(userId: string, norms: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  const keys = [...new Set(norms.filter(Boolean))]
  if (!keys.length) return out
  const supabase = await createClient()
  const { data, error } = await supabase.from('connections').select('company_norm').eq('user_id', userId).in('company_norm', keys.slice(0, 200))
  if (error) return out
  for (const r of (data ?? []) as { company_norm: string }[]) out.set(r.company_norm, (out.get(r.company_norm) ?? 0) + 1)
  return out
}

export async function connectionsAt(userId: string, norm: string): Promise<ConnectionAt[]> {
  if (!norm) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('connections')
    .select('full_name, position, profile_url')
    .eq('user_id', userId)
    .eq('company_norm', norm)
    .order('connected_on', { ascending: false, nullsFirst: false })
    .limit(20)
  return ((data ?? []) as { full_name: string; position: string | null; profile_url: string | null }[])
    .map((r) => ({ fullName: r.full_name, position: r.position, profileUrl: r.profile_url }))
}
