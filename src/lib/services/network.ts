import { createClient } from '@/lib/supabase/server'
import type { Contact } from '@/lib/contacts'

/**
 * The candidate's own LinkedIn connections (migration 0031). Owner-only by
 * RLS; every function runs on the caller's client. Third-party personal data —
 * see the table comment — so nothing here reads another user's rows or writes
 * anywhere but the caller's own.
 */

export type ConnectionAt = { fullName: string; position: string | null; profileUrl: string | null; email: string | null; source: Contact['source'] }

/**
 * Replace ONE SOURCE's rows: an upload is a snapshot of that file, not an append, and it
 * must not wipe the rows that came from somewhere else (migration 0043). Null on failure.
 * Before 0043 there is no `source` column, so only the original LinkedIn upload works and
 * it behaves exactly as it always did.
 */
export async function replaceConnections(userId: string, rows: Contact[], source: Contact['source'] = 'linkedin'): Promise<number | null> {
  const supabase = await createClient()
  const { error: delErr } = await supabase.from('connections').delete().eq('user_id', userId).eq('source', source)
  const hasSources = !delErr
  if (!hasSources) {
    if (source !== 'linkedin') return null
    const legacy = await supabase.from('connections').delete().eq('user_id', userId)
    if (legacy.error) return null
  }
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase.from('connections').insert(rows.slice(i, i + 1000).map((c) => ({
      user_id: userId, full_name: c.fullName, company: c.company, company_norm: c.companyNorm,
      position: c.position, profile_url: c.profileUrl, connected_on: c.connectedOn,
      ...(hasSources ? { source: c.source, email: c.source === 'linkedin' ? null : c.email } : {}),
    })))
    if (error) return null
  }
  return rows.length
}

/** Most contacts a candidate can type in by hand. */
export const MAX_MANUAL = 200

/** Add one person the candidate typed in. 'full' past MAX_MANUAL; 'missing-update' before 0043. */
export async function addManualContact(userId: string, c: Contact): Promise<'ok' | 'full' | 'missing-update' | 'failed'> {
  const supabase = await createClient()
  const { count, error: cErr } = await supabase.from('connections').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('source', 'manual')
  if (cErr) return 'missing-update'
  if ((count ?? 0) >= MAX_MANUAL) return 'full'
  const { error } = await supabase.from('connections').insert({
    user_id: userId, full_name: c.fullName, company: c.company, company_norm: c.companyNorm, position: c.position, source: 'manual', email: c.email,
  })
  return error ? 'failed' : 'ok'
}

/** Delete one source's rows, or everything. Before 0043 there is only one source, so a source filter is dropped. */
export async function deleteConnections(userId: string, source?: Contact['source']): Promise<boolean> {
  const supabase = await createClient()
  if (!source) return !(await supabase.from('connections').delete().eq('user_id', userId)).error
  const res = await supabase.from('connections').delete().eq('user_id', userId).eq('source', source)
  if (res.error && source === 'linkedin') return !(await supabase.from('connections').delete().eq('user_id', userId)).error
  return !res.error
}

/** How many of each source the candidate holds; null when the table is missing. `sourced` is false before 0043. */
export async function connectionCounts(userId: string): Promise<{ linkedin: number; google: number; manual: number; sourced: boolean } | null> {
  const total = await countConnections(userId)
  if (total === null) return null
  const supabase = await createClient()
  const one = (s: string) => supabase.from('connections').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('source', s)
  const [li, g, m] = await Promise.all([one('linkedin'), one('google'), one('manual')])
  if (li.error) return { linkedin: total, google: 0, manual: 0, sourced: false }
  return { linkedin: li.count ?? 0, google: g.count ?? 0, manual: m.count ?? 0, sourced: true }
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
  const read = (cols: string) => supabase.from('connections').select(cols).eq('user_id', userId).eq('company_norm', norm).order('connected_on', { ascending: false, nullsFirst: false }).limit(20)
  let res = await read('full_name, position, profile_url, source, email')
  // Before 0043 those two columns do not exist; ask for what does.
  if (res.error) res = await read('full_name, position, profile_url')
  return ((res.data ?? []) as unknown as { full_name: string; position: string | null; profile_url: string | null; source?: Contact['source']; email?: string | null }[])
    .map((r) => ({ fullName: r.full_name, position: r.position, profileUrl: r.profile_url, email: r.email ?? null, source: r.source ?? 'linkedin' }))
}
