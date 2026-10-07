import { createClient } from '@/lib/supabase/server'
import {
  profileFieldsFromSearch, sanitizeSearches, searchFromProfile, withSearch, type SavedSearch,
} from '@/lib/saved-searches'

/**
 * Saved searches (migration 0037) — named sets of roles on the candidate's own
 * profile. The caller's client throughout: the owner-only profiles policy is the
 * security; the .eq('id', userId) is correctness. Reads are error-tolerant,
 * because 0037 may not be applied: `stored: false` lets the menu say so.
 */
export type SavedSearches = {
  searches: SavedSearch[]
  /** The search the profile is on right now, whether or not it has a name. */
  current: Pick<SavedSearch, 'roles' | 'keywords'>
  stored: boolean
}

type Row = { preferred_role: string | null; preferred_roles: string[] | null; keywords: string[] | null }

async function readCurrent(userId: string) {
  const supabase = await createClient()
  // preferred_roles / keywords arrive with 0022; fall back to the singular role.
  const full = await supabase.from('profiles').select('preferred_role, preferred_roles, keywords').eq('id', userId).maybeSingle()
  const row: Row | null = full.error
    ? ((await supabase.from('profiles').select('preferred_role').eq('id', userId).maybeSingle()).data as Row | null)
    : (full.data as Row | null)
  return searchFromProfile({ preferredRole: row?.preferred_role ?? null, preferredRoles: row?.preferred_roles ?? null, keywords: row?.keywords ?? null })
}

export async function readSavedSearches(userId: string): Promise<SavedSearches> {
  const supabase = await createClient()
  const [current, saved] = await Promise.all([
    readCurrent(userId),
    supabase.from('profiles').select('saved_searches').eq('id', userId).maybeSingle(),
  ])
  if (saved.error) return { searches: [], current, stored: false }
  return { searches: sanitizeSearches((saved.data as { saved_searches: unknown } | null)?.saved_searches), current, stored: true }
}

export type SaveSearchResult = { ok: true } | { ok: false; reason: 'missing-update' | 'full' | 'failed' }

/** Keep the profile's current search under a name. */
export async function saveCurrentSearch(userId: string, name: string): Promise<SaveSearchResult> {
  const { searches, current, stored } = await readSavedSearches(userId)
  if (!stored) return { ok: false, reason: 'missing-update' }
  const next = withSearch(searches, { name, ...current })
  if (!next) return { ok: false, reason: 'full' }
  return writeSearches(userId, sanitizeSearches(next))
}

export async function deleteSearch(userId: string, name: string): Promise<SaveSearchResult> {
  const { searches, stored } = await readSavedSearches(userId)
  if (!stored) return { ok: false, reason: 'missing-update' }
  return writeSearches(userId, searches.filter((s) => s.name.toLowerCase() !== name.toLowerCase()))
}

async function writeSearches(userId: string, list: SavedSearch[]): Promise<SaveSearchResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ saved_searches: list }).eq('id', userId)
  return error ? { ok: false, reason: 'failed' } : { ok: true }
}

/**
 * Make a saved search the profile's own: its roles and keywords go back onto the
 * columns the scorer reads. The caller re-scores afterwards. False when there is
 * no search by that name.
 */
export async function applySearchToProfile(userId: string, name: string): Promise<boolean> {
  const { searches } = await readSavedSearches(userId)
  const s = searches.find((x) => x.name.toLowerCase() === name.toLowerCase())
  if (!s) return false
  const f = profileFieldsFromSearch(s)
  const supabase = await createClient()
  // The singular column is the one that always exists; the arrays follow, best-effort, as confirmProfile does.
  const core = await supabase.from('profiles').update({ preferred_role: f.preferredRole, updated_at: new Date().toISOString() }).eq('id', userId)
  if (core.error) return false
  await supabase.from('profiles').update({ preferred_roles: f.preferredRoles, keywords: f.keywords }).eq('id', userId)
  return true
}
