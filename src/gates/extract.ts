import { CONFIDENCE_THRESHOLD, type Credential, type TypedRequirement } from './types'
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
 *  confidence, including a real requirement stated in a different clause.
 *
 *  Parentheses split too, and that is load-bearing rather than tidying:
 *  "5+ years of experience across high-growth startups (preferably at the
 *  intersection of fintech and AI)" qualifies the DOMAIN, not the years —
 *  but with only comma splitting, "preferably" sat in the same clause as the
 *  5 and dropped a real floor to 0.3, which is how a 5-year role cleared for
 *  a two-year candidate. */
function clauseAt(sentence: string, index: number): string {
  let pos = 0
  for (const clause of sentence.split(/[,;()]/)) {
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

/**
 * Company tenure, never a candidate requirement — "founded 5 years ago",
 * "10 years of building for India".
 *
 * Deliberately explicit constructions only. This replaced a sentence-wide test
 * for the bare pronouns we/our/company, which discarded any sentence
 * containing them — and "What **we're** looking for: 7-10 years of
 * experience" is the single most common requirements header in real postings.
 * That filter was deleting precisely the sentences carrying the requirements,
 * and is the reason a 7-10 year role cleared for a two-year candidate.
 */
const COMPANY_TENURE_RE =
  /\b(?:founded|established|in business (?:for|since)|been (?:building|around|operating)|years? (?:of )?(?:building|serving|operating|shipping))\b/i

/**
 * The function a years requirement qualifies itself with.
 *
 * "3 years of PRODUCT MANAGEMENT experience" is a different requirement from
 * "3 years of experience", and we read them identically until 2026-09-07: a
 * candidate with three years in HR met both. 290 of 518 requirements in the
 * live index qualify their years this way, so this is the common case rather
 * than the exception.
 *
 * Returns the phrase only. Deciding whether it matches the candidate is not the
 * gate's business — see domainOf() in src/lib/taxonomy/roles.ts.
 *
 * CONSERVATIVE BY DESIGN. Anything generic is rejected outright: "3+ years of
 * total experience" qualifies nothing, and reading "total" as a function would
 * invent a mismatch for every candidate alive.
 */
const GENERIC_QUALIFIER =
  /^(?:total|overall|relevant|professional|work|working|industry|corporate|hands on|full time|prior|proven|combined|post qualification)$/i

export function experienceQualifier(after: string): string | undefined {
  const patterns = [
    // "…years of hands-on data engineering experience"
    /^\s*(?:of\s+|in\s+)?(?:hands[- ]on\s+|proven\s+|demonstrable\s+)?([a-z][a-z &/+-]{2,40}?)\s+experience\b/i,
    // "…years of experience in product management"
    /^\s*(?:of\s+)?experience\s+(?:in|as|within|with)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z &/+-]{2,40})/i,
    // "…years IN product management", with no "experience" anywhere. Taken from
    // a real posting: "Exp should be in between 2 - 4 years, out of which
    // minimum 2 years in product management." The two patterns above both
    // require the word, and missed it — which is how a candidate whose two
    // years are in HR scored 80 on exactly the role this rule exists for.
    /^\s*(?:in|as|within)\s+(?:a\s+|an\s+|the\s+)?([a-z][a-z &/+-]{2,40})/i,
  ]
  for (const re of patterns) {
    const m = after.match(re)
    if (!m) continue
    const phrase = m[1].trim().replace(/\s+/g, ' ').replace(/[-\s]+$/, '')
    if (!phrase || GENERIC_QUALIFIER.test(phrase.replace(/[- ]/g, ' '))) continue
    return phrase.slice(0, 60)
  }
  return undefined
}

