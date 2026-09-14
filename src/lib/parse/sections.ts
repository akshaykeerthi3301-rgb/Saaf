/**
 * Read a résumé's STRUCTURE, not just its fields.
 *
 * src/lib/parse/extract.ts answers "what is this person's title, employer,
 * city?" — six scalars, which is all onboarding needs. Rewriting a résumé needs
 * something extract.ts has never produced: the document's shape. Which lines
 * are a summary, which are one job, which bullets belong to that job and not
 * the one below it.
 *
 * ⚠️ DETERMINISTIC AND MODEL-FREE, ON PURPOSE. This runs on the public ATS
 * checker, whose whole claim is that the finding can be checked rather than
 * trusted. A model asked to "structure this résumé" will silently invent a
 * heading, merge two employers, or drop a role it found confusing — and the
 * candidate has no way to see that it did. Every rule here is a pattern with a
 * reason, and everything it cannot place is COUNTED and returned in `unplaced`
 * rather than discarded, so the surface above can say "we could not place 7
 * lines" instead of quietly showing a shorter résumé than the one uploaded.
 *
 * ⚠️ IT NEVER THROWS AND NEVER RETURNS NULL. A résumé this cannot read is not
 * an error state — it is the most valuable finding the checker produces, because
 * a real ATS is running the same kind of rules and will fail the same way.
 * Callers get empty sections and a high `unplaced`, which is a report, not a
 * dead end.
 */

export type ExperienceEntry = {
  /** The role. Null when the header line could not be split confidently. */
  title: string | null
  employer: string | null
  /** Verbatim, never normalised — "Jan 2023 – Present" stays as written. */
  dates: string | null
  location: string | null
  bullets: string[]
  /** True when this came from a Projects section rather than an employment one. */
  isProject?: boolean
}

export type EducationEntry = {
  qualification: string
  institution: string | null
  dates: string | null
}

export type ResumeSections = {
  contact: {
    name: string | null
    email: string | null
    phone: string | null
    links: string[]
  }
  summary: string | null
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: string[]
  /** Sections we recognised as headed but do not rewrite — awards, interests. */
  other: { heading: string; lines: string[] }[]
  /** Lines that landed in no section. Reported, never silently dropped. */
  unplaced: number
  /** Headings found, in document order — feeds the section-order check. */
  order: SectionKind[]
}

export type SectionKind =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'other'

/**
 * Heading vocabulary.
 *
 * ⚠️ ORDER MATTERS INSIDE EACH LIST — the first match wins, so the longer,
 * more specific phrase has to come first. "work experience" must be tested
 * before "experience" or a heading reading "Work Experience" is matched by the
 * shorter pattern and the word "Work" is left behind as content.
 */
import { dateRange } from './dates'
import { isCity } from './extract'

const HEADINGS: { kind: SectionKind; patterns: string[] }[] = [
  {
    kind: 'summary',
    patterns: [
      'professional summary', 'career summary', 'executive summary', 'career objective',
      'personal profile', 'profile summary', 'summary', 'objective', 'profile', 'about me', 'about',
      // ⚠️ "SUMMARY OF QUALIFICATIONS" is a standard US résumé heading and was
      // being read as EDUCATION, because the keyword fallback below saw
      // "qualification" first. Its whole section then landed among the degrees.
      'summary of qualifications', 'qualifications summary', 'career profile',
    ],
  },
  {
    kind: 'experience',
    patterns: [
      'professional experience', 'work experience', 'employment history', 'career history',
      'work history', 'relevant experience', 'experience', 'employment',
    ],
  },
  {
    kind: 'education',
    patterns: [
      'educational qualifications', 'academic qualifications', 'education & training',
      'education', 'academics', 'academic background', 'qualifications',
    ],
  },
  {
    kind: 'skills',
    patterns: [
      'technical skills', 'core competencies', 'key skills', 'areas of expertise',
      'skills & tools', 'tools & technologies', 'competencies', 'skills', 'technologies', 'tools',
    ],
  },
  {
    kind: 'projects',
    patterns: ['key projects', 'selected projects', 'personal projects', 'projects'],
  },
  {
    kind: 'certifications',
    patterns: ['certifications', 'certificates', 'licenses & certifications', 'licences', 'courses'],
  },
  {
    kind: 'other',
    patterns: [
      'achievements', 'accomplishments', 'awards & honours', 'awards & honors', 'awards',
      'honours', 'honors', 'publications', 'languages', 'interests', 'hobbies',
      'volunteer experience', 'volunteering', 'extra-curricular', 'activities', 'references',
    ],
  },
]

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/
/** Indian and international shapes. Deliberately loose — a false positive here
 *  costs nothing; a miss makes the contact check lie. */
