import { extractFields, type ParsedFields } from '@/lib/parse/extract'

/**
 * TASK-061 — the ATS résumé checker.
 *
 * ⚠️ DETERMINISTIC, AND NO LANGUAGE MODEL ANYWHERE ON THIS PATH. Every finding
 * below is a rule with a reason and a quotable line from the candidate's own
 * document. That is not a cost decision: a model asked "is this résumé good?"
 * produces confident advice it cannot justify, which is the same failure the
 * scorer exists to argue against. A checker that cannot show the line it
 * objected to is a horoscope.
 *
 * ⚠️ THE VOICE MATTERS AS MUCH AS THE RULES. These findings describe what a
 * PARSER will do with the document — never what kind of person wrote it. The
 * consistency checks in particular read as accusations if worded carelessly:
 * two roles both marked "Present" is an ambiguity a parser resolves against the
 * candidate, not evidence of a lie, and it is written that way. `docs/PRODUCT.md`
 * is explicit that telling someone the truth about their fit must not
 * demoralise them, and a tool that implies dishonesty over a formatting
 * artefact would be the worst version of that failure.
 *
 * NO DATABASE, NO STORAGE, same as src/lib/jd-match.ts — the résumé arrives as
 * text, is read, and is dropped. A test asserts this module never acquires a
 * client.
 */

import ROLE_KEYWORDS from '@/lib/taxonomy/role-keywords.json'

export type AtsSeverity = 'high' | 'medium' | 'low'

/**
 * `parsing`     — the machine cannot read the document reliably.
 * `keywords`    — the document reads as written for a filter, not a person.
 * `consistency` — two things in the document disagree, and a parser must guess.
 */
export type AtsArea = 'parsing' | 'keywords' | 'consistency'

export type AtsFinding = {
  id: string
  area: AtsArea
  severity: AtsSeverity
  /** What is wrong, in one line. */
  title: string
  /** Why a parser cares. Always mechanical, never a judgement of the writer. */
  detail: string
  /** What to change. Concrete enough to act on without further advice. */
  fix: string
  /** The candidate's own text this came from, so the finding is checkable. */
  evidence?: string
}

export type AtsReport = {
  findings: AtsFinding[]
  /** Out of 100, with every deduction itemised. Never a number on its own. */
  readability: {
    score: number
    deductions: { id: string; title: string; points: number }[]
  }
  /**
   * What our own deterministic parser got out of the document.
   *
   * This is the checker's most honest signal and the reason it reuses
   * src/lib/parse/extract.ts rather than reimplementing field-finding: an ATS
   * and this parser are looking for the same things in the same places, so a
   * field OUR parser misses is a field a real one plausibly misses too. It is
   * a demonstration rather than a claim — the candidate sees exactly what a
   * machine took away from their document.
   */
  read: Pick<ParsedFields, 'currentTitle' | 'employer' | 'city' | 'yearsExperience' | 'credential'>
  stats: { characters: number; words: number; lines: number }
  /**
   * The role the check was run against, when one was chosen, and what the
   * comparison found. Absent when no role was selected — the formatting checks
   * are role-agnostic and run either way.
   */
  role?: {
    name: string
    /** How many postings for this role the terms were measured across. */
    postings: number
    present: string[]
    missing: string[]
  }
}

/**
 * Terms real postings use for a role, measured rather than asserted.
 *
 * Built by scripts/build-role-keywords.ts against the live index and committed
 * as JSON, because this module must not touch a database — see the header. Each
 * entry records how many postings it was measured over, so a finding can say
 * "named in most of the 199 Product Manager postings we index" instead of
 * "experts recommend", which is the kind of unverifiable advice this product
 * exists to argue against.
 */
type RoleKeywords = Record<string, { terms: string[]; postings: number }>
const KEYWORDS = ROLE_KEYWORDS as RoleKeywords

/** Role names the checker can compare against. Used by the form's picker. */
export function rolesWithKeywords(): string[] {
  return Object.keys(KEYWORDS).sort()
}

/** Shortest input that can be assessed at all. */
export const MIN_RESUME_CHARS = 120
export const MAX_RESUME_CHARS = 20_000

export class AtsCheckError extends Error {}

const SEVERITY_COST: Record<AtsSeverity, number> = { high: 18, medium: 9, low: 4 }

