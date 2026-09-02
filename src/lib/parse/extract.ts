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
  fn?: 'engineering' | 'finance' | 'marketing' | 'consulting' | 'hr'
  city?: string
  credential?: 'CA' | 'CFA' | 'CS'
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

const FN_HINTS: { fn: NonNullable<ParsedFields['fn']>; re: RegExp }[] = [
  { fn: 'engineering', re: /\b(software|engineer|developer|sde|backend|frontend|full[- ]?stack|devops|programmer|architect)\b/i },
  { fn: 'finance',     re: /\b(finance|financial|accountant|audit|controller|fp&a|treasury|taxation)\b/i },
  { fn: 'marketing',   re: /\b(marketing|growth|performance marketing|seo|brand|demand gen)\b/i },
  { fn: 'consulting',  re: /\b(consultant|consulting|strategy|business analyst|associate consultant)\b/i },
  { fn: 'hr',          re: /\b(human resources|\bhr\b|talent acquisition|recruit|hrbp|people ops)\b/i },
]

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DASH = '[-‐‑‒–—]'

/** Years of experience, preferring an explicit statement over inferred dates. */
function readYears(text: string): { years?: number; inferred: boolean } {
  const stated = text.match(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years|yrs)\b[^.]{0,30}\bexperience\b/i)
  if (stated) return { years: Number(stated[1]), inferred: false }

  // Otherwise infer from the earliest employment year to now.
  const ranges = [...text.matchAll(
    new RegExp(`(?:${MONTH}\\s*)?((?:19|20)\\d{2})\\s*${DASH}\\s*(?:(?:${MONTH}\\s*)?((?:19|20)\\d{2})|present|current|now)`, 'gi')
  )]
  if (ranges.length === 0) return { inferred: false }

  const starts = ranges.map((m) => Number(m[1])).filter((y) => y >= 1980 && y <= new Date().getFullYear())
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

  for (const { fn, re } of FN_HINTS) {
    if (re.test(clean)) { fields.fn = fn; break }
  }
  if (!fields.fn) warnings.push('We could not tell which function you work in.')

  const cred = clean.match(/\b(chartered accountant|CFA|company secretary)\b/i)
  if (cred) {
    const c = cred[1].toLowerCase()
    fields.credential = c.startsWith('chartered a') ? 'CA' : c === 'cfa' ? 'CFA' : 'CS'
  }

  const { years, inferred } = readYears(clean)
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
