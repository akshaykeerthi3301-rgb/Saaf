import { levelOfYears } from '@/lib/feed-query'
import { titleSeniority, type TitleSeniority } from '@/lib/job-facts'

/**
 * The four-section fit analysis (TASK-160): Experience, Seniority, Education,
 * Core skills — each aligned, not aligned, or unknown, each with the words it
 * rests on.
 *
 * ⚠️ AN "ALIGNED" SECTION MUST SHOW BOTH SIDES. Every aligned item carries a
 * quote from the posting AND the candidate's own fact it was checked against
 * (their confirmed profile: years, current title, credential, skills — the
 * résumé file itself is deleted after parsing, so the profile is what we hold).
 * A tick with nothing behind it is a claim; a tick with both quotes is a check
 * the candidate can redo. Tested: no aligned item may have an empty side.
 *
 * ⚠️ "UNKNOWN" IS A VALID ANSWER AND IS USED WHENEVER WE CANNOT CHECK. The posting
 * states no years → unknown, not aligned. The title states no level → unknown. A
 * degree is asked for and the profile records no education → unknown, and it says
 * so. Never a guess dressed as a tick.
 *
 * Pure. No model, no database.
 */

export type FitStatus = 'aligned' | 'not_aligned' | 'unknown'
export type FitEvidence = { you: string | null; posting: string | null }
export type FitSection = {
  key: 'experience' | 'seniority' | 'education' | 'skills'
  title: string
  status: FitStatus
  summary: string
  evidence: FitEvidence[]
}

export type FitSectionInput = {
  title: string
  description: string
  yearsExperience: number | null
  currentTitle: string | null
  credential: string | null
  skills: string[]
  matchedSkills: string[]
  missingSkills: string[]
  requirements: { kind: string; minYears: number | null; credential?: string | null; sourceQuote: string; confidence?: number }[]
}

const CONFIDENT = 0.7
const RANK: Record<TitleSeniority, number> = { Intern: 0, Entry: 1, Mid: 2, Senior: 3, Lead: 4, Executive: 5 }
const MAX_QUOTE = 180

const plain = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The sentence of the posting that contains a term, trimmed to a readable length
 * around the term. null when the term is not in the text. Text only: the
 * description is untrusted third-party text and is never rendered as HTML.
 */
export function quoteAround(text: string, term: string): string | null {
  return quoteWithKey(text, term)?.quote ?? null
}

/** The quote, plus the identity of the sentence it came from (so two quotes from one sentence can be told apart from two sentences). */
function quoteWithKey(text: string, term: string): { quote: string; key: string } | null {
  const t = plain(text)
  const needle = term.trim()
  if (!t || !needle) return null
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(needle)}(?![a-z0-9])`, 'i')
  const sentences = t.split(/(?<=[.!?])\s+|\s+[•·▪●]\s+/)
  const hit = sentences.find((s) => re.test(s))
  if (!hit) return null
  return { quote: trimAround(hit.trim(), hit.toLowerCase().indexOf(needle.toLowerCase())), key: hit.trim().slice(0, 80).toLowerCase() }
}

/** A sentence cut to a readable length with the word at `at` kept inside it; the cut is marked with "…". */
function trimAround(s: string, at: number): string {
  if (s.length <= MAX_QUOTE) return s
  const from = Math.max(0, Math.min(at - 70, s.length - MAX_QUOTE))
  return `${from > 0 ? '…' : ''}${s.slice(from, from + MAX_QUOTE).trim()}${from + MAX_QUOTE < s.length ? '…' : ''}`
}

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`

