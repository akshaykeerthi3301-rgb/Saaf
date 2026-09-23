/**
 * The employer's name, as a person would write it.
 *
 * ⚠️ WHAT THE INDEX STORES IS OFTEN AN ATS SLUG IN TITLE CASE, and on a product
 * whose pitch is precision that reads as unfinished. Measured against the live
 * index on 2026-09-14, the worst offenders were also among the highest-volume
 * boards: "Wf" on 202 roles, "Jll" on 320, "Aecom" on 352, "Ag" on 207,
 * "Theapexgroup" on 214, "Genmills" on 103. A candidate comparing us with
 * Naukri sees "Wf" beside "Wells Fargo" and draws the obvious conclusion.
 *
 * ⚠️ APPLIED AT DISPLAY, NOT IN INGEST. Two reasons. The stored value is what
 * the board actually told us and should stay that way — it is the evidence
 * behind the name, and this product does not overwrite evidence. And a display
 * function can be corrected without a re-ingest of 23,000 rows.
 *
 * The overrides are GROUNDED, not guessed. Workday tokens carry a host and a
 * path, and the path routinely names the company the host abbreviates:
 * `wf.wd1.myworkdayjobs.com/wellsfargojobs`, `ag.wd3.myworkdayjobs.com/Airbus`,
 * `genmills.wd1.myworkdayjobs.com/GMI_External_Careers`. Every entry below was
 * read off its own registry token. Where a token does not say, there is no
 * entry — inventing a name here would be exactly the fabrication the rest of
 * the product refuses.
 */

/**
 * Keyed by the registry token, lowercased, because a token is stable and the
 * derived display name is the thing being corrected.
 */
const BY_TOKEN: Record<string, string> = {
  'wf.wd1.myworkdayjobs.com/wellsfargojobs': 'Wells Fargo',
  'jll.wd1.myworkdayjobs.com/jllcareers': 'JLL',
  'ag.wd3.myworkdayjobs.com/airbus': 'Airbus',
  'abb.wd3.myworkdayjobs.com/external_career_page': 'ABB',
  'theapexgroup.wd3.myworkdayjobs.com/apexgroupcareers': 'The Apex Group',
  'genmills.wd1.myworkdayjobs.com/gmi_external_careers': 'General Mills',
  'freseniusmedicalcare.wd3.myworkdayjobs.com/fme': 'Fresenius Medical Care',
  'dentsuaegis.wd3.myworkdayjobs.com/dan_global': 'Dentsu Aegis',
  'kyndryl.wd5.myworkdayjobs.com/kyndrylprofessionalcareers': 'Kyndryl',
  aecom2: 'AECOM',
  accorhotel: 'Accor',
  hackerrank: 'HackerRank',
  'lilt-production': 'Lilt',
  soprasteria1: 'Sopra Steria',
}

/** Keyed by the stored display name, for rows whose token we cannot see here. */
const BY_STORED: Record<string, string> = {
  wf: 'Wells Fargo',
  jll: 'JLL',
  aecom: 'AECOM',
  abb: 'ABB',
  theapexgroup: 'The Apex Group',
  genmills: 'General Mills',
  freseniusmedicalcare: 'Fresenius Medical Care',
  dentsuaegis: 'Dentsu Aegis',
  accorhotel: 'Accor',
  hackerrank: 'HackerRank',
  'lilt production': 'Lilt',
  instawork: 'Instawork',
}

/**
 * Words an ATS appends to a company's own name. Stripped only from the END, and
 * only when something is left — "Careers" on its own is somebody's company.
 */
const BOILERPLATE = /[\s-]*(careers?|jobs?|production|external|hq|global|india)$/i

/**
 * Initialisms a title-caser ruins. Kept deliberately short: every entry is a
 * word that is ALWAYS an initialism in a company name, never an ordinary word.
 * "Ag" is not here — it is Airbus in this index, which is what the override
 * table above is for.
 */
