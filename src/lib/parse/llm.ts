import type { ParsedFields } from './extract'

/**
 * Read a résumé with a language model.
 *
 * The deterministic parser reaches five fields from fixed patterns: city from
 * a 15-item whitelist, title from a "Title at Company" line in the first 25,
 * years from date ranges, credential from three phrases. Skills, domain and
 * scope are not reachable that way across arbitrary résumé layouts, and the
 * score needs them.
 *
 * Three properties make this safe to add to a product whose whole argument is
 * that a model must not judge eligibility:
 *
 *  1. It READS; it never decides. Output is candidate facts, not a verdict.
 *     Scoring and gating stay deterministic code.
 *  2. Every field lands on the confirm screen. Parse-then-confirm is what
 *     contains a hallucinated skill — it dies before it is ever stored.
 *  3. It is strictly additive. Without an API key, on a timeout, on malformed
 *     JSON, on any error at all, this returns null and the regex parser's
 *     result stands. The upload path took four deploys to stabilise and must
 *     never regress to a dead end.
 *
 * PRIVACY: this sends résumé text to Google. That is a real change to what the
 * product does with a candidate's file, and the upload screen and privacy page
 * say so. Contact details are stripped before the call — the model does not
 * need an email address or phone number to read a skills list.
 */

const MODEL = 'gemini-2.0-flash'
const TIMEOUT_MS = 12_000
/** Enough for any résumé; caps a pathological file's token cost. */
const MAX_CHARS = 24_000

export type LlmFields = Pick<ParsedFields, 'currentTitle' | 'employer' | 'yearsExperience' | 'city'> & {
  skills: string[]
  domain?: string
}

/** Remove direct contact details before the text leaves our server. */
export function stripContactDetails(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/(?:\+?\d[\d\s-]{8,}\d)/g, '[phone]')
    .replace(/\b(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi, '[profile]')
}

const SCHEMA = {
  type: 'object',
  properties: {
    currentTitle: { type: 'string' },
    employer: { type: 'string' },
    yearsExperience: { type: 'number' },
    city: { type: 'string' },
    domain: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
  },
  required: ['skills'],
}

const PROMPT = `Extract facts from this résumé. Report only what the text supports — never infer, never fill gaps with what is typical for the role.

- currentTitle: their present job title, exactly as written.
- employer: their present employer.
- yearsExperience: total years of professional work, excluding internships and education. A number.
- city: the Indian city they are based in.
- domain: the industry they have worked in — e.g. fintech, SaaS, consumer, healthcare, logistics, consulting. One or two words.
- skills: concrete tools, systems, methods and competencies actually named in the résumé. 5 to 20 of them, each 1-3 words, as written. No soft-skill filler like "team player" or "hard working".

Omit any field the résumé does not support. Return JSON only.

RÉSUMÉ:
`

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

/**
 * Returns null whenever anything is not perfect — no key, bad response,
 * timeout, malformed JSON. The caller keeps its deterministic result.
 */
export async function readResumeWithModel(text: string): Promise<LlmFields | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key || !text.trim()) return null

  const body = {
    contents: [{ parts: [{ text: PROMPT + stripContactDetails(text).slice(0, MAX_CHARS) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    )
    if (!res.ok) return null

    const json = (await res.json()) as GeminiResponse
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return null

    return normalise(JSON.parse(raw))
  } catch {
    // Deliberately silent: the regex parser's result stands, and the candidate
    // confirms every field regardless. A model outage is not a failed upload.
    return null
  }
}

/** Trust nothing about the shape or the values that comes back. */
export function normalise(parsed: unknown): LlmFields | null {
  if (!parsed || typeof parsed !== 'object') return null
  const p = parsed as Record<string, unknown>

  const text = (v: unknown, max: number): string | undefined => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s && s.length <= max ? s : undefined
  }

  const years = typeof p.yearsExperience === 'number' ? p.yearsExperience : undefined

  const skills = Array.isArray(p.skills)
    ? [...new Set(
        p.skills
          .filter((s): s is string => typeof s === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 1 && s.length <= 40)
      )].slice(0, 20)
    : []

  return {
    currentTitle: text(p.currentTitle, 80),
    employer: text(p.employer, 80),
    // A model reporting 60 years of experience has misread something.
    yearsExperience: years !== undefined && years >= 0 && years <= 50 ? years : undefined,
    city: text(p.city, 40),
    domain: text(p.domain, 40),
    skills,
  }
}
