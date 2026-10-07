/**
 * A posting split into what employers put in one: about, responsibilities,
 * requirements, nice-to-have, benefits (F-303, F-1409, TASK-179). Pure.
 *
 * ⚠️ THE STORED TEXT HAS NO LINE BREAKS. The ingest flattens every posting's HTML
 * to one line (ingest/providers/types.ts toText), so "Key Responsibilities",
 * "WHAT YOU'LL NEED" and "Bonus Points" sit inline in running text with the bullets
 * run together. Headings are therefore found by what they SAY, not where they
 * fall: an exact phrase from the list below, written the way a heading is written
 * (ALL CAPS, Title Case, or followed by a colon) — or an ALL-CAPS run that opens
 * with a heading word ("WHAT YOU CAN EXPECT FROM US", "WHY SIMCORP") and is placed
 * by the words in it. Items inside a section are not recovered; that needs the line
 * breaks the flattening threw away (upgrade path: have toText keep block breaks).
 *
 * Deterministic, no model: a posting with no recognisable headings is returned as
 * `structured: false` and the panel shows it as before — we do not guess a split
 * from single sentences, because a wrong "Benefits" heading is worse than none.
 */
export type SectionKey = 'about' | 'responsibilities' | 'requirements' | 'preferred' | 'benefits' | 'other'

export const SECTION_LABEL: Record<SectionKey, string> = {
  about: 'About',
  responsibilities: 'What you’ll do',
  requirements: 'What you need',
  preferred: 'Nice to have',
  benefits: 'What you get',
  other: 'More',
}

export type JobSection = { key: SectionKey; /** The employer's own heading, as written. */ heading: string; text: string }
export type StructuredJob = { structured: boolean; sections: JobSection[] }

/** Exact heading phrases. Order within a key does not matter; the longest match wins. */
const PHRASES: Record<SectionKey, string[]> = {
  about: [
    'about us', 'about the company', 'about the team', 'about the role', 'about the job', 'about the position', 'about this role', 'about the opportunity',
    'who we are', 'our story', 'company overview', 'company description', 'the company', 'the team', 'the role', 'the opportunity', 'role overview',
    'job overview', 'job summary', 'job description', 'position summary', 'position overview', 'role summary', 'overview', 'summary', 'your role',
    'why this role', 'our culture', 'our mission', 'our values', 'your mission', 'the community you will join', 'company introduction',
    'overview of', 'who we are looking for',
  ],
  responsibilities: [
    'responsibilities', 'key responsibilities', 'role responsibilities', 'main responsibilities', 'primary responsibilities', 'your responsibilities',
    'what you’ll do', 'what you\'ll do', 'what you will do', 'what you’ll be doing', 'what you\'ll be doing', 'what you will be doing',
    'what you’ll be doing every day', 'what you will be responsible for', 'what you’ll work on', 'what you\'ll work on', 'a typical day', 'day to day',
    'a day in the life', 'duties', 'key duties', 'roles and responsibilities', 'role and responsibilities', 'your impact', 'what you will achieve',
    'the difference you will make', 'your day to day', 'how you’ll make an impact', 'how you\'ll make an impact',
    'essential responsibilities', 'essential functions', 'essential duties', 'essential duties and responsibilities', 'what you’ll own & drive', 'what you\'ll own & drive', 'what you’ll own', 'what you\'ll own', 'how you’ll contribute',
    'here’s how you’ll be contributing', 'here\'s how you\'ll be contributing', 'what you’ll be responsible for', 'what you\'ll be responsible for',
    'accountabilities', 'scope of the role',
  ],
  requirements: [
    'requirements', 'key requirements', 'job requirements', 'role requirements', 'minimum requirements', 'basic requirements', 'qualifications',
    'minimum qualifications', 'basic qualifications', 'required qualifications', 'required skills', 'required skills and experience', 'your qualifications',
    'what you’ll need', 'what you\'ll need', 'what you will need', 'what you need', 'what you bring', 'what you’ll bring', 'what you\'ll bring',
    'what we’re looking for', 'what we\'re looking for', 'what we are looking for', 'what we look for', 'what we look for in you', 'what we seek', 'who you are', 'you have', 'must have', 'must-have', 'must haves',
    'essential', 'essential skills', 'your profile', 'about you', 'the ideal candidate', 'ideal candidate', 'skills and experience', 'skills & experience',
    'experience and skills', 'skills', 'technical skills', 'education and experience', 'other requirements', 'key requirements/minimum qualifications',
    'a bit about you', 'qualification & experience', 'qualification and experience', 'qualifications & experience', 'required skills & qualifications',
    'required skills and qualifications', 'skills & qualifications', 'skills and qualifications', 'your expertise', 'your experience', 'your skills',
    'what you’ll have', 'what you\'ll have', 'what you should have', 'what we need from you', 'candidate profile', 'who you’ll be', 'who you\'ll be',
  ],
  preferred: [
    'preferred qualifications', 'preferred skills', 'preferred', 'nice to have', 'nice-to-have', 'nice to haves', 'bonus', 'bonus points', 'good to have',
    'desired skills', 'desirable', 'desired qualifications', 'it would be great if', 'extra credit', 'a plus', 'additional qualifications',
  ],
  benefits: [
    'benefits', 'perks', 'perks and benefits', 'benefits and perks', 'what we offer', 'what we’re offering', 'what we\'re offering', 'what you’ll get',
    'what you\'ll get', 'what’s in it for you', 'what\'s in it for you', 'whats in it for you', 'what you can expect from us', 'compensation and benefits',
    'total rewards', 'our benefits', 'we offer', 'why you’ll love working here', 'why you\'ll love working here', 'rewards', 'compensation',
    'what you get', 'life at', 'how you can thrive at', 'why join us', 'why you’ll love it here', 'why you\'ll love it here', 'what you’ll enjoy', 'what you\'ll enjoy',
  ],
  other: [
    'equal opportunity', 'equal opportunity employer', 'diversity', 'diversity and inclusion', 'inclusion', 'accommodations and accessibility', 'accessibility',
    'how to apply', 'application process', 'interview process', 'next steps', 'privacy notice', 'data privacy', 'important data privacy information',
    'disclaimer', 'working conditions', 'work location', 'job location', 'location', 'please note', 'our commitment to diversity', 'eeo statement',
    'recruitment and hiring requirements', 'equal employment opportunity', 'about equal opportunity',
  ],
}