/** Headers an ATS keys its sectioning off. Matched loosely — real résumés
 *  write "WORK EXPERIENCE", "Professional Experience", "EXPERIENCE". */
const SECTION_PATTERNS: [label: string, re: RegExp][] = [
  ['experience', /^\s*(work|professional|employment|relevant)?\s*experience\b/im],
  ['education', /^\s*(education|academics?|qualifications?)\b/im],
  ['skills', /^\s*(technical\s+)?(skills|competencies|technologies)\b/im],
]

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/
const PHONE_RE = /(?:\+?\d[\d\s-]{8,}\d)/
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DASH = '[-‐‑‒–—]'
const DATE_RANGE_RE = new RegExp(
  `(?:${MONTH}\\s*)?((?:19|20)\\d{2})\\s*${DASH}\\s*(?:(?:${MONTH}\\s*)?((?:19|20)\\d{2})|present|current|now)`,
  'gi'
)
/** "8+ years", "over 6 years of experience". */
const CLAIMED_YEARS_RE = /\b(?:over\s+|more\s+than\s+|about\s+)?(\d{1,2})\s*\+?\s*years?\b(?=[^.]{0,40}experience)/i

/**
 * Words that carry no signal and would otherwise dominate a repetition count.
 * Deliberately short: the check that uses it already requires a term to be both
 * frequent AND a meaningful share of the document, so the list only has to
 * remove the words that clear both bars in ordinary prose.
 */
const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'that', 'this', 'was', 'were', 'has', 'have', 'had',
  'are', 'our', 'their', 'his', 'her', 'its', 'into', 'over', 'across', 'using', 'used',
  'work', 'worked', 'working', 'team', 'teams', 'role', 'roles', 'company', 'led', 'built',
  'present', 'current', 'india', 'year', 'years', 'month', 'months',
])

/**
 * A multi-column or table layout, inferred from runs of whitespace.
 *
 * ⚠️ THIS IS THE HIGHEST-VALUE CHECK IN THE FILE AND THE MOST INVISIBLE
 * PROBLEM IT FINDS. Text extracted from a two-column PDF interleaves the
 * columns line by line, so "Senior Analyst" and an unrelated date from the
 * sidebar arrive as one line separated by a run of spaces. The document looks
 * immaculate to a human and shreds in a parser. A candidate has no way to see
 * this without extracting the text themselves, which is exactly why it belongs
 * in a tool rather than in advice.
 */
function looksMultiColumn(lines: string[]): { hit: boolean; sample?: string } {
  const suspect = lines.filter((l) => /\S {3,}\S/.test(l) || /\t/.test(l))
  const substantial = lines.filter((l) => l.trim().length > 20)
  if (substantial.length < 6) return { hit: false }
  return suspect.length / substantial.length > 0.18
    ? { hit: true, sample: suspect[0]?.slice(0, 120) }
    : { hit: false }
}

/** Overlapping open-ended roles: more than one entry marked Present/Current. */
function openEndedRoles(text: string): number {
  return [...text.matchAll(new RegExp(`${DASH}\\s*(present|current|now)\\b`, 'gi'))].length
}

function earliestYear(text: string): number | undefined {
  const years = [...text.matchAll(DATE_RANGE_RE)].map((m) => Number(m[1])).filter(Boolean)
  return years.length ? Math.min(...years) : undefined
}

/**
 * Assess a résumé for machine readability.
 *
 * Throws only for input too short to assess. Everything else is a finding —
 * a checker that refuses to run teaches nothing.
 */