function experience(i: FitSectionInput): FitSection {
  const asked = i.requirements
    .filter((r) => r.kind === 'experience_years' && r.minYears !== null && (r.confidence ?? 1) >= CONFIDENT)
    .sort((a, b) => (b.minYears ?? 0) - (a.minYears ?? 0))[0]
  const title = 'Experience'
  if (!asked) {
    return { key: 'experience', title, status: 'unknown', summary: 'The posting does not state a number of years.', evidence: [] }
  }
  const need = asked.minYears as number
  if (i.yearsExperience === null) {
    return {
      key: 'experience', title, status: 'unknown',
      summary: `The posting asks for ${years(need)}; your profile has no years recorded, so we cannot check.`,
      evidence: [{ you: null, posting: plain(asked.sourceQuote) }],
    }
  }
  const have = i.yearsExperience
  return {
    key: 'experience', title, status: have >= need ? 'aligned' : 'not_aligned',
    summary: `Asks for ${years(need)}; your profile shows ${years(have)}.`,
    // plain(): the stored quote can carry an HTML entity ("required&nbsp;") — OBSERVED on /today 2026-10-07.
    evidence: [{ you: `${years(have)} of experience${i.currentTitle ? ` · ${i.currentTitle}` : ''}`, posting: plain(asked.sourceQuote) }],
  }
}

function seniority(i: FitSectionInput): FitSection {
  const title = 'Seniority'
  const role = titleSeniority(i.title)
  if (!role) {
    return { key: 'seniority', title, status: 'unknown', summary: 'The job title states no level.', evidence: [] }
  }
  // The candidate's own title wins when it states a level; otherwise their years do.
  const own = i.currentTitle ? titleSeniority(i.currentTitle) : null
  const band: TitleSeniority | null =
    own ?? (i.yearsExperience === null ? null : ({ entry: 'Entry', mid: 'Mid', senior: 'Senior' } as const)[levelOfYears(i.yearsExperience)])
  if (!band) {
    return {
      key: 'seniority', title, status: 'unknown',
      summary: `The title says ${role}; your profile has neither a level in your title nor years, so we cannot check.`,
      evidence: [{ you: null, posting: i.title }],
    }
  }
  const diff = RANK[band] - RANK[role]
  const you = `${own ? `Your title: ${i.currentTitle}` : `${years(i.yearsExperience as number)} of experience`} → ${band}`
  if (diff >= 0 && diff <= 1) {
    return { key: 'seniority', title, status: 'aligned', summary: `The title says ${role}; you read as ${band}.`, evidence: [{ you, posting: i.title }] }
  }
  return {
    key: 'seniority', title, status: 'not_aligned',
    summary: diff < 0 ? `The title says ${role}; you read as ${band}, a step or more below.` : `The title says ${role}; you read as ${band}, well above it.`,
    evidence: [{ you, posting: i.title }],
  }
}

/**
 * A degree named as a requirement. NOT the bare word "degree": "a high degree of
 * autonomy" is not an education requirement, and the first version quoted exactly
 * that (OBSERVED on /today 2026-10-07).
 */
const DEGREE_RE = new RegExp(
  [
    // "bachelor" is a degree wherever it appears. "master" is not: "Scrum Master", "master the platform".
    String.raw`\bbachelors?\b`, String.raw`\bbachelor['’]s\b`, String.raw`\bmaster['’]?s\s+(?:degree|in|of)\b`, String.raw`\bmaster\s+of\b`,
    // "B.E." only WITH its dots: undotted it is the word "be" ("to be the voice of the customer"), which the first version quoted.
    String.raw`\bb\.\s?e\.`, String.raw`\bb\.?\s?tech\b`, String.raw`\bb\.?\s?sc\b`, String.raw`\bb\.?\s?com\b`,
    String.raw`\bbca\b`, String.raw`\bmca\b`, String.raw`\bm\.?\s?tech\b`, String.raw`\bmba\b`, String.raw`\bpgdm\b`, String.raw`\bph\.?d\b`,
    String.raw`\bpost[- ]?graduate\b`, String.raw`\bgraduate degree\b`, String.raw`\bdiploma\b`,
    String.raw`\b(?:a|any|an?\s+relevant|university|college|undergraduate|four[- ]year)\s+degree\b`,
    String.raw`\bdegree\s+(?:in|from|or equivalent|level)\b`,
  ].join('|'),
  'i',
)

