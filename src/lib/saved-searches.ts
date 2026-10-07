/**
 * Saved searches — a named set of roles (and keywords) the candidate can switch
 * between (F-113). Pure: the stored shape, its sanitiser and the two conversions
 * to and from the profile live here so "restores identically" is a tested fact.
 *
 * A saved search is NOT a filter on the feed (that is `saved_filters`, a view
 * over roles already scored). It decides WHICH roles are scored at all — it is
 * the profile's preferred_role / preferred_roles / keywords, kept under a name.
 */
export const MAX_SEARCHES = 8
export const MAX_SEARCH_ROLES = 5
const MAX_KEYWORDS = 20

export type SavedSearch = { name: string; roles: string[]; keywords: string[] }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function uniq(list: unknown, max: number, each: number): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of list) {
    const s = clean(x, each)
    const k = s.toLowerCase()
    if (!s || seen.has(k)) continue
    seen.add(k)
    out.push(s)
    if (out.length === max) break
  }
  return out
}

/** Rebuild whatever was stored through the whitelist: only a shape the controls could have made survives. */
export function sanitizeSearches(raw: unknown): SavedSearch[] {
  if (!Array.isArray(raw)) return []
  const names = new Set<string>()
  const out: SavedSearch[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const o = x as { name?: unknown; roles?: unknown; keywords?: unknown }
    const name = clean(o.name, 40)
    const roles = uniq(o.roles, MAX_SEARCH_ROLES, 120)
    if (!name || roles.length === 0 || names.has(name.toLowerCase())) continue
    names.add(name.toLowerCase())
    out.push({ name, roles, keywords: uniq(o.keywords, MAX_KEYWORDS, 40) })
    if (out.length === MAX_SEARCHES) break
  }
  return out
}

type ProfileSearch = { preferredRole: string | null; preferredRoles: string[] | null; keywords: string[] | null }

/** The profile's current search as a saved-search body (without a name). */
export function searchFromProfile(p: ProfileSearch): Pick<SavedSearch, 'roles' | 'keywords'> {
  return {
    roles: uniq([p.preferredRole, ...(p.preferredRoles ?? [])], MAX_SEARCH_ROLES, 120),
    keywords: uniq(p.keywords ?? [], MAX_KEYWORDS, 40),
  }
}

/** What to write back to the profile to restore a saved search. The first role stays the singular column. */
export function profileFieldsFromSearch(s: SavedSearch) {
  return { preferredRole: s.roles[0], preferredRoles: s.roles, keywords: s.keywords }
}

/** Save under a name: the same name (any case) is replaced, a new one is appended. Null when the list is full. */
export function withSearch(list: SavedSearch[], next: SavedSearch): SavedSearch[] | null {
  const k = next.name.toLowerCase()
  const i = list.findIndex((s) => s.name.toLowerCase() === k)
  if (i >= 0) return list.map((s, j) => (j === i ? next : s))
  return list.length >= MAX_SEARCHES ? null : [...list, next]
}

const key = (xs: string[]) => [...xs].map((x) => x.toLowerCase()).sort().join('\n')

/** Is this the search the profile is on now? Order of roles does not matter, the first role does. */
export function isActive(s: SavedSearch, current: Pick<SavedSearch, 'roles' | 'keywords'>): boolean {
  return s.roles[0]?.toLowerCase() === current.roles[0]?.toLowerCase() && key(s.roles) === key(current.roles) && key(s.keywords) === key(current.keywords)
}