const PHONE = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{4,5}[\s-]?\d{5,6}\b|\b\d{10}\b/
const LINK = /(?:https?:\/\/|www\.)[^\s,;]+|(?:linkedin\.com|github\.com)\/[^\s,;]+/gi
const BULLET_GLYPH = /^\s*[•▪‣◦·*•●▪]|^\s*[-–—]\s+/

/** Separators a header line uses between title, employer and location. */
const HEADER_SPLIT = /\s+[|·•—–]\s+|\s+[-]\s+|\s+at\s+|,\s+/i

/**
 * The separators that may IDENTIFY a line as a role header — a deliberately
 * smaller set than the ones used to split one.
 *
 * ⚠️ THE BARE COMMA IS EXCLUDED, AND LEAVING IT IN COST US THE FIRST SENTENCE
 * OF EVERY PROSE-STYLE RÉSUMÉ. "Owned the merchant payments funnel end to end,
 * covering onboarding, activation" is a sentence with two commas; the old rule
 * read it as a header, swallowed it into the entry's title, and the job's first
 * and best line simply disappeared from the document — silently, because the
 * remaining lines still parsed. Commas are everywhere in prose and nowhere
 * useful for telling a header from a sentence. They stay in HEADER_SPLIT above,
 * which only runs on a line already known to be a header.
 */
const ENTRY_SEPARATOR = /\s+[|·•—–]\s+|\s+[-]\s+|\s+at\s+/i

/**
 * Words that identify a section when the exact phrase is NOT in HEADINGS.
 *
 * ⚠️ THE VOCABULARY USED TO BE A CLOSED LIST MATCHED BY STRING EQUALITY, and
 * anything outside it was invisible. "WHERE I'VE WORKED", "SCHOOLING" and
 * "WHAT I KNOW" are all ordinary résumé headings that matched nothing, so every
 * line beneath them was counted as unplaced and the whole section vanished.
 * Measured on bench/corpus/synthetic/headings-odd.pdf: zero experience, zero
 * education and zero skills recovered from a document that has all three.
 *
 * Order matters — the first kind whose words appear wins, so the more specific
 * kinds are listed before the more general ones ("ACADEMIC PROJECTS" is a
 * projects heading, not an education one).
 */
const HEADING_KEYWORDS: { kind: SectionKind; words: RegExp }[] = [
  { kind: 'certifications', words: /\b(certif|licen|courses?)/i },
  { kind: 'projects', words: /\bprojects?\b/i },
  /**
   * ⚠️ SUMMARY IS TESTED BEFORE EXPERIENCE AND EDUCATION, AND THE ORDER IS THE
   * WHOLE FIX. "SUMMARY OF QUALIFICATIONS" carries the word "qualification", so
   * with education first it became an education heading and its prose was
   * parsed into degrees — measured on two of eleven public sample résumés,
   * which reported ten and eleven qualifications against a real two.
   * A heading that calls itself a summary is a summary.
   */
  { kind: 'summary', words: /\b(summary|objective|profile|about|bio)\b/i },
  { kind: 'experience', words: /\b(work(ed|ing)?|experience|employment|career|roles?|positions?)\b/i },
  { kind: 'education', words: /\b(education|academics?|school(ing)?|college|universit|degrees?|qualification)/i },
  { kind: 'skills', words: /\b(skills?|competenc|technolog|toolkit|tools?|stack|expertise|know|proficien)/i },
]

/**
 * Does this line LOOK like a heading, independent of what it says?
 *
 * This gate is what makes the keyword fallback safe. Without it, "Work at
 * Google" and "I have five years of experience" both carry section keywords and
 * would silently become headings — which is worse than missing one, because a
 * spurious heading re-parents every line beneath it.
 */