function education(i: FitSectionInput): FitSection {
  const title = 'Education'
  const cred = i.requirements.find(
    (r) => r.kind === 'credential' && r.credential && r.credential !== 'none' && (r.confidence ?? 1) >= CONFIDENT,
  )
  if (cred) {
    const held = (i.credential ?? 'none') === cred.credential
    return held
      ? { key: 'education', title, status: 'aligned', summary: `The posting asks for ${cred.credential}; your profile holds it.`, evidence: [{ you: `${i.credential} (on your profile)`, posting: plain(cred.sourceQuote) }] }
      : { key: 'education', title, status: 'not_aligned', summary: `The posting asks for ${cred.credential}; your profile does not list it.`, evidence: [{ you: i.credential && i.credential !== 'none' ? `${i.credential} (on your profile)` : null, posting: plain(cred.sourceQuote) }] }
  }
  const sentence = plain(i.description).split(/(?<=[.!?])\s+|\s+[•·▪●]\s+/).find((s) => DEGREE_RE.test(s))
  if (sentence) {
    // Cut around the degree word, so the quote shows what it was chosen for.
    const quote = trimAround(sentence, sentence.search(DEGREE_RE))
    return {
      key: 'education', title, status: 'unknown',
      summary: 'The posting mentions a degree. Your profile does not record your education, so we cannot check it.',
      evidence: [{ you: null, posting: quote }],
    }
  }
  return { key: 'education', title, status: 'unknown', summary: 'The posting states no education requirement.', evidence: [] }
}

const SKILLS_ALIGNED = 0.6
const MAX_EVIDENCE = 4

function skills(i: FitSectionInput): FitSection {
  const title = 'Core skills'
  const text = `${i.title}. ${i.description}`
  const total = i.matchedSkills.length + i.missingSkills.length
  if (total === 0) {
    return { key: 'skills', title, status: 'unknown', summary: 'The posting names no skills we can read.', evidence: [] }
  }
  const share = i.matchedSkills.length / total
  const aligned = share >= SKILLS_ALIGNED

  // Evidence for a tick needs a quote from the posting; a skill we cannot quote is left out of the list, not shown bare.
  const quoted = i.matchedSkills.flatMap((s) => {
    const q = quoteWithKey(text, s)
    return q ? [{ key: q.key, evidence: { you: `${s} (on your profile)`, posting: q.quote } }] : []
  })

  const missingLine = i.missingSkills.length ? ` Not on your profile: ${i.missingSkills.slice(0, 3).join(', ')}.` : ''
  const summary = `You hold ${i.matchedSkills.length} of the ${total} skills this posting names.${missingLine}`

  if (aligned && quoted.length > 0) return { key: 'skills', title, status: 'aligned', summary, evidence: onePerSentence(quoted).slice(0, MAX_EVIDENCE) }
  if (aligned) return { key: 'skills', title, status: 'unknown', summary: `${summary} None could be quoted from the text, so this is not ticked.`, evidence: [] }
  const gaps = i.missingSkills.slice(0, 3).flatMap((s) => {
    const q = quoteWithKey(text, s)
    return q ? [{ key: q.key, evidence: { you: null, posting: q.quote } }] : []
  })
  return { key: 'skills', title, status: 'not_aligned', summary, evidence: onePerSentence([...quoted, ...gaps]).slice(0, MAX_EVIDENCE) }
}

/**
 * Two skills named in one sentence give one quote, not the same sentence twice.
 * The first item for a sentence wins. Keyed on the SENTENCE, not on the trimmed
 * text: a long run-on sentence trims differently around each skill, and the live
 * posting showed the same passage three times under three different cut points.
 */
function onePerSentence(items: { key: string; evidence: FitEvidence }[]): FitEvidence[] {
  const seen = new Set<string>()
  return items.filter((x) => (seen.has(x.key) ? false : (seen.add(x.key), true))).map((x) => x.evidence)
}

export function fitSections(input: FitSectionInput): FitSection[] {
  return [experience(input), seniority(input), education(input), skills(input)]
}
