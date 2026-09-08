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
 * PRIVACY: this sends résumé text to a third-party model provider. That is a
 * real change to what the product does with a candidate's file, and the upload
 * screen and privacy page name whichever provider is actually configured.
 * Contact details are stripped before the call — a model does not need an email
 * address or phone number to read a skills list.
 *
 * TWO PROVIDERS, ONE CONTRACT. Groq is preferred when its key is present and
 * Gemini is the fallback, because Groq is the faster of the two on this shape of
 * request and its free tier carries no non-commercial restriction. Which one
 * ran is returned alongside the fields so the caller can say so honestly rather
 * than guessing. Adding a provider must never change the guarantee: no key, a
 * timeout, malformed JSON or any error at all still returns null, and the
 * deterministic parser's result stands.
 */

const GROQ_MODEL = 'openai/gpt-oss-20b'
const GEMINI_MODEL = 'gemini-2.0-flash'
const TIMEOUT_MS = 12_000
/** Enough for any résumé; caps a pathological file's token cost. */
const MAX_CHARS = 24_000

export type LlmFields = Pick<ParsedFields, 'currentTitle' | 'employer' | 'city'> & {
  /** Never read from the résumé — the candidate types it on the upload screen.
   *  Kept in the shape so callers do not have to special-case it. */
  yearsExperience?: number
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
    city: { type: 'string' },
    domain: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
  },
  required: ['skills'],
}

const PROMPT = `Extract facts from this résumé. Report only what the text supports — never infer, never fill gaps with what is typical for the role.

- currentTitle: their present job title, exactly as written.
- employer: their present employer.
- city: the Indian city they are based in.
- domain: the industry they have worked in — e.g. fintech, SaaS, consumer, healthcare, logistics, consulting. One or two words.
- skills: concrete tools, systems, methods and competencies actually named in the résumé. 5 to 20 of them, each 1-3 words, as written. No soft-skill filler like "team player" or "hard working".

Omit any field the résumé does not support. Return JSON only.

RÉSUMÉ:
`

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}
type OpenAiResponse = {
  choices?: { message?: { content?: string } }[]
}

export type Provider = 'groq' | 'gemini'

/**
 * The provider that will be TRIED FIRST, or null when none is configured.
 *
 * ⚠️ ON A FAILOVER THIS IS NO LONGER THE ONE THAT ANSWERED. Callers use it to
 * name the recipient of a résumé on screen, which stays accurate in the normal
 * case and would be wrong in the rare one. If that attribution ever has to be
 * exact, readResumeWithModel must return which provider replied — see the
 * chain in providerChain().
 */
export function activeProvider(): Provider | null {
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  return null
}

export const PROVIDER_LABEL: Record<Provider, string> = {
  groq: 'Groq',
  gemini: "Google's Gemini API",
}

/**
 * Every provider that has a key, in preference order.
 *
 * ⚠️ THIS IS A FALLBACK CHAIN, AND IT WAS NOT ONE UNTIL 2026-09-08. The old
 * behaviour picked ONE provider by key presence and returned null the moment it
 * failed — so with both keys configured, a Groq outage silently degraded every
 * résumé read to regex-only while a working Gemini key sat unused. Nothing
 * errored; onboarding just quietly stopped reading skills, and the only symptom
 * was a shortlist scored out of 80 instead of 100.
 *
 * Order is deliberate: Groq first because it is measurably faster on this
 * workload (~1.4s against Gemini's ~3s on a résumé), Gemini second because it
 * is a different vendor on different infrastructure — a fallback to the same
 * provider's second model would share the outage it exists to survive.
 */
function providerChain(): Provider[] {
  const chain: Provider[] = []
  if (process.env.GROQ_API_KEY) chain.push('groq')
  if (process.env.GEMINI_API_KEY) chain.push('gemini')
  return chain
}

/**
 * Returns null whenever no provider could answer — no key, bad response,
 * timeout, malformed JSON, everywhere. The caller keeps its deterministic
 * result.
 *
 * Failing over costs at most one extra round trip on a surface that already
 * budgets 12 seconds per attempt, and only when the first provider is actually
 * down. The alternative is what this replaced: silently worse output, with no
 * error anywhere and a paid key idle.
 */
export async function readResumeWithModel(text: string): Promise<LlmFields | null> {
  const chain = providerChain()
  if (!chain.length || !text.trim()) return null

  const prompt = PROMPT + stripContactDetails(text).slice(0, MAX_CHARS)

  for (const provider of chain) {
    try {
      const raw = provider === 'groq' ? await callGroq(prompt) : await callGemini(prompt)
      if (!raw) continue
      const fields = normalise(JSON.parse(raw))
      if (fields) return fields
    } catch {
      // Deliberately silent per provider: the regex parser's result stands, and
      // the candidate confirms every field regardless. A model outage is not a
      // failed upload. Try the next one before giving up on the whole chain.
    }
  }
  return null
}

/**
 * The same chain, for a caller that brings its own prompt and JSON shape.
 *
 * ⚠️ IT EXISTS SO A SECOND FEATURE DOES NOT GET A SECOND OPINION ABOUT WHICH
 * PROVIDER IS UP. Provider order, both vendors' request shapes and the failover
 * are the parts that must not diverge — src/lib/tailor.ts predates this and
 * carries its own copy of the fetch, which is how a fallback chain landed in
 * one file and not the other. New callers use this one.
 *
 * Returns which provider actually answered, unlike activeProvider(), so a
 * surface can attribute the work correctly after a failover instead of naming
 * the provider that was tried first.
 */
