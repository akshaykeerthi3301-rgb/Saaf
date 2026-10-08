import { plain, structureJob } from '@/lib/job-sections'

/**
 * A one-or-two sentence gist of the JOB for the feed card (TASK-218, F-105): what the role is, in the
 * posting's own words. Jobright writes this with a model; Jobinko takes it from the posting — deterministic,
 * and by construction a VERBATIM SPAN of the posting text, so the card can never say something the employer
 * did not (the same rule as the fit analysis's quotes and the product's fabrication guard).
 *
 * Where it looks, in order: the part of the posting about THE ROLE (a heading like "About the role", "Job
 * summary", "Overview"), then what you'll do, then the opening "about" text, then the start of the posting.
 * It skips legal and marketing boilerplate (equal-opportunity lines, "apply now", links), takes the first real
 * sentence, adds the next if the first is short, and stops by MAX. A first sentence longer than MAX is cut at a
 * word boundary — still an exact span; the card clamps it to two lines.
 *
 * Pure. No model. The source text is untrusted third-party text: it is returned as plain text only.
 */
export const GIST_MAX = 280
const MIN_SENTENCE = 35

/** Lines that are about the employer's legal duties or the apply button, not about the job. */
const BORING = /\b(equal[- ]opportunity|eeo\b|all qualified applicants|reasonable accommodations?|affirmative action|is an? [a-z -]{0,30}employer\b|apply (?:now|today|here|online)|click (?:here|the|on)|follow us|visit (?:our|us)|privacy (?:policy|notice)|©|copyright)|https?:|www\./i

const ROLE_HEADING = /\b(role|job|position|opportunity|overview|summary|description|you)\b/i
const COMPANY_HEADING = /\b(company|team|who we are|our (?:story|mission|culture|values|people)|mission|culture|values|about us)\b/i

type Sentence = { start: number; end: number; text: string }

function sentences(s: string): Sentence[] {
  const out: Sentence[] = []
  const re = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    const text = m[0].trim()
    if (!text) continue
    const start = m.index + m[0].indexOf(text)
    out.push({ start, end: start + text.length, text })
  }
  return out
}

/** The first good sentence of `s` (plus the next when the first is short), as an exact slice of `s`. */
/** "About the Role We are…" → "We are…", "· Visiting 5-6 clients…" → "Visiting 5-6 clients…": drop a leading label or bullet; what is left is still an exact span. */
const LEAD_LABEL = /^(?:(?:about|the|your|this)\s+(?:the\s+)?(?:role|job|position|opportunity|team|company)|job\s+(?:description|summary|overview)|role\s+(?:description|summary|overview)|position\s+(?:summary|overview)|overview|summary|description|responsibilities|key responsibilities|what you(?:'|’)ll do|our company)\s*[:\-–—]?\s+(?=[A-Z])/i
/** "Location: Bangalore Hybrid Full-time Role Summary As a Regional Manager, you…" → "As a Regional Manager, you…": a short run of header facts ending in a summary label. */
const MID_LABEL = /^[^.!?]{0,120}?\b(?:role|job|position|opportunity) (?:summary|overview|description)\s*[:\-–—]?\s+(?=[A-Z])/i
function stripLead(g: string): string {
  let out = g.replace(/^[\s·•▪●◦*\-–—>]+/, '')
  for (let i = 0; i < 2; i++) out = out.replace(LEAD_LABEL, '').replace(MID_LABEL, '')
  return out.trim()
}

function firstGist(s: string): string | null {
  const all = sentences(s)
  const good = (x: Sentence) => x.text.length >= MIN_SENTENCE && !BORING.test(x.text) && /[a-z]/.test(x.text) && /\s/.test(x.text)
  // Try the first few good sentences: one that opens mid-thought ("is for a packing operations associate…",
  // "and What You Will Do…") is a cut fragment, not a statement, so it is passed over rather than shown.
  let tried = 0
  for (let i = 0; i < all.length && tried < 4; i++) {
    const a = all[i]
    if (!good(a)) continue
    tried++
    const b = all[i + 1]
    let end = a.end
    if (a.text.length < 120 && b && good(b) && b.end - a.start <= GIST_MAX) end = b.end
    let g = stripLead(s.slice(a.start, end).trim())
    if (g.length > GIST_MAX) {
      const cut = g.slice(0, GIST_MAX)
      g = cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)).trim()
    }
    if (g.length >= MIN_SENTENCE && /^[A-Z0-9“"'(]/.test(g)) return g
  }
  return null
}

/** Words that say how senior a role is, not what it is — a posting about a "Staff Engineer" often just says "engineer". */
const SENIORITY = new Set(['senior', 'junior', 'staff', 'lead', 'principal', 'associate', 'assistant', 'intern', 'head', 'chief', 'executive', 'trainee', 'graduate', 'fresher', 'sr', 'jr'])

/** The words of a job title worth matching a sentence against: the part before any "(" "," or " - ", at most four, 3+ letters. */
function titleWords(title: string | null | undefined): string[] {
  if (!title) return []
  const head = title.split(/[(,|]| - | – /)[0]
  const words = head.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !SENIORITY.has(w) && !['the', 'and', 'for', 'with'].includes(w))
  return [...new Set(words)].slice(0, 4)
}

/** The first good sentence anywhere in `full` that names the role — "G2 is looking for a Customer Success Manager who…". */
function sentenceNamingRole(full: string, words: string[]): string | null {
  if (words.length === 0) return null
  const need = words.length <= 2 ? words.length : Math.ceil(words.length * 0.67)
  for (const x of sentences(full)) {
    if (x.text.length < MIN_SENTENCE || BORING.test(x.text) || !/\s/.test(x.text)) continue
    const low = x.text.toLowerCase()
    if (words.filter((w) => low.includes(w)).length >= need) return firstGist(full.slice(x.start))
  }
  return null
}

export function jobGist(description: string | null | undefined, title?: string | null): string | null {
  if (!description) return null
  const full = plain(description)
  if (full.length < 60) return null
  const named = sentenceNamingRole(full, titleWords(title))
  if (named && full.includes(named)) return named
  const { sections } = structureJob(description)
  const about = sections.filter((s) => s.key === 'about')
  const sources = [
    ...about.filter((s) => ROLE_HEADING.test(s.heading) && !COMPANY_HEADING.test(s.heading)),
    ...sections.filter((s) => s.key === 'responsibilities'),
    ...about,
  ].map((s) => s.text)
  sources.push(full)
  for (const text of sources) {
    const g = firstGist(text)
    // Merged sections can re-join text around a heading; only a true slice of the posting is allowed through.
    if (g && full.includes(g)) return g
  }
  return null
}
