import { ALL_ROLES, DOMAINS } from '@/lib/taxonomy/roles'
import { CITIES, type City } from '@/lib/taxonomy/locations'

/**
 * Role and role-in-city public pages (F-1203, TASK-158) — what they are made of.
 *
 * ⚠️ THE THIN-CONTENT GUARD. A page for a role-and-city with two postings is the page a search engine
 * learns to ignore the whole site for, so a page with fewer than MIN_ROLES_TO_INDEX live roles is
 * still shown to anyone who arrives (it says what exists) but is `noindex` and is left out of the
 * sitemap. The founder decides the number; 5 is the starting value, read from here and from nowhere else.
 */
export const MIN_ROLES_TO_INDEX = 5

export const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const ROLE_BY_SLUG = new Map(ALL_ROLES.map((r) => [slugify(r), r]))
const CITY_BY_SLUG = new Map(CITIES.map((c) => [slugify(c.name), c]))

export const roleFromSlug = (slug: string): string | null => ROLE_BY_SLUG.get(slug) ?? null
export const cityFromSlug = (slug: string): City | null => CITY_BY_SLUG.get(slug) ?? null
export const roleSlug = (role: string) => slugify(role)
export const citySlug = (city: City) => slugify(city.name)

/**
 * The phrase a posting's title must contain to count as this role: "Product Manager" → "product manager".
 *
 * ⚠️ A PHRASE, NOT "EVERY WORD ANYWHERE". The feed's matcher is recall-first (every word, any order) because
 * a candidate would rather see a near miss than nothing. A public page's heading makes a claim to a stranger
 * and to a search engine, and "Business Development Manager - Low Voltage Switchgear Product" is not a Product
 * Manager role — it was counted as one the first time this ran (2026-10-08, found by reading the page).
 */
export function rolePhrase(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9+# ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Every spelling postings use for a city, lower-cased: Bengaluru → bengaluru, bangalore, bangaluru. */
export function cityPatterns(city: City): string[] {
  return [city.name, ...(city.aliases ?? [])].map((s) => s.toLowerCase())
}

/** Does this posting title belong to this role? Same rule as the page query, for counting in memory. */
export const titleIsRole = (title: string, role: string): boolean => title.toLowerCase().includes(rolePhrase(role))

export const isIndexable = (total: number) => total >= MIN_ROLES_TO_INDEX

export function pageTitle(role: string, city: City | null, total: number): string {
  return `${role} jobs in ${city ? city.name : 'India'}${total > 0 ? ` — ${total.toLocaleString('en-IN')} open role${total === 1 ? '' : 's'}` : ''} | Saaf`
}

/** Roles grouped by domain, for the /roles index. */
export const ROLE_GROUPS = DOMAINS.map((d) => ({ label: d.label, roles: d.roles }))