/** "The Requirements", "Your Responsibilities", "Minimum Qualifications"… from one bare word, so each need not be listed. */
const BASES = ['responsibilities', 'requirements', 'qualifications', 'duties', 'benefits', 'perks'] as const
const PREFIXES = ['the', 'your', 'our', 'key', 'main', 'core', 'primary', 'job', 'role', 'position', 'essential', 'minimum', 'basic', 'required', 'preferred', 'additional', 'desired', 'general', 'technical', 'other']
for (const b of BASES) for (const p of PREFIXES) {
  const phrase = `${p} ${b}`
  const key = keyFor(phrase)
  if (!PHRASES[key].includes(phrase)) PHRASES[key].push(phrase)
}

const STOPWORDS = new Set(['&', 'a', 'an', 'the', 'of', 'to', 'in', 'for', 'and', 'or', 'you', 'we', 'your', 'our', 'it', 'is', 'be', 'at', 'on', 'with', 'by', 'from', 'this', 'that', 's'])

/** `what you'll do` → a regex that also takes the curly apostrophe and any run of spaces. */
function phraseRegex(phrase: string): RegExp {
  const body = phrase
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, '[\'’]'))
    .join('\\s+')
  return new RegExp(`(?<![A-Za-z0-9'’])${body}(?![A-Za-z0-9])`, 'gi')
}

type Compiled = { key: SectionKey; re: RegExp; words: number }
const COMPILED: Compiled[] = (Object.entries(PHRASES) as [SectionKey, string[]][]).flatMap(([key, list]) =>
  list.map((p) => ({ key, re: phraseRegex(p), words: p.split(/\s+/).length })),
)