export function checkResume(resumeText: string, targetRole?: string): AtsReport {
  const text = resumeText.trim()
  if (text.length < MIN_RESUME_CHARS) {
    throw new AtsCheckError('Paste your full résumé — this looks too short to check.')
  }
  if (text.length > MAX_RESUME_CHARS) {
    throw new AtsCheckError('That résumé is longer than we can read. Paste the most recent few roles.')
  }

  const lines = text.split(/\n/)
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  const words = text.split(/\s+/).filter(Boolean)
  const findings: AtsFinding[] = []
  const add = (f: AtsFinding) => findings.push(f)

  // Our own parser is the stand-in for theirs — see AtsReport['read'].
  const parsed = extractFields(text)
  const f = parsed.fields

  // ---- parsing ------------------------------------------------------------

  const missingSections = SECTION_PATTERNS.filter(([, re]) => !re.test(text)).map(([label]) => label)
  if (missingSections.length) {
    add({
      id: 'missing-sections',
      area: 'parsing',
      severity: missingSections.length >= 2 ? 'high' : 'medium',
      // "a or b or c" reads as broken English in the rendered card; the Oxford
      // form is what a person would write. Seen in the live output, not guessed.
      title: `No ${
        missingSections.length > 1
          ? `${missingSections.slice(0, -1).join(', ')} or ${missingSections.at(-1)}`
          : missingSections[0]
      } heading a parser can find`,
      detail:
        'Applicant tracking systems split a résumé into sections before reading anything, and they do it by looking for ordinary headings. Content under a heading they cannot find is often dropped rather than misfiled.',
      fix: `Add a plain heading on its own line — ${missingSections
        .map((s) => `"${s[0].toUpperCase()}${s.slice(1)}"`)
        .join(', ')}. Plain text, no icon, no graphic.`,
    })
  }

  const column = looksMultiColumn(lines)
  if (column.hit) {
    add({
      id: 'multi-column',
      area: 'parsing',
      severity: 'high',
      title: 'Looks like a two-column or table layout',
      detail:
        'Text extracted from side-by-side columns interleaves them line by line, so a job title can arrive joined to an unrelated date from the other column. The document looks correct to a person and arrives scrambled to the parser.',
      fix: 'Rebuild it as a single column, top to bottom. Sidebars, text boxes and tables are the usual cause.',
      evidence: column.sample,
    })
  }

  /**
   * Line structure, measured as characters per line rather than as a line
   * count.
   *
   * An absolute threshold ("fewer than 4 lines and over 800 characters") gets
   * the shape right and the scale wrong: it misses a collapsed two-page résumé
   * that still has six lines, and it misses a short one entirely. The ratio is
   * scale-free — an ordinary résumé runs 30-60 characters per line, and a
   * document whose text extraction has lost its line breaks runs into the
   * hundreds. Measured on this project's own fixtures: 34 intact, 502 collapsed.
   */
  const charsPerLine = nonEmpty.length ? text.length / nonEmpty.length : text.length
  if (text.length >= 400 && charsPerLine > 250) {
    add({
      id: 'single-blob',
      area: 'parsing',
      severity: 'high',
      title: 'The document extracts as one unbroken block',
      detail:
        `Averaging ${Math.round(charsPerLine)} characters per line, where an ordinary résumé runs 30 to 60. With the line breaks gone, a parser cannot tell where one role ends and the next begins, so dates, titles and employers run together into a single field.`,
      fix: 'Check that each role, date and bullet is a real line in the document rather than a text box, a table cell or a manual run of spaces.',
    })
  }

  if (!EMAIL_RE.test(text)) {
    add({
      id: 'no-email',
      area: 'parsing',
      severity: 'high',
      title: 'No email address a parser can find',
      detail:
        'An email in a header, a footer or an image is invisible to most parsers. It is the field an application is keyed on, and a missing one can fail the application outright.',
      fix: 'Put your email as plain text in the body of the first few lines, not in the page header or a graphic.',
    })
  }
  if (!PHONE_RE.test(text)) {
    add({
      id: 'no-phone',
      area: 'parsing',
      severity: 'medium',
      title: 'No phone number a parser can find',
      detail: 'Same cause as a missing email: headers, footers and images are not read.',
      fix: 'Add your number as plain text near your email.',
    })
  }

  const dateMatches = [...text.matchAll(DATE_RANGE_RE)]
  if (dateMatches.length === 0) {
    add({
      id: 'no-dates',
      area: 'parsing',
      severity: 'high',
      title: 'No date ranges a parser can read',
      detail:
        'Tenure is computed from date ranges. Without one in a recognisable form, your years of experience read as zero — and experience is the single heaviest factor in most screens, including ours.',
      fix: 'Write each role\'s dates as "Mar 2021 - Present" or "2019 - 2021". Avoid "3 yrs" alone, which states a duration but no position in time.',
    })
  }

  /**
   * A role line built out of separators — "PRODUCT | PAYTM | LEADERSHIP".
   *
   * ⚠️ THIS CHECK EXISTS BECAUSE THE ONE BELOW IT WAS NOT ENOUGH, AND THE WAY
   * IT FAILED IS THE POINT. Asking "did our parser find a title?" assumes a
   * parser that cannot read a line returns nothing. It does not. Run against
   * this exact pattern, src/lib/parse/extract.ts returned currentTitle
   * "PRODUCT" and employer "ZETA" — it read the pipes as structure, took the
   * first fragment as a title and a fragment of a DIFFERENT role as the
   * employer. A confident wrong answer, with no signal that anything went
   * wrong.
   *
   * That is the worse defect, and it is invisible to the candidate: their
   * screen shows a title, so nothing looks broken. A real ATS splits on these
   * separators with its own rules and reaches its own wrong answer.
   */
  const separatorHeader = nonEmpty
    .slice(0, 15)
    .find((l) => (l.match(/[|•·/]/g) ?? []).length >= 2 && !/\bat\b/i.test(l) && l.trim().length < 80)
  if (separatorHeader) {
    add({
      id: 'separator-header',
      area: 'parsing',
      severity: 'medium',
      title: 'A role line built from separators',
      detail:
        'Parsers split these lines on the separator and assign the pieces by position, so which fragment becomes your title and which becomes your employer is a guess. Read as written, this line gave our own parser a title of "' +
        (f.currentTitle ?? '—') +
        '" — it produced an answer rather than an error, which is why this is easy to miss.',
      fix: 'Write the role as a sentence a person would read: "Product Manager at Paytm", on its own line above the dates.',
      evidence: separatorHeader.slice(0, 120),
    })
  }

  if (!f.currentTitle) {
    add({
      id: 'title-unreadable',
      area: 'parsing',
      severity: 'medium',
      title: 'Your current job title did not come through',
      detail:
        'Our parser looks where an ATS looks — a "Title at Company" line near the top. It found no title, which means a real parser plausibly finds none either.',
      fix: 'Put your current role on its own line as "Product Manager at Paytm", above its date range.',
    })
  }
  if (!f.employer) {
    add({
      id: 'employer-unreadable',
      area: 'parsing',
      severity: 'low',
      title: 'Your current employer did not come through',
      detail: 'Same line as the title, and usually fixed by the same change.',
      fix: 'Name the employer on the same line as the role.',
    })
  }

  // ---- keywords -----------------------------------------------------------

  const dumpLine = nonEmpty.find((l) => {
    const parts = l.split(',').map((p) => p.trim()).filter(Boolean)
    return parts.length > 15 && parts.every((p) => p.split(/\s+/).length <= 4)
  })
  if (dumpLine) {
    add({
      id: 'keyword-dump',
      area: 'keywords',
      severity: 'medium',
      title: 'A very long comma-separated keyword list',
      detail:
        'Modern screens weight a skill by where it appears, not how many are listed. A long undifferentiated list dilutes the ones you can actually evidence, and reads to a human reviewer as written for the filter.',
      fix: 'Keep the skills you could be interviewed on, and move the rest into the bullet where you used them.',
      evidence: dumpLine.slice(0, 120),
    })
  }

  const counts = new Map<string, number>()
  for (const w of words) {
    const k = w.toLowerCase().replace(/[^a-z0-9+#.]/g, '')
    if (k.length < 3 || STOPWORDS.has(k)) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const stuffed = [...counts.entries()]
    .filter(([, n]) => n >= 8 && n / words.length > 0.015)
    .sort((a, b) => b[1] - a[1])[0]
  if (stuffed) {
    add({
      id: 'repeated-term',
      area: 'keywords',
      severity: 'low',
      title: `"${stuffed[0]}" appears ${stuffed[1]} times`,
      detail:
        'Repetition past the point of describing the work is a pattern reviewers recognise, and it no longer moves keyword-frequency scoring the way it once did.',
      fix: 'Keep the two or three placements where it describes something you actually did.',
    })
  }

  // ---- consistency --------------------------------------------------------
  //
  // Written as ambiguity, never as accusation. See the module comment.

  const openEnded = openEndedRoles(text)
  if (openEnded > 1) {
    add({
      id: 'overlapping-present',
      area: 'consistency',
      severity: 'medium',
      title: `${openEnded} roles are both marked as ongoing`,
      detail:
        'A parser computing total experience from overlapping open-ended ranges either double-counts the overlap or discards one of the roles. Either way the number it reaches is not the one you meant.',
      fix: 'Give every role but your current one a real end date. If two genuinely overlap — a part-time or advisory role alongside a full-time one — say which is which on the line.',
    })
  }

  const claimed = CLAIMED_YEARS_RE.exec(text)
  const earliest = earliestYear(text)
  if (claimed && earliest) {
    const claimedYears = Number(claimed[1])
    const spanYears = new Date().getFullYear() - earliest
    if (claimedYears - spanYears >= 3) {
      add({
        id: 'years-disagree',
        area: 'consistency',
        severity: 'medium',
        title: `The summary says ${claimedYears} years; the dates add up to about ${spanYears}`,
        detail:
          'A parser trusts the dates and ignores the sentence, so the higher figure does not reach the screen — but a human reviewer sees both. The usual cause is a role whose dates were left off, not an overstatement.',
        fix: 'Check for a role missing its dates. If the earlier work is genuinely there, add its range so the arithmetic agrees.',
        evidence: claimed[0],
      })
    }
  }

  const nextYear = new Date().getFullYear() + 1
  const future = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])).find((y) => y > nextYear)
  if (future) {
    add({
      id: 'future-date',
      area: 'consistency',
      severity: 'low',
      title: `A date in ${future} is in the future`,
      detail: 'Usually a typo. A parser reading it as a start date can compute a negative tenure for that role.',
      fix: `Check the year on that entry.`,
    })
  }

  // ---- the role comparison, when one was chosen ---------------------------
  //
  // ⚠️ THIS IS THE ONE CHECK THAT IS ABOUT CONTENT RATHER THAN FORMATTING, so
  // it is held to a stricter standard. It reports only terms measured in real
  // postings for the role the candidate picked, it names how many postings, and
  // it is scored LOW severity however many are missing — a résumé is not
  // "broken" for wording things differently, and an ATS keyword match is a
  // ranking signal rather than a parse failure. Overstating it would turn a
  // deterministic checker into the advice column it was built to replace.
  const roleEntry = targetRole ? KEYWORDS[targetRole] : undefined
  let role: AtsReport['role']
  if (roleEntry) {
    const hay = text.toLowerCase()
    const present = roleEntry.terms.filter((t) => hay.includes(t))
    const missing = roleEntry.terms.filter((t) => !hay.includes(t))
    role = { name: targetRole!, postings: roleEntry.postings, present, missing }

    // Only worth saying when most of the vocabulary is absent. A résumé
    // carrying half of it is written in the language of the role already.
    if (missing.length > roleEntry.terms.length / 2) {
      add({
        id: 'role-vocabulary',
        area: 'keywords',
        severity: 'low',
        title: `Your résumé names ${present.length} of ${roleEntry.terms.length} terms common to ${targetRole} postings`,
        detail:
          `Across the ${roleEntry.postings} ${targetRole} postings we index, these terms appear in at least a third of them: ` +
          `${roleEntry.terms.join(', ')}. Yours does not mention ${missing.join(', ')}. ` +
          `An ATS ranks partly on overlap with the posting, so absent vocabulary can cost you position even when the experience is there.`,
        fix:
          `Only add a term if the work behind it is genuinely yours — writing in a word you cannot speak to is worse than missing it. ` +
          `The authoritative list is the posting itself, not this one: paste a specific job description into Should I apply? to see what THAT employer asks for.`,
      })
    }
  }

  // ---- score --------------------------------------------------------------
  //
  // Every deduction is itemised and adds up to the number shown. A score whose
  // arithmetic the reader cannot reproduce is the thing this product exists to
  // replace, and that applies to our own tools first.
  const deductions = findings.map((x) => ({
    id: x.id,
    title: x.title,
    points: SEVERITY_COST[x.severity],
  }))
  const score = Math.max(0, 100 - deductions.reduce((s, d) => s + d.points, 0))

  return {
    findings,
    readability: { score, deductions },
    read: {
      currentTitle: f.currentTitle,
      employer: f.employer,
      city: f.city,
      yearsExperience: f.yearsExperience,
      credential: f.credential,
    },
    stats: { characters: text.length, words: words.length, lines: nonEmpty.length },
    role,
  }
}