function looksStyledHeading(t: string): boolean {
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 5) return false
  // Dates, phone numbers and addresses are not headings.
  if (/\d/.test(t)) return false
  // "Product Manager at Zeta" is a role header; that is a different thing and
  // startsEntry owns it.
  if (ENTRY_SEPARATOR.test(t)) return false
  if (t.includes('@')) return false
  const letters = t.replace(/[^A-Za-z]/g, '')
  if (letters.length < 3) return false
  // Headings are set apart typographically. In extracted text that survives as
  // capitalisation: either shouted, or every word capitalised.
  return letters === letters.toUpperCase() || words.every((w) => !/^[a-z]/.test(w))
}

function isHeading(line: string): { kind: SectionKind; text: string } | null {
  const t = line.trim().replace(/[:：]\s*$/, '')
  // A heading is short, unpunctuated and alone on its line. Requiring that
  // before matching the vocabulary is what stops the sentence "I have five
  // years of experience" from being read as an EXPERIENCE heading.
  if (t.length === 0 || t.length > 42) return null
  if (/[.!?]$/.test(t)) return null
  if (BULLET_GLYPH.test(line)) return null
  const lower = t.toLowerCase().replace(/\s+/g, ' ')
  for (const { kind, patterns } of HEADINGS) {
    for (const p of patterns) {
      if (lower === p || lower === `${p}:`) return { kind, text: t }
    }
  }
  if (!looksStyledHeading(t)) return null
  for (const { kind, words } of HEADING_KEYWORDS) {
    if (words.test(lower)) return { kind, text: t }
  }
  return null
}

/** Strip a date range out of a line and hand back both halves. */
function splitDates(line: string): { rest: string; dates: string | null } {
  const m = line.match(dateRange())
  if (!m) {
    // A single year is a date too — common on education lines.
    const solo = line.match(/\b(19|20)\d{2}\b/)
    if (!solo) return { rest: line.trim(), dates: null }
    return { rest: line.replace(solo[0], '').replace(/\s*[|·—–-]\s*$/, '').trim(), dates: solo[0] }
  }
  return {
    rest: line.replace(m[0], '').replace(/\s*[|·—–,-]\s*$/, '').replace(/^\s*[|·—–,-]\s*/, '').trim(),
    dates: m[0].trim(),
  }
}

/**
 * Does this line start a new job?
 *
 * A date range is the strong signal. Without one, a line that is short, not a
 * bullet, and carries a separator between two capitalised phrases is the next
 * best thing — that is the "Product Analyst — Zeta" shape. Everything else is
 * treated as continuation, because inventing an entry boundary splits one job's
 * bullets across two employers, which is a worse failure than merging.
 */
function startsEntry(line: string): boolean {
  if (BULLET_GLYPH.test(line)) return false
  const t = line.trim()
  if (t.length === 0 || t.length > 120) return false
  if (dateRange().test(t)) return true
  // Ten words, not fourteen: a role header is "Senior Analyst at Razorpay",
  // and everything longer is far more likely to be a sentence.
  return ENTRY_SEPARATOR.test(t) && /[A-Z]/.test(t) && t.split(/\s+/).length <= 10
}

function parseHeader(lines: string[]): Omit<ExperienceEntry, 'bullets'> {
  const joined = lines.join(' · ')
  const { rest, dates } = splitDates(joined)
  const parts = rest
    .split(HEADER_SPLIT)
    .map((p) =>
      // ⚠️ STRIP SEPARATORS LEFT AT THE EDGES. HEADER_SPLIT only matches a
      // separator with whitespace on BOTH sides, so a part that began the line
      // — "| Bengaluru", from "Jul 2023 - Present | Bengaluru" once the date is
      // removed — keeps its pipe. That pipe then travelled into the rebuilt
      // document as "Jul 2023 - Present | | Bengaluru", which is a role line
      // built from separators, which is a finding our own checker raises
      // against the résumé we just wrote.
      p.replace(/^[\s|·•—–,-]+/, '').replace(/[\s|·•—–,-]+$/, '').trim(),
    )
    .filter(Boolean)

  /**
   * Two or more parts: the first is the role, the second the employer, a third
   * is usually a location.
   *
   * ⚠️ EXCEPT WHEN THE SECOND PART IS A CITY, which is how a title-less role
   * line produces TWO confident wrong answers instead of one. "Razorpay" on its
   * own line above "Jul 2023 - Present | Bengaluru" joins into one header, and
   * positional assignment returns title "Razorpay", employer "Bengaluru" — a
   * company read as a job and a city read as a company, with nothing anywhere
   * indicating a problem. Recognising the city collapses that back to a single
   * honest ambiguity, which the checker can then report.
   */
  const cityAt = parts.findIndex((p) => isCity(p))
  const location = cityAt > 0 ? parts.splice(cityAt, 1)[0] : undefined

  return {
    title: parts[0] ?? null,
    employer: parts[1] ?? null,
    location: location ?? parts[2] ?? null,
    dates,
  }
}

