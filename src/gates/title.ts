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

/**
 * Entry-level titles, read as a CEILING.
 *
 * The table above reads a title as a floor and nothing else — "Staff Engineer"
 * sits above a two-year band. Nothing read the other direction, so "Product
 * Management Intern" produced no requirement at all and scored 28/28 on title
 * against a "Product Manager" search: a two-year professional was shown an
 * internship at 79/100.
 *
 * DELIBERATELY NARROW. `assistant` and `associate` are NOT here, and that is
 * the same judgement the BANDS table already makes in the other direction:
 * "Assistant Manager" and "Associate Director" are ordinary mid-level roles in
 * Indian corporates, and reading them as entry-level would push down exactly
 * the roles a candidate should be seeing. Only titles that name a training or
 * pre-career engagement qualify.
 */
const ENTRY_LEVELS: { re: RegExp; years: number; label: string }[] = [
  { re: /\b(intern|internship)\b/i,                   years: 0, label: 'an internship' },
  { re: /\b(trainee|apprentice|fresher)\b/i,          years: 1, label: 'a trainee role' },
  { re: /\bgraduate (?:programme|program|scheme)\b/i, years: 1, label: 'a graduate programme' },
  { re: /\b(junior|jr\.?)\b/i,                        years: 2, label: 'a junior role' },
]

/** The entry-level ceiling a title implies, if it names one. */
export function entryLevelCeiling(title: string): { years: number; label: string } | null {
  for (const e of ENTRY_LEVELS) if (e.re.test(title)) return { years: e.years, label: e.label }
  return null
}

type Band = { re: RegExp; years: number; label: string }

/** Ordered most senior first — the first match wins. */
const BANDS: Band[] = [
  { re: /\b(chief|c[teofm]o|vp|vice president|svp|evp)\b/i, years: 15, label: 'an executive role' },
  // Indian corporate abbreviations, and the reason a "Category Management-
  // DGM/ GM" role reached a two-year candidate with no gate of any kind: the
  // description's requirement was discarded by the boilerplate filter, and the
  // title vocabulary had nothing to fall back on. Note \bvp\b above cannot
  // match AVP (no word boundary inside the token), so it is listed here.
  { re: /\b(gm|general manager)\b/i,                        years: 12, label: 'a general manager role' },
  { re: /\b(dgm|agm|avp|deputy general manager|assistant general manager|assistant vice president)\b/i,
                                                            years:  8, label: 'a senior management role' },
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

  // An entry-level title is a statement about the top of the band, and it wins
  // over the floor reading: "Junior Product Manager" matches \bmanager\b below
  // and would otherwise be read as a five-year role.
  const entry = entryLevelCeiling(title)
  if (entry) {
    return [{
      kind: 'title_seniority',
      maxYears: entry.years,
      valueText: entry.label,
      sourceQuote: title,
      confidence: 0.8,
    }]
  }

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
