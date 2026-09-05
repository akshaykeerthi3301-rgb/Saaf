/**
 * Which roles belong on a Saaf shortlist, and which function they sit in.
 *
 * `docs/PRODUCT.md` names the customer precisely: Indian professionals in their
 * first five years across *corporate* functions — engineering, finance,
 * marketing, consulting, HR. Gig, field and freelance work is a different labour
 * market with different gates, and putting it on the same list is the noise a
 * candidate came here to escape.
 */

/** Roles that are not this product's market at all. */
const NOT_CORPORATE = [
  /\b(voice (artist|over|talent)|voice[- ]?over|transcrib(er|ing|ution)|audio (recording|data))\b/i,
  /\b(delivery (partner|executive|boy|rider)|rider|captain|driver|cab|fleet)\b/i,
  /\b(freelance|part[- ]?time gig|gig worker|on[- ]?demand)\b/i,
  /\b(telecall(er|ing)|tele[- ]?sales|bpo|voice process|non[- ]?voice process)\b/i,
  /\b(security guard|housekeep(er|ing)|cook|chef|helper|labour|labor|warehouse associate|picker|packer)\b/i,
  /\b(beautician|salon|barber|tailor|electrician|plumber|carpenter|welder|mechanic)\b/i,
  /\b(data (entry|collection) (operator|project|executive)?)\b/i,
]

/**
 * Field sales is deliberately NOT excluded wholesale — "Business Development
 * Executive" is a real early-career corporate role for the marketing and
 * consulting personas, even when the work is in the field.
 */
export function isCorporateRole(title: string): boolean {
  return !NOT_CORPORATE.some((re) => re.test(title))
}

/**
 * A test posting left open on a company's board — "Test Jerin" was live in the
 * index and reachable by candidates.
 *
 * Deliberately narrow. A bare /\btest\b/ filter looked obvious and would have
 * deleted five real engineering roles: "Staff Software Engineer in Test",
 * "Software Development Engineer in Test II", "QA Lead - Manual, Automation &
 * AI Testing". Withholding a real job is the worse error, so a title only
 * counts as junk when a placeholder word LEADS it and nothing in it names an
 * actual role.
 */
const JUNK_LEAD = /^(test|testing|dummy|sample|demo|asdf|xxx+|placeholder|untitled)\b/i
const ROLE_NOUN =
  /\b(engineer|engineering|developer|manager|analyst|lead|specialist|associate|executive|designer|consultant|architect|scientist|officer|director|intern|qa|sdet|writer|recruiter|accountant)\b/i

export function isJunkPosting(title: string): boolean {
  return JUNK_LEAD.test(title.trim()) && !ROLE_NOUN.test(title)
}

/** Acronyms that must survive title-casing. */
const ACRONYMS = new Set([
  'd2c', 'b2b', 'b2c', 'hr', 'qa', 'sre', 'ml', 'ai', 'ux', 'ui', 'seo', 'sem',
  'crm', 'gm', 'dgm', 'agm', 'avp', 'vp', 'svp', 'ceo', 'cfo', 'cto', 'coo',
  'api', 'sde', 'sdet', 'pr', 'ops', 'kyc', 'saas', 'edc', 'lrm', 'pod', 'it',
  'fp&a', 'p&l', 'nbfc', 'upi', 'llm', 'devops', 'ios',
])

/**
 * Tidy a raw ATS title for display.
 *
 * Search is unaffected — to_tsvector lowercases everything anyway — so this is
 * purely about a list a person can scan. Casing is only imposed on titles that
 * arrive entirely lowercase ("area collections manager bangalore -flows"); a
 * title the employer capitalised is left exactly as written.
 */
export function normaliseTitle(raw: string): string {
  let t = raw
    .replace(/\s+/g, ' ')
    .replace(/\s*([-–—])\1+\s*/g, ' $1 ')
    .trim()
    .replace(/^[-–—\s]+|[-–—\s]+$/g, '')
    .trim()

  const hasUpper = /[A-Z]/.test(t)
  if (!hasUpper) {
    t = t.replace(/[A-Za-z][A-Za-z&]*/g, (w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
  }
  return t
}

export type Fn = 'engineering' | 'finance' | 'marketing' | 'consulting' | 'hr' | 'other'

/** Ordered: the first match wins, so put the most specific patterns first. */
const FUNCTIONS: { fn: Fn; re: RegExp }[] = [
  { fn: 'engineering', re: /\b(engineer|engineering|developer|\bsde\b|backend|back[- ]end|frontend|front[- ]end|full.?stack|devops|sre|site reliability|architect|infrastructure|platform|data scien(ce|tist)|machine learning|\bml\b|\bai\b|qa\b|\bsdet\b|test automation|android|ios|mobile dev|security engineer|database|cloud)\b/i },
  { fn: 'finance',     re: /\b(finance|financial|accountant|accounting|audit|controller|controllership|fp&a|treasury|taxation|\btax\b|equity research|investment|credit (analyst|risk)|underwrit|actuar|revenue (analyst|operations)|billing)\b/i },
  { fn: 'hr',          re: /\b(recruit(er|ment|ing)|talent acquisition|talent partner|people (ops|operations|partner)|human resources|\bhr\b|hrbp|compensation|l&d|learning and development)\b/i },
  { fn: 'marketing',   re: /\b(marketing|growth|brand|\bseo\b|\bsem\b|performance marketing|content (writer|strateg|marketing)|copywrit|social media|communications|\bpr\b|demand gen|lifecycle|crm marketing)\b/i },
  { fn: 'consulting',  re: /\b(consultant|consulting|strateg(y|ic)|business analyst|business development|\bbd\b|program manager|project manager|chief of staff|operations (manager|analyst|associate)|category (manager|lead)|supply chain|product manager|product owner|analytics)\b/i },
]

export function classifyFunction(title: string, hint?: string): Fn {
  const text = `${title} ${hint ?? ''}`
  return FUNCTIONS.find((f) => f.re.test(text))?.fn ?? 'other'
}