function parseExperience(lines: string[]): { entries: ExperienceEntry[]; unplaced: number } {
  const entries: ExperienceEntry[] = []
  let header: string[] = []
  let bullets: string[] = []
  let unplaced = 0

  const flush = () => {
    if (header.length === 0 && bullets.length === 0) return
    if (header.length === 0) {
      // Bullets with no header above them: real, and unattributable. Counted
      // rather than attached to the previous job, which would put one
      // employer's work under another's name.
      unplaced += bullets.length
      bullets = []
      return
    }
    entries.push({ ...parseHeader(header), bullets })
    header = []
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (BULLET_GLYPH.test(raw)) {
      bullets.push(line.replace(BULLET_GLYPH, '').trim())
      continue
    }

    if (startsEntry(line)) {
      // A second header line directly under the first (employer on its own
      // line) belongs to the same entry, not a new one.
      if (header.length > 0 && bullets.length === 0 && header.length < 3) {
        header.push(line)
        continue
      }
      flush()
      header = [line]
      continue
    }

    /**
     * Unglyphed prose under a header is still that job's content — plenty of
     * résumés run their achievements as sentences.
     *
     * ⚠️ WRAPPED LINES ARE JOINED, AND THEY WERE NOT UNTIL 2026-09-09. A PDF
     * gives us the line breaks the LAYOUT had, not the ones the sentences have,
     * so "Owned the merchant payments funnel end to end, covering onboarding,"
     * and "activation and the first transaction." arrived as two bullets — the
     * second beginning with a lowercase continuation word. Three checks read
     * bullets and all three were reading fragments: weak openers, bullet
     * length, and action-verb coverage, which reported that half a candidate's
     * lines did not open with a verb when in truth half of them were not lines.
     *
     * The join is conservative: only when the previous line does not end a
     * sentence AND this one does not start one. Anything else stays separate,
     * because merging two real bullets is worse than splitting one.
     */
    if (header.length > 0) {
      const prev = bullets[bullets.length - 1]
      const continues =
        prev !== undefined &&
        !/[.!?:;]\s*$/.test(prev) &&
        !/^[A-Z•\-\d]/.test(line)
      if (continues) bullets[bullets.length - 1] = `${prev} ${line}`.replace(/\s+/g, ' ')
      else bullets.push(line)
      continue
    }

    /**
     * No header yet, and this is the first line of the section. It is almost
     * always a role title on its own line, with the employer and dates on the
     * next one — the commonest two-line header there is. Held as a provisional
     * header rather than counted unplaced: if a dated line follows, the two
     * merge; if bullets follow, this line IS the header. Counting it as
     * unplaced instead loses the job title from every résumé written that way.
     */
    if (bullets.length === 0 && line.length <= 80) header = [line]
    else unplaced += 1
  }
  flush()

  return { entries, unplaced }
}

/**
 * The qualification itself, as opposed to the place that awarded it.
 *
 * Used only to decide whether a line OPENS an education entry or CONTINUES the
 * one above it. A narrow column wraps "B.Tech Computer Science, NIT Trichy,
 * 2019" onto two lines, and reading each as its own entry reported two degrees
 * where the résumé claims one — which then fed the age-bias check a graduation
 * year belonging to a qualification that did not exist.
 */