export async function callJsonModel(opts: {
  prompt: string
  /** Groq gets this as a system message; Gemini has no equivalent slot. */
  system: string
  /** Gemini's responseSchema. Also serialised into Groq's system message. */
  schema: object
  temperature?: number
  timeoutMs?: number
}): Promise<{ raw: string; provider: Provider } | null> {
  const chain = providerChain()
  const temperature = opts.temperature ?? 0.2
  const timeout = opts.timeoutMs ?? TIMEOUT_MS

  for (const provider of chain) {
    try {
      const raw =
        provider === 'groq'
          ? await callGroqJson(opts.prompt, opts.system, opts.schema, temperature, timeout)
          : await callGeminiJson(opts.prompt, opts.schema, temperature, timeout)
      if (raw) return { raw, provider }
    } catch {
      // Silent per provider, like readResumeWithModel: try the next vendor
      // before the caller is told nothing could answer.
    }
  }
  return null
}

async function callGroqJson(
  prompt: string,
  system: string,
  schema: object,
  temperature: number,
  timeoutMs: number,
): Promise<string | undefined> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${system} Reply with JSON only, matching: ${JSON.stringify(schema)}` },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) return undefined
  return ((await res.json()) as OpenAiResponse).choices?.[0]?.message?.content
}

async function callGeminiJson(
  prompt: string,
  schema: object,
  temperature: number,
  timeoutMs: number,
): Promise<string | undefined> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    },
  )
  if (!res.ok) return undefined
  return ((await res.json()) as GeminiResponse).candidates?.[0]?.content?.parts?.[0]?.text
}

/** Groq speaks the OpenAI chat API. json_object mode plus the schema described
 *  in the prompt is what keeps the reply parseable. */
async function callGroq(prompt: string): Promise<string | undefined> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You extract facts from résumés and reply with JSON only, matching this shape: ' +
            JSON.stringify(SCHEMA),
        },
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) return undefined
  const json = (await res.json()) as OpenAiResponse
  return json.choices?.[0]?.message?.content
}

async function callGemini(prompt: string): Promise<string | undefined> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  )
  if (!res.ok) return undefined
  const json = (await res.json()) as GeminiResponse
  return json.candidates?.[0]?.content?.parts?.[0]?.text
}

/** Trust nothing about the shape or the values that comes back. */
/**
 * A job title, with the rest of the résumé line taken off it.
 *
 * ⚠️ THE PROMPT ASKS FOR "their present job title, exactly as written" AND THE
 * MODEL DOES NOT ALWAYS COMPLY. Measured against this repo's own PDF fixture on
 * 2026-09-08, Groq returned `"Systems Engineer at Infosys Jun 2024 - Present"`
 * — the whole CV line, employer and date range included. normalise() only
 * length-capped the field at 80 characters, so 45 characters of that sailed
 * through.
 *
 * ⚠️ IT IS NOT A COSMETIC PROBLEM. That string is pre-filled on the confirm
 * screen AND suggests `preferred_role`, which src/lib/score-candidate.ts turns
 * into a websearch tsquery that ANDs every word against a posting's title.
 * "Systems Engineer at Infosys Jun 2024 Present" matches no posting in the
 * index, so a brand-new candidate reached /today with an EMPTY SHORTLIST — the
 * magic moment, failing silently, with no error anywhere. Found by
 * scripts/verify-onboarding.ts on its first run.
 *
 * The deterministic parser is not a fallback here: its "Title at Company"
 * patterns are line-based and PDF extraction flattens the line structure, so on
 * a real PDF it returns undefined and the model's value is the only one.
 *
 * Deliberately conservative — it removes a trailing date range and an
 * "at <employer>" tail and nothing else. A title that is already clean passes
 * through untouched.
 */
export function cleanTitle(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let t = raw.trim()

  // Trailing date range: "Jun 2024 - Present", "2019 - 2021", "2021 – Present".
  t = t.replace(
    /[\s,|·-]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(?:19|20)\d{2}\s*[-‐‑‒–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*)?(?:(?:19|20)\d{2}|present|current|now)\s*$/i,
    ''
  )
  t = t.replace(/[\s,|·-]*(?:19|20)\d{2}\s*[-‐‑‒–—]\s*(?:(?:19|20)\d{2}|present|current|now)\s*$/i, '')

  // "<Title> at <Employer>" — the model returning the whole line. The title is
  // the half before "at"; a real job title does not contain it. A leading "at"
  // means there is no title half at all, and the whole thing is an employer.
  t = t.replace(/^at\s+/i, '')
  const atIndex = t.search(/\s+at\s+/i)
  if (atIndex > 0) t = t.slice(0, atIndex)
  else if (t.trim().toLowerCase() === raw.trim().toLowerCase().replace(/^at\s+/i, '') && /^at\s+/i.test(raw.trim())) {
    return undefined
  }

  t = t.replace(/[\s,;|·–—-]+$/, '').trim()
  return t.length > 1 ? t : undefined
}

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
    currentTitle: cleanTitle(text(p.currentTitle, 120)),
    employer: text(p.employer, 80),
    // A model reporting 60 years of experience has misread something.
    yearsExperience: years !== undefined && years >= 0 && years <= 50 ? years : undefined,
    city: text(p.city, 40),
    domain: text(p.domain, 40),
    skills,
  }
}
