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
  const whole = byLower.get(input.trim().toLowerCase())
  if (whole) return whole

  /**
   * ⚠️ FALL BACK TO THE PARTS, BECAUSE REAL PROFILE CITIES ARE NOT BARE NAMES.
   *
   * The résumé parser and the location picker both produce strings like
   * "Bangalore, India", "Mumbai, Maharashtra, India" and "New Delhi, India" —
   * that is what a CV actually says. An exact lookup missed every one of them
   * and returned null, which does not fail loudly: matchLocation() treats null
   * as "a city we do not carry" and falls back to a literal substring test of
   * the candidate's whole string.
   *
   * So a candidate whose city read "Bangalore, India" matched only postings
   * whose location contained that exact phrase. "Bengaluru, Karnataka, India" —
   * the single commonest location in the index — scored as ANOTHER CITY, at
   * 3/10 on location, and landed in the out-of-town bucket. Measured on the
   * founder's own profile on 2026-09-07: 36 roles were placed in their city and
   * 385 elsewhere, almost all of which were in Bengaluru.
   *
   * Taking the first resolvable comma-separated part fixes it without loosening
   * anything: each part is still matched exactly against the taxonomy, so a
   * city we do not carry still returns null and still gets the literal fallback.
   */
  for (const part of input.split(',')) {
    const hit = byLower.get(part.trim().toLowerCase())
    if (hit) return hit
  }
  return null
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

/**
 * States and union territories, official name first with former names as
 * aliases — postings use both indefinitely, exactly as with cities.
 *
 * These matter more than they look. `Sonipat, Haryana` and `Bhilai,
 * Chhattisgarh` name no city this taxonomy carries, and the only thing marking
 * them as Indian postings is the state.
 */
export const INDIAN_STATES: string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Chattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Orissa', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Tamilnadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'Uttaranchal', 'West Bengal',
  // Union territories.
  'Andaman and Nicobar', 'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry', 'Pondicherry',
]

/**
 * Countries whose place names collide with Indian ones.
 *
 * There is a Hyderabad in Sindh, a Punjab in Pakistan, a Delhi in Ontario and
 * another in New York. A pure allow-list of Indian names calls all four Indian.
 * So a location naming a country that is not India is rejected — unless it
 * names India too, because a posting listing "Bengaluru / Singapore" is
 * genuinely an India posting and the India rule wins first.
 *
 * Not exhaustive and does not need to be: it only has to cover the countries a
 * colliding name actually appears in.
 */
const FOREIGN_MARKERS = [
  'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'bhutan', 'afghanistan',
  'united states', 'usa', 'u.s.a', 'canada', 'mexico', 'brazil',
  'united kingdom', 'england', 'scotland', 'ireland', 'france', 'germany',
  'spain', 'italy', 'netherlands', 'poland', 'portugal', 'sweden', 'switzerland',
  'singapore', 'malaysia', 'indonesia', 'philippines', 'thailand', 'vietnam',
  'china', 'japan', 'korea', 'taiwan', 'hong kong', 'australia', 'new zealand',
  'united arab emirates', 'saudi arabia', 'qatar', 'kuwait', 'bahrain', 'oman',
  'egypt', 'nigeria', 'kenya', 'south africa', 'israel', 'turkey',
]

/** Every Indian place name this taxonomy knows: canonical cities, their
 *  aliases, and the states. Longest first for the same masking reason NAMES is. */
const INDIAN_PLACE_NAMES: string[] = [
  ...CITIES.flatMap((c) => [c.name, ...(c.aliases ?? [])]),
  ...INDIAN_STATES,
].sort((a, b) => b.length - a.length)

/**
 * Is this posting located in India?
 *
 * ⚠️ THIS IS THE INGEST'S ONLY GATE ON SUPPLY. Every role the ATS boards
 * return is tested here; a name this misses is a role the product never sees,
 * and — since scripts/qualify-boards.ts accepts or rejects a whole company on
 * the same test — a board this misses is an employer permanently discarded.
 *
 * It replaced twenty hardcoded substrings in src/gates/extract.ts, which was
 * wrong in both directions:
 *
 *   MISSED   Kochi, Indore, Coimbatore, Chandigarh, Bhubaneswar, Ludhiana and
 *            every state but seven. `Sonipat, Haryana` survived only because
 *            Haryana happened to be on the list; `Bhilai, Chhattisgarh` did not.
 *   INVENTED `'india'` was tested with String.includes, so **"Indianapolis,
 *            Indiana" was an Indian posting** — as was any Indiana address.
 *            Word boundaries end that.
 *
 * Order is the substance. India named explicitly wins outright, so a
 * multi-country posting that includes India still counts. Otherwise an Indian
 * place name counts only if no foreign country is named beside it.
 */
export function isIndianLocation(locationText: string): boolean {
  if (!locationText) return false
  const text = locationText.toLowerCase()

  if (mentions(text, 'india')) return true
  // Bharat, and the ISO country code as a trailing comma-separated token —
  // SmartRecruiters writes "Chennai, in", and a bare `in` anywhere else is the
  // commonest word in English, so it is only read in that one position.
  if (mentions(text, 'bharat')) return true
  if (/,\s*in\s*$/.test(text)) return true

  if (FOREIGN_MARKERS.some((c) => mentions(text, c))) return false

  return INDIAN_PLACE_NAMES.some((n) => mentions(text, n))
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