const DEGREE =
  /\b(b\.?\s?tech|b\.?\s?e\.?|b\.?sc|b\.?a\.?|b\.?com|bca|m\.?\s?tech|m\.?sc|m\.?a\.?|m\.?com|mca|mba|ph\.?\s?d|diploma|bachelors?|masters?|doctorate|pgdm|hsc|ssc|intermediate)\b/i

function parseEducation(lines: string[]): EducationEntry[] {
  const out: EducationEntry[] = []
  for (const raw of lines) {
    const line = raw.replace(BULLET_GLYPH, '').trim()
    if (!line) continue
    const prev = out.at(-1)
    /**
     * ⚠️ NOT EVERY LINE UNDER "EDUCATION" IS A DEGREE, and treating them as
     * such is how two qualifications became ten. Real education sections carry
     * coursework lists, minors, study-abroad notes, honours and activity
     * bullets. Measured before this rule: the founder's own résumé reported a
     * placement committee and a dance club as qualifications, and two public
     * sample résumés reported ten and eleven degrees against a real one each.
     *
     * A line OPENS an entry only if it names a qualification or carries a year.
     * Everything else is detail belonging to the degree above it — used as the
     * institution when we do not have one yet, and otherwise left attached
     * rather than promoted. The first line of the section always opens an
     * entry, because there is nothing above it to belong to.
     */
    const hasYear = /\b(19|20)\d{2}\b/.test(line)
    if (prev && !DEGREE.test(line) && !hasYear) {
      if (prev.institution === null) prev.institution = line.replace(/[\s|·—–,-]+$/, '').trim()
      continue
    }

    /**
     * The wrapped case, which a narrow column produces constantly:
     * "B.Tech Computer Science" on one line and "NIT Trichy, 2019" on the next.
     * The second names no qualification but does carry a year, so the rule above
     * lets it through — and read as its own entry it reports two degrees where
     * the résumé claims one, then feeds the age-bias check a graduation year
     * belonging to a qualification that does not exist.
     */
    if (prev && !DEGREE.test(line) && DEGREE.test(prev.qualification) && prev.institution === null) {
      const cont = splitDates(line)
      prev.institution = cont.rest || prev.institution
      prev.dates = prev.dates ?? cont.dates
      continue
    }

    const { rest, dates } = splitDates(line)
    const parts = rest
      .split(HEADER_SPLIT)
      // Same edge-stripping as parseHeader: a split on ", " leaves the comma on
      // whichever part began the line, and it travelled into the rebuilt
      // document as "PES University, · 2021".
      .map((p) => p.replace(/^[\s|·•—–,-]+/, '').replace(/[\s|·•—–,-]+$/, '').trim())
      .filter(Boolean)
    if (parts.length === 0) continue
    out.push({
      qualification: parts[0],
      institution: parts[1] ?? null,
      dates,
    })
  }
  return out
}

/**
 * Skills, split on the separators résumés actually use.
 *
 * Kept as written — no lowercasing, no dedupe against a taxonomy. This feeds
 * the keyword comparison and the rewrite, and both are more honest showing the
 * candidate their own words back.
 */
function parseSkills(lines: string[]): string[] {
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.replace(BULLET_GLYPH, '').trim()
    if (!line) continue
    // "Languages: Python, SQL" — drop the label, keep the list.
    const body = line.includes(':') ? line.slice(line.indexOf(':') + 1) : line
    for (const part of body.split(/[,;|·•]/)) {
      const s = part.trim()
      if (s.length > 1 && s.length <= 40) out.push(s)
    }
  }
  return out.slice(0, 60)
}

function parseContact(lines: string[]): ResumeSections['contact'] {
  const head = lines.slice(0, 8)
  const blob = head.join('\n')
  const email = blob.match(EMAIL)?.[0] ?? null
  const phone = blob.match(PHONE)?.[0]?.trim() ?? null
  const links = Array.from(new Set(blob.match(LINK) ?? [])).slice(0, 4)

  /**
   * The name is the first line that is not contact data.
   *
   * ⚠️ Deliberately not a name dictionary. Indian names are exactly where a
   * Western first-name list fails, and a checker that cannot find "Akshay"
   * would be telling the candidate their résumé is broken when ours is.
   */
  let name: string | null = null
  for (const raw of head) {
    const line = raw.trim()
    if (!line || line.length > 48) continue
    if (EMAIL.test(line) || PHONE.test(line) || /https?:|www\./i.test(line)) continue
    if (isHeading(line)) continue
    if (/\d/.test(line)) continue
    name = line
    break
  }

  return { name, email, phone, links }
}

