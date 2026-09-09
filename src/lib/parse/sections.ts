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
const HEADINGS: { kind: SectionKind; patterns: string[] }[] = [
  {
    kind: 'summary',
    patterns: [
      'professional summary', 'career summary', 'executive summary', 'career objective',
      'personal profile', 'profile summary', 'summary', 'objective', 'profile', 'about me', 'about',
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

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DASH = '[-‐‑‒–—]'
/**
 * A month, written either way.
 *
 * ⚠️ THE NUMERIC FORM WAS MISSING UNTIL 2026-09-09, and it is common on Indian
 * résumés. "07/2023 - Present" parsed as the year alone, so the entry's dates
 * read "2023 - Present" and the numeric month was left behind in the title —
 * which then fed `title-misread`. The checker was reporting a defect the parser
 * had created. Only "/" and "." are accepted as the separator: "07-2023" cannot
 * be told apart from a range dash without guessing, and guessing here silently
 * changes somebody's employment dates.
 */
const MONTH_ANY = `(?:(?:${MONTH}\\.?|\\d{1,2}[/.])\\s*)?`
/** A date range, the single most reliable signal that a line starts a job. */
const DATE_RANGE = new RegExp(
  `(${MONTH_ANY}\\d{4})\\s*${DASH}\\s*(${MONTH_ANY}\\d{4}|present|current|now|till date|to date)`,
  'i',
)
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
  return null
}

/** Strip a date range out of a line and hand back both halves. */
function splitDates(line: string): { rest: string; dates: string | null } {
  const m = line.match(DATE_RANGE)
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
  if (DATE_RANGE.test(t)) return true
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

  // Two or more parts: the first is the role, the second the employer. A third
  // is a location often enough to be worth keeping, and harmless when it isn't
  // — it is displayed, never scored.
  return {
    title: parts[0] ?? null,
    employer: parts[1] ?? null,
    location: parts[2] ?? null,
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

function parseEducation(lines: string[]): EducationEntry[] {
  const out: EducationEntry[] = []
  for (const raw of lines) {
    const line = raw.replace(BULLET_GLYPH, '').trim()
    if (!line) continue
    const { rest, dates } = splitDates(line)
    const parts = rest.split(HEADER_SPLIT).map((p) => p.trim()).filter(Boolean)
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
        sections.experience.push(...entries)
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

export function sectionsToText(s: ResumeSections): string {
  const out: string[] = []
  if (s.contact.name) out.push(s.contact.name)
  const line = [s.contact.email, s.contact.phone, ...s.contact.links].filter(Boolean).join(' | ')
  if (line) out.push(line)
  if (s.summary) out.push('', 'PROFESSIONAL SUMMARY', s.summary)
  if (s.experience.length) {
    out.push('', 'EXPERIENCE')
    for (const e of s.experience) {
      out.push(roleLine(e))
      const meta = [e.dates, e.location].filter(Boolean).join(', ')
      if (meta) out.push(meta)
      for (const b of e.bullets) out.push(`• ${b}`)
      out.push('')
    }
  }
  if (s.skills.length) out.push('', 'SKILLS', s.skills.join(', '))
  if (s.education.length) {
    out.push('', 'EDUCATION')
    for (const e of s.education) {
      out.push([e.qualification, e.institution, e.dates].filter(Boolean).join(', '))
    }
  }
  for (const o of s.other) out.push('', o.heading.toUpperCase(), ...o.lines)
  return out.join('\n')
}