const allCaps = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase()
const titleCase = (s: string) => {
  const words = s.split(/\s+/).filter(Boolean)
  return words.length > 0 && /^[A-Z]/.test(words[0]) && words.every((w) => /^[A-Z]/.test(w) || STOPWORDS.has(w.toLowerCase().replace(/['’]/g, '')))
}

/** HTML entities the flattening left in the stored text. */
export function plain(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return c === 10 || c === 13 ? ' ' : String.fromCodePoint(c) })
    .replace(/&#(\d+);/g, (_, d) => { const c = Number(d); return c === 10 || c === 13 ? ' ' : String.fromCodePoint(c) })
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&rsquo;/gi, '’').replace(/&lsquo;/gi, '‘')
    .replace(/&ldquo;|&rdquo;/gi, '"').replace(/&ndash;/gi, '–').replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ').trim()
}

/** An ALL-CAPS run that opens with a heading word is a heading even if we have no phrase for it. */
const CAPS_RUN = /(?<![A-Za-z0-9'’])((?:ABOUT|WHO|WHAT|WHY|HOW|OUR|YOUR|THE|WE|YOU|LIFE|JOIN|WORKING|NEXT|IMPORTANT|EQUAL|DIVERSITY|INCLUSION|ACCOMMODATIONS|BENEFITS|PERKS|COMPENSATION|KEY|MINIMUM|PREFERRED|REQUIRED|BASIC|ROLE|JOB)(?:\s+[A-Z][A-Z'’&/-]*){1,6})(?![A-Za-z0-9])/g

/**
 * Place a heading by the words in it. Order matters: "preferred qualifications" is
 * not "qualifications". ⚠️ A STEM TAKES \b AT THE START ONLY (\w* for the rest): `\bresponsib\b`
 * never matches "Responsibilities" — the third time this exact mistake has been
 * made in this repo (extension/autofill.js carries the warning).
 */
export function keyFor(heading: string): SectionKey {
  const h = heading.toLowerCase().replace(/’/g, "'")
  if (/\b(?:preferred|nice[- ]to|bonus|desired|desirable|good to have|a plus|extra credit)/.test(h)) return 'preferred'
  if (/\b(?:benefit\w*|perk\w*|offer\w*|expect from us|reward\w*|compensation|what you(?:'ll)? get|in it for you|love (?:working|it)|thrive at|life at|why join|enjoy)/.test(h)) return 'benefits'
  if (/\b(?:diversity|inclusion|equal (?:employ\w+ )?opportunit\w*|accommodation\w*|accessibility|privacy|next steps|how to apply|apply\b|commitment|disclaimer|working conditions|location|please note|eeo|recruitment and hiring)/.test(h)) return 'other'
  if (/\b(?:responsib\w*|dut(?:y|ies))/.test(h) && !/\b(?:require\w*|qualif\w*)/.test(h)) return 'responsibilities'
  if (/\b(?:need\w*|bring|look(?:ing)? for|qualif\w*|require\w*|skills?\b|who you are|you have|must|essential|your profile|about you|ideal|education|expertise|your experience|a bit about you|what you'll have)/.test(h)) return 'requirements'
  if (/\b(?:do\b|doing|responsib\w*|impact|dut(?:y|ies)|achieve|typical day|day to day|make\b|work on|own\b|contribut\w*|accountabilit\w*)/.test(h)) return 'responsibilities'
  return 'about'
}

type Hit = { start: number; end: number; key: SectionKey; text: string; meta: boolean }

/** A heading's own words continue ("Qualifications & Experience", "Diversity and Inclusion"): take them into it. */
const CONTINUES = /^\s*(?:&|and)\s+(?:Inclusion|Belonging|Accessibility|Qualifications|Experience|Skills|Requirements|Responsibilities|Benefits|Perks|Equity)\b/

/** One bare word is a heading only if it is one of these AND it opens a sentence: "Skills" or "Summary" alone is ordinary prose. */
const BARE_OK = new Set(['responsibilities', 'requirements', 'qualifications', 'benefits', 'perks', 'duties', 'overview'])

/** Phrases that open ordinary sentences as often as sections — a heading only in ALL CAPS or with a colon. */
const AMBIGUOUS = new Set(['your impact', 'your role', 'the team', 'the company'])

const BOUNDARY_BEFORE = /(?:^|[.!?:;•·▪●)\]–—-])\s*$/
const isMeta = (written: string) => /\blocation$/i.test(written.trim())

function findHeadings(text: string): Hit[] {
  const hits: Hit[] = []
  for (const c of COMPILED) {
    c.re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = c.re.exec(text))) {
      const written = m[0]
      const tail = text.slice(m.index + written.length)
      const colon = tail.match(/^\s*:/)
      const caps = allCaps(written)
      if (!caps && !colon) {
        // Written without caps or a colon, it must still read as a heading and not as words in a sentence:
        // Title Case beside a sentence edge, or a sentence-case line ("What you’ll be doing") that
        // starts a sentence AND is followed by one.
        const before = text.slice(0, m.index)
        const boundary = BOUNDARY_BEFORE.test(before)
        const nextCapital = /^\s*[A-Z•▪●\d(\[*#-]/.test(tail)
        const quoted = /["'‘“]\s*$/.test(before) || /^\s*["'’”]/.test(tail)
        if (quoted) continue
        const ok = titleCase(written) ? boundary || nextCapital : /^[A-Z]/.test(written) && boundary && nextCapital
        if (!ok) continue
        if (c.words === 1 && !(BARE_OK.has(written.toLowerCase()) && boundary)) continue
      }
      if (c.words === 1 && caps === false && !colon && !BARE_OK.has(written.toLowerCase())) continue
      // "Your Impact Shapes the World…" is a sentence, "YOUR IMPACT" / "Your Impact:" a heading.
      if (!caps && !colon && AMBIGUOUS.has(written.toLowerCase())) continue
      const cont = tail.match(CONTINUES)
      const end = m.index + written.length + (cont ? cont[0].length : colon ? colon[0].length : 0)
      const full = text.slice(m.index, end).replace(/:\s*$/, '').trim()
      // "The Role" + "and Responsibilities" is a responsibilities heading, not an about one.
      hits.push({ start: m.index, end, key: cont ? keyFor(full) : c.key, text: full, meta: isMeta(written) })
    }
  }
  CAPS_RUN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CAPS_RUN.exec(text))) {
    // "SAP MM", "AWS AI/ML": acronyms in running text, not headings — a heading has a word of 4+ letters.
    if (!m[1].split(/\s+/).some((w) => w.replace(/[^A-Z]/g, '').length >= 4)) continue
    hits.push({ start: m.index, end: m.index + m[1].length, key: keyFor(m[1]), text: m[1].trim(), meta: false })
  }
  // A question that is plainly a heading: "What qualities are we looking for?" — placed only when its words say where.
  const Q = /(?<![A-Za-z0-9'’])((?:What|Who)\b[^?.!]{3,70}\?)(?=\s+[A-Z•▪●\d])/g
  while ((m = Q.exec(text))) {
    const key = keyFor(m[1])
    if (key !== 'about' && /\b(?:you|we)\b/i.test(m[1]) && m[1].split(/\s+/).length <= 9) hits.push({ start: m.index, end: m.index + m[1].length, key, text: m[1].trim(), meta: false })
  }
  // Earliest first; at the same place the longest wins; anything inside a chosen heading is dropped.
  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const chosen: Hit[] = []
  for (const h of hits) {
    const last = chosen[chosen.length - 1]
    if (last && h.start < last.end) continue
    chosen.push(h)
  }
  return chosen
}

/** Fewer words than this between two headings means the first was a label for the second ("Qualifications Basic Qualifications"). */
const MIN_BODY = 12

export function structureJob(description: string): StructuredJob {
  const text = plain(description)
  const heads = findHeadings(text)
  if (heads.length < 2) return { structured: false, sections: [] }

  const sections: JobSection[] = []
  const intro = text.slice(0, heads[0].start).trim()
  if (intro.length >= 40) sections.push({ key: 'about', heading: '', text: intro })

  for (let i = 0; i < heads.length; i++) {
    const body = text.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].start : undefined).replace(/^[\s:–—-]+/, '').trim()
    // A heading with nothing under it labels the next one; the next, more specific heading keeps the body.
    if (body.length < MIN_BODY && i + 1 < heads.length) continue
    if (!body) continue
    // "Location: Pune" right after the opening is a fact about the job, not a section: it stays with the opening.
    const prev = sections[sections.length - 1]
    if (heads[i].meta && (!prev || prev.key === 'about')) {
      if (prev) prev.text = `${prev.text} ${heads[i].text}: ${body}`
      else sections.push({ key: 'about', heading: '', text: `${heads[i].text}: ${body}` })
      continue
    }
    sections.push({ key: heads[i].key, heading: heads[i].text, text: body })
  }

  // Adjacent sections of one kind read as one.
  const merged: JobSection[] = []
  for (const s of sections) {
    const prev = merged[merged.length - 1]
    if (prev && prev.key === s.key) merged[merged.length - 1] = { ...prev, heading: prev.heading || s.heading, text: `${prev.text} ${s.heading ? s.heading + ' ' : ''}${s.text}`.trim() }
    else merged.push(s)
  }
  const distinct = new Set(merged.map((s) => s.key))
  return merged.length >= 2 && distinct.size >= 2 ? { structured: true, sections: merged } : { structured: false, sections: [] }
}

/** schema.org JobPosting properties for the sections we recognised; each only when its section exists. */
export function jobPostingFields(sections: JobSection[]): { responsibilities?: string; qualifications?: string; jobBenefits?: string } {
  const join = (k: SectionKey[]) => sections.filter((s) => k.includes(s.key)).map((s) => s.text).join(' ').slice(0, 2000) || undefined
  const out: { responsibilities?: string; qualifications?: string; jobBenefits?: string } = {}
  const r = join(['responsibilities']); if (r) out.responsibilities = r
  const q = join(['requirements', 'preferred']); if (q) out.qualifications = q
  const b = join(['benefits']); if (b) out.jobBenefits = b
  return out
}
