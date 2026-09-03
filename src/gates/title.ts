import type { TypedRequirement } from './types'

/**
 * Seniority implied by a role's TITLE.
 *
 * Why this is retrieval and not inference: the title is stated text in the
 * posting, and it is the one requirement a candidate can check in a single
 * glance. What we supply is the reading — that "Staff Engineer" sits above a
 * two-year band — and the reason says exactly that rather than inventing a
 * years figure the posting never stated.
 *
 * An explicit years requirement in the description always wins over this. The
 * description is more specific than the title, and if a posting says "3+ years"
 * on a Senior Engineer role, it means it.
 *
 * Indian title conventions matter here and are the reason this is a table
 * rather than a regex. "Assistant Manager" and "Associate Director" are junior
 * roles in Indian corporates; matching bare "Manager" or "Director" would
 * manufacture false refusals on exactly the roles this candidate should see.
 */

/** Qualifiers that pull a title DOWN the ladder. Checked before the base word. */
const JUNIOR_QUALIFIER = /\b(assistant|asst\.?|associate|deputy|junior|jr\.?|trainee|intern|graduate|fresher|apprentice)\b/i

type Band = { re: RegExp; years: number; label: string }

/** Ordered most senior first — the first match wins. */
const BANDS: Band[] = [
  { re: /\b(chief|c[teofm]o|vp|vice president|svp|evp)\b/i, years: 15, label: 'an executive role' },
  // "head," has no trailing \b of its own — a comma is a non-word character,
  // so \b never holds between it and the space that normally follows ("Head,
  // Growth"), and the alternation's shared trailing \b silently killed this
  // branch for every comma-style title.
  { re: /\bhead of\b|\bhead,|\bdirector\b/i,                 years: 10, label: 'a director-level role' },
  { re: /\bprincipal\b/i,                                   years: 10, label: 'a principal role' },
  { re: /\bstaff\b/i,                                       years:  8, label: 'a staff-level role' },
  { re: /\bsenior manager\b/i,                              years:  8, label: 'a senior manager role' },
  { re: /\b(lead|leader)\b/i,                               years:  6, label: 'a lead role' },
  { re: /\b(senior|sr\.?)\b/i,                              years:  5, label: 'a senior role' },
  { re: /\bmanager\b/i,                                     years:  5, label: 'a manager role' },
]

/** How far a junior qualifier pulls a band down. */
const QUALIFIER_DISCOUNT = 4
/** Below this, the title tells us nothing worth gating on. */
const MIN_GATED_BAND = 4

export function extractTitleSeniority(title: string): TypedRequirement[] {
  const junior = JUNIOR_QUALIFIER.test(title)

  for (const band of BANDS) {
    if (!band.re.test(title)) continue

    const years = junior ? band.years - QUALIFIER_DISCOUNT : band.years

    // "Assistant Manager" (5 - 4 = 1) and "Associate Director" (10 - 4 = 6):
    // the first drops out of gating entirely, the second stays but lower.
    if (years < MIN_GATED_BAND) return []

    return [{
      kind: 'title_seniority',
      minYears: years,
      valueText: band.label,
      // The source quote IS the title — the whole point of gating here.
      sourceQuote: title,
      // High, but below an explicit statement: the title is stated, the mapping
      // to a band is our reading of it.
      confidence: 0.8,
    }]
  }
  return []
}