export function extractExperienceYears(description: string): TypedRequirement[] {
  const out: TypedRequirement[] = []
  // Plural only. Real requirements say "5+ years" / "6-8+ years"; the singular
  // hyphenated form is almost always a noun phrase — the fixture contains
  // "Meesho's most visible 2-year bets", which is not a requirement and which
  // previously produced a 2-year minimum that suppressed a correct title gate.
  // Group 2 is the top of a range, group 3 the "+" that cancels it: "6-8+
  // years" reads as eight OR MORE, so it has no ceiling despite naming two
  // numbers. Group 2 was matched and discarded until 2026-09-07, which is why
  // over-qualification could not be read.
  const re = new RegExp(
    `(\\d{1,2})\\s*(?:\\+|plus)?\\s*(?:${DASH}|to)?\\s*(\\d{1,2})?\\s*(\\+)?\\s*(?:years?|yrs?)\\b`,
    'gi'
  )
  /** "a 2-year bet", "the 3-year plan" — adjectival, never a requirement. */
  const ADJECTIVAL = new RegExp(`\\d{1,2}${DASH}year\\b`, 'i')

  for (const s of sentences(description)) {
    if (!/\b(?:years?|yrs?)\b/i.test(s)) continue

    for (const m of s.matchAll(re)) {
      const lo = Number(m[1])
      if (!Number.isFinite(lo) || lo < 0 || lo > 40) continue
      if (ADJECTIVAL.test(m[0])) continue

      // Tested against the clause the number sits in, not the whole sentence.
      // Deliberately an exclude-list and nothing more: 29 of 107 requirements
      // in the real fixture omit the word "experience" entirely ("6-8+ years
      // in a technical customer-facing role"), so demanding experience
      // vocabulary as a positive test throws out a quarter of real
      // requirements — a false refusal for every one it saves.
      const clause = clauseAt(s, m.index ?? 0)
      if (COMPANY_TENURE_RE.test(clause)) continue

      // "1-2 years" → the floor is what gates. "5+ years" → 5.
      const hi = m[2] === undefined ? undefined : Number(m[2])
      const openEnded = m[3] === '+'
      out.push({
        kind: 'experience_years',
        minYears: lo,
        // The function this requirement qualifies itself with, read from the
        // text immediately after the years. Undefined for a bare "3+ years".
        valueText: experienceQualifier(s.slice((m.index ?? 0) + m[0].length)),
        // A ceiling only when the posting actually drew one: a second number,
        // not cancelled by a trailing "+", and above the floor.
        maxYears:
          hi !== undefined && !openEnded && Number.isFinite(hi) && hi >= lo && hi <= 40
            ? hi
            : undefined,
        sourceQuote: s.slice(0, 300),
        confidence: confidenceFor(clause),
      })
    }
  }
  return out
}

/** A year count sitting near experience vocabulary, in either order. */
const YEARS_NEAR_EXPERIENCE_RE = new RegExp(
  `\\d{1,2}\\s*\\+?\\s*(?:${DASH}|to)?\\s*\\d{0,2}\\s*\\+?\\s*(?:years?|yrs?)\\b[^.]{0,40}?\\b(?:experience|exp|background)\\b` +
  `|\\b(?:experience|exp|background)\\b[^.]{0,40}?\\d{1,2}\\s*\\+?\\s*(?:years?|yrs?)\\b`,
  'i'
)

/**
 * The description talks about years of experience, but extraction produced no
 * requirement confident enough to gate on.
 *
 * This exists because the gate had only two responses to a requirement — gate
 * on it, or ignore it entirely — so every extraction failure silently became a
 * false clearance, which is the exact harm this product exists to prevent. A
 * role flagged here must never be presented as plainly cleared; it is shown
 * with the limit stated, so an unreadable posting costs the candidate a
 * caveat rather than forty wasted minutes.
 */
export function mentionsUnreadExperience(
  description: string,
  requirements: TypedRequirement[]
): boolean {
  const gated = requirements.some(
    (r) => r.kind === 'experience_years' && r.confidence >= CONFIDENCE_THRESHOLD
  )
  if (gated) return false
  return YEARS_NEAR_EXPERIENCE_RE.test(description)
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

/** Shared with src/gates/evaluate.ts's location gate, and with the work-mode
 *  preference sort on /today — one definition so the two can't drift apart. */
export function isRemoteLocation(locationRaw: string): boolean {
  return /remote|anywhere|work from home/i.test(locationRaw)
}

/** Real Indian postings say this in the location field itself, not just the
 *  description — e.g. "Hybrid in Bangalore". Used only for the work-mode
 *  preference sort; never a gate. */
export function isHybridLocation(locationRaw: string): boolean {
  return /hybrid/i.test(locationRaw)
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