export function parseSections(text: string): ResumeSections {
  const lines = text.split(/\r?\n/)

  // Walk once, recording where each heading sits. Content between two headings
  // belongs to the first of them; content before any heading is the contact
  // block, which is why it is read separately above.
  const marks: { kind: SectionKind; text: string; at: number }[] = []
  lines.forEach((line, i) => {
    const h = isHeading(line)
    if (h) marks.push({ ...h, at: i })
  })

  const sections: ResumeSections = {
    contact: parseContact(lines),
    summary: null,
    experience: [],
    education: [],
    skills: [],
    other: [],
    unplaced: 0,
    order: marks.map((m) => m.kind),
  }

  if (marks.length === 0) {
    /**
     * No headings at all. Not a parse failure — it is the finding. A résumé
     * whose headings are images, or drawn as a coloured sidebar, extracts
     * exactly like this, and a real ATS sees the same thing we do.
     */
    sections.unplaced = lines.filter((l) => l.trim()).length
    return sections
  }

  const bodyStart = marks[0].at
  // Everything above the first heading that is not contact data is unplaced —
  // usually a headline or tagline, occasionally a whole role.
  sections.unplaced += lines
    .slice(0, bodyStart)
    .filter((l) => l.trim() && !EMAIL.test(l) && !PHONE.test(l) && !/https?:|www\./i.test(l)).length
  // The name and any title line under it are expected there, not a defect.
  sections.unplaced = Math.max(0, sections.unplaced - 2)

  marks.forEach((mark, i) => {
    const from = mark.at + 1
    const to = i + 1 < marks.length ? marks[i + 1].at : lines.length
    const body = lines.slice(from, to)

    switch (mark.kind) {
      case 'summary': {
        const t = body.map((l) => l.replace(BULLET_GLYPH, '').trim()).filter(Boolean).join(' ')
        if (t) sections.summary = sections.summary ? `${sections.summary} ${t}` : t
        break
      }
      case 'experience':
      case 'projects': {
        const { entries, unplaced } = parseExperience(body)
        /**
         * ⚠️ PROJECTS STILL LIVE IN `experience`, BUT THEY ARE NOW LABELLED.
         * Merging them is right — a side project with dates and bullets is
         * work, and the bullet-level checks should read it. Treating it as
         * EMPLOYMENT is not: on the founder's own résumé three projects dated
         * "2026 – Present" sat beside one real job and the checker reported
         * "6 roles are both marked as ongoing", which is a finding about a
         * document that does not exist.
         */
        sections.experience.push(...entries.map((e) => (mark.kind === 'projects' ? { ...e, isProject: true } : e)))
        sections.unplaced += unplaced
        break
      }
      case 'education':
        sections.education.push(...parseEducation(body))
        break
      case 'skills':
        sections.skills.push(...parseSkills(body))
        break
      default:
        sections.other.push({
          heading: mark.text,
          lines: body.map((l) => l.replace(BULLET_GLYPH, '').trim()).filter(Boolean),
        })
    }
  })

  return sections
}

/**
 * Rebuild plain text from sections.
 *
 * Used to re-score a rewritten résumé through the same checker the original
 * went through — a projected score computed any other way is a different
 * measurement wearing the same label.
 *
 * ⚠️ THE OUTPUT FORMAT IS NOT A STYLE CHOICE. IT IS THE ONE OUR OWN PARSER
 * READS, AND THAT WAS PROVED THE HARD WAY.
 *
 * The first version separated the role from the employer with an em dash and
 * joined dates to location with a pipe. Measured against a real résumé on
 * 2026-09-08, the rewritten document then scored NINE POINTS WORSE than the
 * one the candidate uploaded — under a button that says "improve my score" —
 * because it raised three findings the original had not: `separator-header`
 * (a role line built from separators), `title-unreadable` and
 * `employer-unreadable`. We had generated a document that fails the check we
 * sell, which would have been visible to the first person who tried it and
 * indefensible in a screenshot.
 *
 * So: "Title at Employer", the shape extractFields() reads reliably and the
 * shape this repo's own clean fixture uses; dates on their own line; location
 * after a comma, never a pipe. A test asserts the round trip introduces no
 * finding the original did not have.
 */
