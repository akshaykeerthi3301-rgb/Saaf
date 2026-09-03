import type { Credential, TypedRequirement } from './types'
import { extractTitleSeniority } from './title'

/**
 * Requirement extraction from free-text job descriptions.
 *
 * Designed against 211 real roles pulled from six live ATS boards, not against
 * invented examples. Three things that real prose does and synthetic examples
 * do not:
 *
 *  1. "1‐2 years" uses U+2010 HYPHEN, not an ASCII hyphen. Also seen: U+2011,
 *     U+2012, U+2013, U+2014.
 *  2. "10+ years in software engineering, with 5+ years leading engineers"
 *     — a single description carrying two different minimums.
 *  3. "CA/FRM/CFA/MBA is a plus" — a credential mentioned as OPTIONAL. Gating
 *     on that would be a false refusal on the very gate meant to be the
 *     cleanest demonstration in the product.
 */

const DASH = '[-‐‑‒–—]'

/** Language that marks a sentence as stating a hard requirement. */
const REQUIRED_RE =
  /\b(must have|must possess|required|requirement|minimum of|minimum|at least|we require|you have|you'll have|qualifications)\b/i

/** Language that marks a sentence as stating a preference, not a requirement. */
const PREFERRED_RE =
  /\b(a plus|is a plus|plus point|preferred|preferably|nice to have|good to have|bonus|desirable|advantage|ideally|would be great|not required|optional)\b/i

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\s*•\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 400)
}

/** The clause of `sentence` containing character offset `index` — sentences()
 *  doesn't split on commas, so a compound sentence like "CFA is preferred,
 *  but you must have 5+ years..." stayed one unit and a preference anywhere
 *  in it dragged every extracted value in the sentence down to 0.3
 *  confidence, including a real requirement stated in a different clause. */
function clauseAt(sentence: string, index: number): string {
  let pos = 0
  for (const clause of sentence.split(/[,;]/)) {
    const end = pos + clause.length
    if (index <= end) return clause
    pos = end + 1 // +1 for the delimiter split() consumed
  }
  return sentence
}

/**
 * Confidence for a requirement found in `sentence`.
 *
 * The default for an unframed statement is ABOVE the threshold, and that is a
 * deliberate correction. A bullet reading "5+ years of professional experience
 * in backend software development" is a requirement — it simply does not
 * contain the word "required". Treating unframed statements as non-binding was
 * measured against 211 real roles and cleared 109 of 121 for a two-year
 * candidate, including Staff and Principal engineering roles. A false clearance
 * is the original harm this product exists to fix, so the default reading of a
 * stated minimum in a job description is that it binds.
 *
 * Preference language remains decisive in the other direction: "a plus",
 * "preferred", "nice to have" drop below the threshold and are never gated on.
 */
function confidenceFor(sentence: string): number {
  if (PREFERRED_RE.test(sentence)) return 0.3
  if (REQUIRED_RE.test(sentence)) return 0.95
  return 0.75 // a stated minimum in a posting binds unless framed as optional
}

export function extractExperienceYears(description: string): TypedRequirement[] {
  const out: TypedRequirement[] = []
  // Plural only. Real requirements say "5+ years" / "6-8+ years"; the singular
  // hyphenated form is almost always a noun phrase — the fixture contains
  // "Meesho's most visible 2-year bets", which is not a requirement and which
  // previously produced a 2-year minimum that suppressed a correct title gate.
  const re = new RegExp(
    `(\\d{1,2})\\s*(?:\\+|plus)?\\s*(?:${DASH}|to)?\\s*(\\d{1,2})?\\s*\\+?\\s*(?:years?|yrs?)\\b`,
    'gi'
  )
  /** "a 2-year bet", "the 3-year plan" — adjectival, never a requirement. */
  const ADJECTIVAL = new RegExp(`\\d{1,2}${DASH}year\\b`, 'i')

  for (const s of sentences(description)) {
    if (!/\b(?:years?|yrs?)\b/i.test(s)) continue
    // Skip company boilerplate: "10 years of building", "over 5 years we have"
    if (/\b(?:we|our|company|founded|since)\b/i.test(s) && !REQUIRED_RE.test(s)) continue

    for (const m of s.matchAll(re)) {
      const lo = Number(m[1])
      if (!Number.isFinite(lo) || lo < 0 || lo > 40) continue
      if (ADJECTIVAL.test(m[0])) continue
      // "1-2 years" → the floor is what gates. "5+ years" → 5.
      out.push({
        kind: 'experience_years',
        minYears: lo,
        sourceQuote: s.slice(0, 300),
        confidence: confidenceFor(clauseAt(s, m.index ?? 0)),
      })
    }
  }
  return out
}

const CREDENTIALS: { cred: Credential; re: RegExp }[] = [
  { cred: 'CA', re: /\b(chartered accountant|\bCA\b)\b/i },
  { cred: 'CFA', re: /\b(chartered financial analyst|\bCFA\b)\b/i },
  // Spelled out only — "CS" bare is far too common as Computer Science
  // shorthand in engineering postings ("Bachelor's in CS", "CS background") to
  // trust as an abbreviation. Company Secretary is near-always written out in
  // real postings, so nothing is lost by requiring the full phrase.
  { cred: 'CS', re: /\bcompany secretary\b/i },
]

export function extractCredential(description: string): TypedRequirement[] {
  const out: TypedRequirement[] = []
  for (const s of sentences(description)) {
    for (const { cred, re } of CREDENTIALS) {
      const m = re.exec(s)
      if (!m) continue
      out.push({
        kind: 'credential',
        credential: cred,
        sourceQuote: s.slice(0, 300),
        confidence: confidenceFor(clauseAt(s, m.index)),
      })
    }
  }
  return out
}

const INDIA_TOKENS = [
  'india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'gurgaon', 'gurugram',
  'noida', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad', 'jaipur',
  'karnataka', 'maharashtra', 'telangana', 'tamil nadu', 'haryana', 'remote - india',
]

/** ATS boards are global. The 2026-09-02 probe found 137 of 233 roles in India. */
export function resolveInIndia(locationRaw: string): boolean {
  const l = locationRaw.toLowerCase()
  return INDIA_TOKENS.some((t) => l.includes(t))
}

export function extractLocation(locationRaw: string): TypedRequirement {
  return {
    kind: 'location',
    valueText: locationRaw,
    sourceQuote: locationRaw,
    confidence: locationRaw.trim() ? 0.95 : 0.2,
  }
}

export function extractAll(
  description: string,
  locationRaw: string,
  title = ''
): TypedRequirement[] {
  return [
    ...extractExperienceYears(description),
    ...extractCredential(description),
    ...extractTitleSeniority(title),
    extractLocation(locationRaw),
  ]
}