const INITIALISMS = new Set(['jll', 'abb', 'ibm', 'hcl', 'tcs', 'sap', 'aecom', 'rsm', 'dbs', 'imc', 'wpp', 'sgs', 'tgs', 'g2'])

export function displayEmployer(stored: string | null | undefined, token?: string | null): string {
  const raw = (stored ?? '').trim()
  if (!raw) return ''

  const byToken = token ? BY_TOKEN[token.trim().toLowerCase()] : undefined
  if (byToken) return byToken

  const byStored = BY_STORED[raw.toLowerCase()]
  if (byStored) return byStored

  // Trailing ATS boilerplate: "Lenskartcareers" → "Lenskart".
  let name = raw.replace(BOILERPLATE, '').trim() || raw

  // A trailing disambiguator the ATS added because the first token was taken:
  // "aecom2", "soprasteria1". Never strip a digit that is part of the name
  // ("G2", "Particle41"), so only when at least four letters precede it.
  name = name.replace(/^([A-Za-z]{4,})[0-9]{1,2}$/, '$1')

  if (INITIALISMS.has(name.toLowerCase())) return name.toUpperCase()

  return name
}

/**
 * One name per city.
 *
 * ⚠️ THE SHORTLIST SHOWED "Bengaluru" AND "Bangalore" AS DIFFERENT PLACES, on
 * adjacent cards, to a candidate who had told us one city. Employers write
 * whichever they prefer and we stored it verbatim — correct for the record,
 * wrong on screen, and conspicuous on an India-first product where this
 * particular pair is the most-posted city in the index.
 *
 * The candidate's own city is NOT rewritten anywhere; only the label shown
 * against a posting. `locationFit` in src/match/score.ts already treats the two
 * as one place for scoring, so this brings the display in line with arithmetic
 * that was already correct.
 */
const CANONICAL_CITY: Record<string, string> = {
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  'bangalore urban': 'Bengaluru',
  bombay: 'Mumbai',
  mumbai: 'Mumbai',
  calcutta: 'Kolkata',
  kolkata: 'Kolkata',
  madras: 'Chennai',
  chennai: 'Chennai',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  'new delhi': 'New Delhi',
  delhi: 'Delhi',
  poona: 'Pune',
  pune: 'Pune',
  trivandrum: 'Thiruvananthapuram',
  thiruvananthapuram: 'Thiruvananthapuram',
  cochin: 'Kochi',
  kochi: 'Kochi',
  mysore: 'Mysuru',
  mysuru: 'Mysuru',
}

export function displayCity(stored: string | null | undefined): string {
  const raw = (stored ?? '').trim()
  if (!raw) return ''
  /**
   * Only the city itself is canonicalised, and only when the whole string is
   * one. "Hybrid in Bangalore" and "Bangalore, Karnataka" keep their shape —
   * rewriting inside a phrase risks changing what a posting said, and the
   * phrase is the posting's own words.
   */
  return CANONICAL_CITY[raw.toLowerCase()] ?? raw
}

/**
 * A requirement kind as the candidate should read it.
 *
 * The Insights disclosure printed `r.kind` raw — "EXPERIENCE_YEARS",
 * "TITLE_SENIORITY" — the database's enum leaking onto the product's most
 * explanatory surface (docs/QA-AUDIT.md QA-17). Keyed by string rather than
 * RequirementKind so a kind added later still renders as words, not as nothing.
 */
const REQUIREMENT_LABELS: Record<string, string> = {
  experience_years: 'Experience asked for',
  credential: 'Credential',
  location: 'Location',
  work_authorisation: 'Work authorisation',
  channel_budget: 'Budget owned',
  institute_tier: 'Institute',
  hr_track: 'HR track',
  title_seniority: 'Seniority',
}

export function requirementLabel(kind: string): string {
  const known = REQUIREMENT_LABELS[kind]
  if (known) return known
  const words = kind.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