/**
 * The role line, in the one form every surface must use.
 *
 * ⚠️ THREE PLACES RENDER THIS AND THEY MUST NOT DIVERGE: the text we SCORE
 * (sectionsToText, below), the .docx we DELIVER (buildFullResumeDocx) and the
 * preview the candidate READS (ResumePreview). They did diverge — the scored
 * text said "Software Engineer II at Razorpay" while the document and the
 * preview both said "Software Engineer II — Razorpay", so the projected score
 * on screen was measured against a format the candidate never received. Worse,
 * the delivered form is the one our own `title-misread` rule objects to, so
 * re-uploading our own output could have reproduced the very finding the
 * rewrite claimed to fix.
 *
 * "Title at Employer" because that is what extractFields() reads reliably. It
 * lives here, next to the parser, so a future edit to any one surface cannot
 * quietly reintroduce the split.
 */
export function roleLine(entry: Pick<ExperienceEntry, 'title' | 'employer'>): string {
  if (entry.title && entry.employer) return `${entry.title} at ${entry.employer}`
  return entry.title ?? entry.employer ?? 'Role'
}

/** Comfortably under `keyword-dump`'s threshold of fifteen. */
const SKILLS_PER_LINE = 10

export function sectionsToText(s: ResumeSections): string {
  const out: string[] = []
  if (s.contact.name) out.push(s.contact.name)
  const line = [s.contact.email, s.contact.phone, ...s.contact.links].filter(Boolean).join(' | ')
  if (line) out.push(line)
  if (s.summary) out.push('', 'PROFESSIONAL SUMMARY', s.summary)
  /**
   * ⚠️ PROJECTS GET THEIR OWN HEADING BACK, OR THE ROUND TRIP INVENTS A FINDING.
   * `isProject` is set when parsing from a Projects section and is the reason
   * `overlapping-present` no longer counts side projects as concurrent jobs.
   * Writing everything under EXPERIENCE erased it: re-parsing our own output
   * produced three ongoing "roles" beside a current job, so a candidate who
   * accepted a fix was told about an ambiguity their document did not have —
   * under a button that promises to improve the score.
   */
  const roles = s.experience.filter((e) => !e.isProject)
  const projects = s.experience.filter((e) => e.isProject)
  const writeEntries = (heading: string, entries: ExperienceEntry[]) => {
    if (entries.length === 0) return
    out.push('', heading)
    for (const e of entries) {
      out.push(roleLine(e))
      const meta = [e.dates, e.location].filter(Boolean).join(', ')
      if (meta) out.push(meta)
      for (const b of e.bullets) out.push(`• ${b}`)
      out.push('')
    }
  }
  writeEntries('EXPERIENCE', roles)
  writeEntries('PROJECTS', projects)
  /**
   * ⚠️ WRAPPED, BECAUSE OUR OWN CHECKER READS ONE LONG LINE AS A KEYWORD DUMP.
   * `keyword-dump` fires on a line with more than fifteen comma-separated
   * items. A résumé listing 29 skills across several lines does not trip it;
   * joining them into one does — so the document we hand back failed a check
   * the document we received had passed. Measured on a real résumé: 94 → 88 the
   * moment a fix was applied.
   */
  if (s.skills.length) {
    out.push('', 'SKILLS')
    for (let i = 0; i < s.skills.length; i += SKILLS_PER_LINE) {
      out.push(s.skills.slice(i, i + SKILLS_PER_LINE).join(', '))
    }
  }
  if (s.education.length) {
    out.push('', 'EDUCATION')
    for (const e of s.education) {
      out.push([e.qualification, e.institution, e.dates].filter(Boolean).join(', '))
    }
  }
  for (const o of s.other) out.push('', o.heading.toUpperCase(), ...o.lines)
  return out.join('\n')
}

