/**
 * Résumé text → candidate fields.
 *
 * Deliberately modest. Onboarding is parse-THEN-CONFIRM: every field this
 * produces is shown to the candidate pre-filled and marked "read from your
 * résumé", and nothing is stored until they confirm it. So the parser does not
 * need to be accurate — the confirmation screen absorbs its errors.
 *
 * That design decision is why a deterministic parser beats a language model
 * here: it is free, fast, has no provider dependency, and cannot silently
 * invent an employer that was never on the page.
 */

export type ParsedFields = {
  currentTitle?: string
  employer?: string
  yearsExperience?: number
  city?: string
  credential?: 'CA' | 'CFA' | 'CS'
  /** Never parsed — the candidate types this on the confirm screen, suggested
   *  from currentTitle. Lives here anyway because this type doubles as the
   *  shape of the onboarding draft's confirmed fields, not just what the
   *  parser itself can produce. */
  preferredRole?: string
  /** Also candidate-entered, not parsed. Strict scoping is the default. */
  openToAdjacent?: boolean
  /** Read by the model, never by the regexes — see src/lib/parse/llm.ts.
   *  Confirmed on screen before anything is stored, which is what contains
   *  a hallucinated skill. */
  skills?: string[]
  domain?: string
}

export type ParseResult = {
  fields: ParsedFields
  /** Shown to the candidate so they know what to check hardest. */
  warnings: string[]
}

const CITIES = [
  'Bengaluru', 'Bangalore', 'Mumbai', 'Delhi', 'New Delhi', 'Gurgaon', 'Gurugram',
  'Noida', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi',
]

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DASH = '[-‐‑‒–—]'
const DATE_RANGE_RE = new RegExp(
  `(?:${MONTH}\\s*)?((?:19|20)\\d{2})\\s*${DASH}\\s*(?:(?:${MONTH}\\s*)?((?:19|20)\\d{2})|present|current|now)`,
  'gi'
)

// Section headers that are never employment — a date range under one of these
// (e.g. a graduation year) must not be read as a career-start date. Deliberately
// an exclude-list rather than requiring a positive "Experience" header: résumés
// commonly open straight into the current role with no header at all, and
// requiring one would misread every one of those as having zero sections.
const NON_EMPLOYMENT_SECTION_RE =
  /^(education|academics?|certifications?|courses?|publications?|awards?|honou?rs?|extracurriculars?)\b/i

/** Line ranges [start, end) that sit under a non-employment section header. */
function nonEmploymentLineRanges(lines: string[]): [number, number][] {
  const ranges: [number, number][] = []
  for (let i = 0; i < lines.length; i++) {
    if (!NON_EMPLOYMENT_SECTION_RE.test(lines[i])) continue
    // The section ends at the next line that itself looks like a section
    // header — short and Title Case, the same shape as this one.
    let end = lines.length
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].length < 40 && /^[A-Z][A-Za-z &/]+$/.test(lines[j])) { end = j; break }
    }
    ranges.push([i, end])
  }
  return ranges
}

/** Years of experience, preferring an explicit statement over inferred dates. */
function readYears(lines: string[], clean: string): { years?: number; inferred: boolean } {
  const stated = clean.match(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years|yrs)\b[^.]{0,30}\bexperience\b/i)
  if (stated) return { years: Number(stated[1]), inferred: false }

  // Otherwise infer from the earliest EMPLOYMENT year to now. Scanned line by
  // line (not the whole flattened document) so a date range under an
  // Education/Certifications header can be excluded — the flattened text has
  // already lost every section boundary by the time it would reach this scan.
  const excluded = nonEmploymentLineRanges(lines)
  const isExcluded = (i: number) => excluded.some(([s, e]) => i >= s && i < e)

  const starts: number[] = []
  lines.forEach((line, i) => {
    if (isExcluded(i)) return
    for (const m of line.matchAll(DATE_RANGE_RE)) {
      const y = Number(m[1])
      if (y >= 1980 && y <= new Date().getFullYear()) starts.push(y)
    }
  })
  if (starts.length === 0) return { inferred: false }

  const years = new Date().getFullYear() - Math.min(...starts)
  return { years: Math.max(0, Math.min(years, 45)), inferred: true }
}

export function extractFields(text: string): ParseResult {
  const warnings: string[] = []
  const clean = text.replace(/\s+/g, ' ').trim()
  // Whitespace inside a line is normalised too: PDF extraction produces
  // irregular runs of spaces, and the title/employer patterns below would
  // silently fail to match on every PDF résumé without this.
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter(Boolean)

  const fields: ParsedFields = {}

  const city = CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(clean))
  if (city) fields.city = city
  else warnings.push('We could not find a city — please add it.')

  const cred = clean.match(/\b(chartered accountant|CFA|company secretary)\b/i)
  if (cred) {
    const c = cred[1].toLowerCase()
    fields.credential = c.startsWith('chartered a') ? 'CA' : c === 'cfa' ? 'CFA' : 'CS'
  }

  const { years, inferred } = readYears(lines, clean)
  if (years !== undefined) {
    fields.yearsExperience = years
    if (inferred) {
      warnings.push('We worked out your years of experience from the dates — please check it.')
    }
  } else {
    warnings.push('We could not work out your years of experience.')
  }

  // "Title at Company", "Title, Company", "Company | Title" — checked over the
  // first 25 lines, where a résumé's current role almost always sits.
  for (const line of lines.slice(0, 25)) {
    if (line.length > 90) continue
    const at = line.match(/^([A-Z][\w/&.\- ]{3,45})\s+(?:at|@|,|\|)\s+([A-Z][\w&.\- ]{2,40})$/)
    if (at) {
      fields.currentTitle = at[1].trim()
      fields.employer = at[2].trim()
      break
    }
  }
  if (!fields.currentTitle) warnings.push('We could not find your current title.')
  if (!fields.employer) warnings.push('We could not find your current employer.')

  return { fields, warnings }
}
