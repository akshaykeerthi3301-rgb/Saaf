/**
 * Indian work locations, as a taxonomy rather than a free-text box.
 *
 * WHY THIS EXISTS, AND IT IS NOT A UI PREFERENCE. `locationFit()` in
 * src/match/score.ts scored a role by testing whether the posting's location
 * string contained the candidate's city, verbatim. Measured against the live
 * index on 2026-09-07, that quietly lost roles:
 *
 *     Bengaluru            182 postings
 *     Bangalore             67 postings   <- same city, different spelling
 *     Hybrid in Bangalore   17 postings
 *     bengaluru / BENGALURU 10 postings
 *     Bengaluru-VTP          4 postings
 *
 * A candidate who wrote "Bengaluru" scored 84 Bangalore roles as "In another
 * city" — 3/10 instead of 10/10 on location — and nothing on screen said so.
 * The same trap is set for Gurugram/Gurgaon, Mumbai/Bombay, Kochi/Cochin and
 * every other city India has renamed since 1995.
 *
 * So the taxonomy carries the aliases, and matching goes through it.
 *
 * CLUSTERS ARE A SEPARATE, WEAKER CLAIM. Delhi, Noida, Gurugram and Ghaziabad
 * are one labour market that people commute across daily, and the same is true
 * of Mumbai/Navi Mumbai/Thane. A role in Noida is genuinely relevant to someone
 * who said Delhi — but it is not the same city, so it scores below an exact
 * match and says which city it actually is. See `locationFit`.
 *
 * The list is the cities India's employers actually hire into, seeded from the
 * live index and extended with the metros and tier-2 hubs it will reach as the
 * registry grows. Renames are the official post-rename name first, with the
 * former name as an alias, because postings use both indefinitely.
 */

export type Cluster = 'ncr' | 'mmr'

export const CLUSTER_LABEL: Record<Cluster, string> = {
  ncr: 'Delhi NCR',
  mmr: 'Mumbai Metropolitan Region',
}

export type City = {
  /** Canonical name. This is what gets stored in profiles.city. */
  name: string
  state: string
  /** Other spellings that appear in real postings. Matched, never displayed. */
  aliases?: string[]
  /** Commuting cluster, for the partial-credit tier. */
  cluster?: Cluster
}

/** Grouped for the picker. Order is by how much hiring each region carries. */
export const REGIONS: { region: string; cities: City[] }[] = [
  {
    region: 'Karnataka',
    cities: [
      { name: 'Bengaluru', state: 'Karnataka', aliases: ['Bangalore', 'Bangaluru'] },
      { name: 'Mysuru', state: 'Karnataka', aliases: ['Mysore'] },
      { name: 'Mangaluru', state: 'Karnataka', aliases: ['Mangalore'] },
    ],
  },
  {
    region: 'Delhi NCR',
    cities: [
      { name: 'Delhi', state: 'Delhi', aliases: ['New Delhi', 'NCR', 'Delhi NCR'], cluster: 'ncr' },
      { name: 'Gurugram', state: 'Haryana', aliases: ['Gurgaon'], cluster: 'ncr' },
      { name: 'Noida', state: 'Uttar Pradesh', cluster: 'ncr' },
      { name: 'Greater Noida', state: 'Uttar Pradesh', cluster: 'ncr' },
      { name: 'Ghaziabad', state: 'Uttar Pradesh', cluster: 'ncr' },
      { name: 'Faridabad', state: 'Haryana', cluster: 'ncr' },
    ],
  },
  {
    region: 'Maharashtra',
    cities: [
      { name: 'Mumbai', state: 'Maharashtra', aliases: ['Bombay'], cluster: 'mmr' },
      { name: 'Navi Mumbai', state: 'Maharashtra', cluster: 'mmr' },
      { name: 'Thane', state: 'Maharashtra', cluster: 'mmr' },
      { name: 'Pune', state: 'Maharashtra', aliases: ['Poona'] },
      { name: 'Nagpur', state: 'Maharashtra' },
      { name: 'Nashik', state: 'Maharashtra', aliases: ['Nasik'] },
    ],
  },
  {
    region: 'Telangana & Andhra Pradesh',
    cities: [
      { name: 'Hyderabad', state: 'Telangana', aliases: ['Secunderabad', 'Cyberabad'] },
      { name: 'Visakhapatnam', state: 'Andhra Pradesh', aliases: ['Vizag'] },
      { name: 'Vijayawada', state: 'Andhra Pradesh' },
    ],
  },
  {
    region: 'Tamil Nadu & Puducherry',
    cities: [
      { name: 'Chennai', state: 'Tamil Nadu', aliases: ['Madras'] },
      { name: 'Coimbatore', state: 'Tamil Nadu' },
      { name: 'Madurai', state: 'Tamil Nadu' },
      { name: 'Tiruchirappalli', state: 'Tamil Nadu', aliases: ['Trichy'] },
      { name: 'Puducherry', state: 'Puducherry', aliases: ['Pondicherry'] },
    ],
  },
  {
    region: 'Gujarat',
    cities: [
      { name: 'Ahmedabad', state: 'Gujarat' },
      { name: 'Gandhinagar', state: 'Gujarat', aliases: ['GIFT City'] },
      { name: 'Surat', state: 'Gujarat' },
      { name: 'Vadodara', state: 'Gujarat', aliases: ['Baroda'] },
      { name: 'Rajkot', state: 'Gujarat' },
    ],
  },
  {
    region: 'Kerala',
    cities: [
      { name: 'Kochi', state: 'Kerala', aliases: ['Cochin', 'Ernakulam'] },
      { name: 'Thiruvananthapuram', state: 'Kerala', aliases: ['Trivandrum'] },
      { name: 'Kozhikode', state: 'Kerala', aliases: ['Calicut'] },
    ],
  },
  {
    region: 'West Bengal & the East',
    cities: [
      { name: 'Kolkata', state: 'West Bengal', aliases: ['Calcutta'] },
      { name: 'Bhubaneswar', state: 'Odisha' },
      { name: 'Guwahati', state: 'Assam' },
      { name: 'Ranchi', state: 'Jharkhand' },
      { name: 'Jamshedpur', state: 'Jharkhand' },
      { name: 'Patna', state: 'Bihar' },
    ],
  },
  {
    region: 'North & Central',
    cities: [
      { name: 'Chandigarh', state: 'Chandigarh', aliases: ['Mohali', 'Panchkula'] },
      { name: 'Jaipur', state: 'Rajasthan' },
      { name: 'Jodhpur', state: 'Rajasthan' },
      { name: 'Udaipur', state: 'Rajasthan' },
      { name: 'Lucknow', state: 'Uttar Pradesh' },
      { name: 'Kanpur', state: 'Uttar Pradesh' },
      { name: 'Varanasi', state: 'Uttar Pradesh', aliases: ['Banaras', 'Benares'] },
      { name: 'Prayagraj', state: 'Uttar Pradesh', aliases: ['Allahabad'] },
      { name: 'Agra', state: 'Uttar Pradesh' },
      { name: 'Dehradun', state: 'Uttarakhand' },
      { name: 'Ludhiana', state: 'Punjab' },
      { name: 'Amritsar', state: 'Punjab' },
      { name: 'Indore', state: 'Madhya Pradesh' },
      { name: 'Bhopal', state: 'Madhya Pradesh' },
      { name: 'Raipur', state: 'Chhattisgarh' },
    ],
  },
  {
    region: 'Goa',
    cities: [{ name: 'Goa', state: 'Goa', aliases: ['Panaji', 'Panjim', 'Verna'] }],
  },
]