/**
 * How much of this document did we actually understand?
 *
 * ⚠️ THIS NUMBER ALREADY EXISTED AND WAS THROWN AWAY. `parseSections` has always
 * counted `unplaced` lines, and the module header has always said a surface
 * above should be able to report "we could not place 7 lines". No surface ever
 * did — it was validated by two Zod schemas in transit and rendered nowhere.
 *
 * It matters because it is the honest half of an ATS score. A checklist of
 * rules can only penalise things it recognises; it cannot say "your document
 * defeated us", which is precisely what happens to a résumé built in a design
 * tool. Field recovery is weighted above line placement deliberately: a résumé
 * whose name, title, employer and dates all came out clean is readable even if
 * the interests section at the bottom went unplaced, and the reverse is not
 * true.
 *
 * Weights are provisional and belong to the benchmark, not to taste — see
 * scripts/bench-ats.ts. Change them there, with the corpus in front of you.
 */
export const FIELD_WEIGHT = 0.7
export const LINE_WEIGHT = 0.3

export type ParseCoverage = {
  linesPlaced: number
  linesTotal: number
  /** Field names we recovered, in report order. */
  fieldsFound: string[]
  /** Field names we did not. This is what the candidate needs to see. */
  fieldsMissing: string[]
  /**
   * Structural reasons a typical ATS will read this worse than we just did.
   * Named rather than folded silently into the number.
   */
  atsRisk: string[]
  /** 0-100. The share of this document a typical parser could interpret. */
  rate: number
}

/**
 * ⚠️ THE RATE DESCRIBES A TYPICAL ATS, NOT US, AND THE DIFFERENCE IS THE WHOLE
 * POINT. `layout.ts` reconstructs columns and reads them in the right order, so
 * OUR field recovery on a two-column résumé is near perfect — and reporting
 * that as the parse rate would tell a candidate their sidebar CV is safe
 * because our parser is good, which is the opposite of the truth and the
 * opposite of what this tool is for. Where we know a structure defeats ordinary
 * parsers, the rate is reduced and the reason is named in `atsRisk`.
 */
const MULTI_COLUMN_PENALTY = 0.62

export function parseCoverage(s: ResumeSections, layout?: { columns: number; alignedColumns: number }): ParseCoverage {
  const firstRole = s.experience[0]
  const fields: [string, boolean][] = [
    ['name', Boolean(s.contact.name)],
    ['email', Boolean(s.contact.email)],
    ['phone', Boolean(s.contact.phone)],
    ['job title', Boolean(firstRole?.title)],
    ['employer', Boolean(firstRole?.employer)],
    ['dates', s.experience.some((e) => Boolean(e.dates))],
    ['skills', s.skills.length > 0],
    ['education', s.education.length > 0],
  ]
  const fieldsFound = fields.filter(([, ok]) => ok).map(([n]) => n)
  const fieldsMissing = fields.filter(([, ok]) => !ok).map(([n]) => n)

  // Lines we placed into a section, against every line the document has.
  const placedLines =
    (s.summary ? 1 : 0) +
    s.experience.reduce((n, e) => n + 1 + (e.dates ? 1 : 0) + e.bullets.length, 0) +
    s.education.length +
    (s.skills.length ? 1 : 0) +
    s.other.reduce((n, o) => n + 1 + o.lines.length, 0)
  const linesTotal = placedLines + s.unplaced

  const fieldRate = fieldsFound.length / fields.length
  const lineRate = linesTotal === 0 ? 0 : placedLines / linesTotal

  const atsRisk: string[] = []
  let penalty = 1
  if ((layout?.columns ?? 1) > 1) {
    atsRisk.push('side-by-side columns, which most parsers interleave line by line')
    penalty *= MULTI_COLUMN_PENALTY
  }
  // Grid alignment (`layout.alignedColumns`) is deliberately NOT penalised yet.
  // It is measured and carried, but no threshold has been validated against a
  // real corpus, and a penalty without one is a guess wearing a number.

  return {
    linesPlaced: placedLines,
    linesTotal,
    fieldsFound,
    fieldsMissing,
    atsRisk,
    rate: Math.round((FIELD_WEIGHT * fieldRate + LINE_WEIGHT * lineRate) * penalty * 100),
  }
}