export const CITIES: City[] = REGIONS.flatMap((r) => r.cities)

const byLower = new Map<string, City>()
for (const c of CITIES) {
  byLower.set(c.name.toLowerCase(), c)
  for (const a of c.aliases ?? []) byLower.set(a.toLowerCase(), c)
}

/**
 * Resolve any spelling to the canonical city, or null for something we don't
 * carry. Null is never a rejection — a candidate may keep whatever they typed
 * (never turn a user away), it just doesn't get alias or cluster matching.
 */
export function resolveCity(input: string | null | undefined): City | null {
  if (!input) return null
  return byLower.get(input.trim().toLowerCase()) ?? null
}

export type LocationMatch =
  | { kind: 'exact'; city: string }
  | { kind: 'cluster'; city: string; cluster: Cluster }
  | null

/** Every (name, city) pair, longest name first.
 *
 *  Order is load-bearing. "Mumbai" appears inside "Navi Mumbai" and "Noida"
 *  inside "Greater Noida", so a shortest-first scan reports the wrong city: a
 *  Navi Mumbai posting came back as "In Mumbai", which is exactly the kind of
 *  unearned specific claim this product exists to avoid. Longest first makes
 *  the most specific name win. */
const NAMES: { name: string; city: City }[] = CITIES
  .flatMap((city) => [city.name, ...(city.aliases ?? [])].map((name) => ({ name, city })))
  .sort((a, b) => b.name.length - a.name.length)

/** Word-boundary test, so "Goa" cannot match "Goalpara" and "Delhi" still
 *  matches "New Delhi, India". The old scoring code used a bare substring. */
function mentions(haystack: string, needle: string): boolean {
  const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(haystack.toLowerCase())
}

/**
 * Every city the posting names.
 *
 * Longest name first, MASKING each hit as it goes. Both halves matter and each
 * fixes a case the other gets wrong:
 *
 *   masking      "Navi Mumbai, Maharashtra" must not also report Mumbai, or a
 *                Navi Mumbai role is announced as "In Mumbai" — an unearned
 *                specific claim, which is the one thing this product cannot do.
 *   a set, not
 *   one winner   "bengaluru, mumbai" names two cities and is genuinely in both.
 *                Returning only the most specific one lost the Mumbai match.
 */
function citiesInText(locationText: string): Set<City> {
  let rest = locationText.toLowerCase()
  const found = new Set<City>()

  for (const { name, city } of NAMES) {
    if (!mentions(rest, name)) continue
    found.add(city)
    // Blank the span so a shorter name contained in this one cannot re-match.
    const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    rest = rest.replace(new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'gi'), ' ')
  }
  return found
}

export function matchLocation(candidateCity: string | undefined, locationText: string): LocationMatch {
  if (!candidateCity || !locationText) return null

  const mine = resolveCity(candidateCity)

  // A city we do not carry: match the raw string, so a candidate who typed
  // something outside the taxonomy is no worse off than before it existed.
  if (!mine) {
    return mentions(locationText, candidateCity) ? { kind: 'exact', city: candidateCity } : null
  }

  const named = citiesInText(locationText)
  if (named.has(mine)) return { kind: 'exact', city: mine.name }

  if (mine.cluster) {
    for (const { city } of NAMES) {
      if (named.has(city) && city.cluster === mine.cluster) {
        return { kind: 'cluster', city: city.name, cluster: mine.cluster }
      }
    }
  }
  return null
}
