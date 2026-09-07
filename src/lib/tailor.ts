import { activeProvider, type Provider } from './parse/llm'

/**
 * Draft an application, and then refuse to show the parts that cannot be
 * grounded in what the candidate actually told us.
 *
 * ⚠️ THE "ZERO FABRICATED CLAIMS" BADGE IS A FILTER, NOT A LABEL. The design
 * puts a trust badge under these bullets reading "Verified: zero fabricated
 * claims, all points grounded in your master profile." A product may not print
 * that sentence and then show whatever a model returned — that is the badge
 * doing the opposite of its job, on the one screen where a candidate is about
 * to put their name to the text.
 *
 * So generation is only the first half. Every bullet is checked against the
 * stored profile afterwards, and a bullet that fails is DROPPED rather than
 * softened. The badge appears because the filter ran.
 *
 * WHAT GETS A BULLET DROPPED, and why each rule exists:
 *
 *   a metric          "grew AUM 40%", "managed 200Cr", "led a team of 12". The
 *                     model cannot know any of these. They are the likeliest
 *                     fabrication and the most damaging in an interview,
 *                     because they are specific enough to be checked.
 *   a foreign
 *   employer          Any company name that is not the candidate's own. A
 *                     bullet claiming work at a firm they never joined is the
 *                     worst thing this feature could produce.
 *   inflated tenure   Any "N years" larger than the years on the profile.
 *   an unheld
 *   credential        CA, CFA, MBA, PMP and friends, unless the profile
 *                     records it.
 *
 * The model is instructed against all four as well. The instruction is not the
 * safeguard; the filter is. An instruction is a request and a filter is a
 * guarantee, and only one of them belongs on a badge.
 */

const TIMEOUT_MS = 15_000
const GROQ_MODEL = 'openai/gpt-oss-20b'
const GEMINI_MODEL = 'gemini-2.0-flash'

export type CandidateFacts = {
  currentTitle: string | null
  employer: string | null
  yearsExperience: number | null
  skills: string[]
  domain: string | null
  credential: string | null
}

export type RoleFacts = {
  title: string
  company: string
  description: string | null
}

export type Draft = {
  bullets: string[]
  coverNote: string
  /** Skills that appear in BOTH the profile and the posting. Highlighted. */
  matched: string[]
  provider: Provider
  /** What the grounding filter removed. Surfaced, never hidden. */
  dropped: { text: string; reason: string }[]
}

/** A number attached to a unit of achievement — the fabrication shape. */
const METRIC =
  /(\d[\d,.]*\s*(%|percent|cr\b|crore|lakh|lakhs|k\b|mn\b|million|billion|bn\b))|([₹$€£]\s*\d)|(\bteam of \d)|(\b\d+\s*(people|members|reports|engineers|analysts)\b)/i

const CREDENTIALS = /\b(CA|CFA|CS|CPA|MBA|PMP|FRM|CIMA|ACCA|PhD)\b/

const YEARS = /\b(\d{1,2})(?:\+|\s*-\s*\d{1,2})?\s*(?:\+\s*)?years?\b/gi

/** Words too common to treat as a company name when scanning for one. */
const NOT_A_COMPANY = new Set([
  'india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'client', 'clients', 'team',
  'group', 'business', 'product', 'market', 'markets', 'sales', 'growth', 'strategy',
  'operations', 'finance', 'marketing', 'management', 'engineering', 'the', 'and',
])

/**
 * Is this bullet supported by what the candidate told us?
 *
 * Returns the reason it is not, or null when it holds up.
 */
export function groundingFailure(
  bullet: string,
  me: CandidateFacts,
  /**
   * The posting being applied to.
   *
   * ⚠️ WITHOUT THIS THE FILTER REJECTS EVERY COVER NOTE. Naming the role and
   * the company you are applying to is the entire point of a cover note —
   * "I am writing about the ERP Cloud Managed Services Consultant position at
   * Version 1" is not a claim about the candidate at all, it is a fact about
   * the posting, and the candidate is looking at that posting. Observed live:
   * a perfectly good note was dropped for naming "ERP", which appears in the
   * job title on the same screen.
   *
   * The rule it does not weaken: a company that is neither the candidate's
   * employer NOR the one being applied to is still a fabrication and still
   * fails.
   */
  role?: RoleFacts,
): string | null {
  if (METRIC.test(bullet)) {
    return 'states a figure your profile does not contain'
  }

  for (const m of bullet.matchAll(YEARS)) {
    const claimed = Number(m[1])
    if (me.yearsExperience !== null && claimed > me.yearsExperience) {
      return `claims ${claimed} years against the ${me.yearsExperience} on your profile`
    }
  }

  const cred = CREDENTIALS.exec(bullet)
  if (cred && (me.credential ?? 'none').toUpperCase() !== cred[1].toUpperCase()) {
    return `claims ${cred[1]}, which your profile does not record`
  }

  // A capitalised word mid-sentence that is not the candidate's own employer
  // and not a word we know to be generic. Deliberately blunt: a false positive
  // costs one bullet, a false negative puts a stranger's employer on their CV.
  const mine = (me.employer ?? '').toLowerCase()
  const myFirstWord = mine.split(/\s+/)[0] ?? ''
  const posting = `${role?.title ?? ''} ${role?.company ?? ''}`.toLowerCase()
  for (const word of bullet.split(/\s+/).slice(1)) {
    const w = word.replace(/[^A-Za-z&]/g, '')
    if (w.length < 3 || !/^[A-Z]/.test(w)) continue
    const lower = w.toLowerCase()
    if (NOT_A_COMPANY.has(lower)) continue
    if (posting.includes(lower)) continue
    if (mine.includes(lower)) continue
    if (myFirstWord.length > 2 && lower.includes(myFirstWord)) continue
    if (me.skills.some((s) => s.toLowerCase().includes(lower))) continue
    if ((me.currentTitle ?? '').toLowerCase().includes(lower)) continue
    if ((me.domain ?? '').toLowerCase().includes(lower)) continue
    return `names "${w}", which is not on your profile`
  }

  return null
}

/** Skills the candidate holds that the posting also names. The highlight. */
export function matchedSkills(me: CandidateFacts, role: RoleFacts): string[] {
  const hay = `${role.title} ${role.description ?? ''}`.toLowerCase()
  return me.skills.filter((s) => s.trim().length > 2 && hay.includes(s.toLowerCase()))
}

const SCHEMA = {
  type: 'object',
  properties: {
    bullets: { type: 'array', items: { type: 'string' } },
    coverNote: { type: 'string' },
  },
  required: ['bullets', 'coverNote'],
}

function prompt(me: CandidateFacts, role: RoleFacts, matched: string[]): string {
  return [
    'Write three resume bullet points and a three-sentence cover note for this application.',
    '',
    'THE CANDIDATE, and this is everything that is known about them:',
    `  current title: ${me.currentTitle ?? 'unknown'}`,
    `  employer: ${me.employer ?? 'unknown'}`,
    `  years of experience: ${me.yearsExperience ?? 'unknown'}`,
    `  skills: ${me.skills.join(', ') || 'none recorded'}`,
    `  domain: ${me.domain ?? 'unknown'}`,
    '',
    `THE ROLE: ${role.title} at ${role.company}`,
    role.description ? `POSTING:\n${role.description.slice(0, 4000)}` : '',
    '',
    matched.length ? `Skills the candidate holds that this posting names: ${matched.join(', ')}` : '',
    '',
    'RULES. Output that breaks any of these is discarded by a filter before the',
    'candidate ever sees it, so breaking one only wastes the request:',
    '  - Invent NO metrics. No percentages, no revenue, no team sizes, no AUM.',
    '    You do not know any number about this person.',
    '  - Name NO company other than their own employer.',
    '  - Claim no more years than stated above, and no qualification not listed.',
    '  - Describe capability drawn from their title, skills and domain. Nothing else.',
    '  - Plain professional English. No adjective doing work a fact should do.',
    '',
    'Reply with JSON only: ' + JSON.stringify(SCHEMA),
  ].filter(Boolean).join('\n')
}

type OpenAiResponse = { choices?: { message?: { content?: string } }[] }
type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] }

async function call(p: string, provider: Provider): Promise<string | undefined> {
  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You draft grounded application material and reply with JSON only.' },
          { role: 'user', content: p },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return undefined
    return ((await res.json()) as OpenAiResponse).choices?.[0]?.message?.content
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: p }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  )
  if (!res.ok) return undefined
  return ((await res.json()) as GeminiResponse).candidates?.[0]?.content?.parts?.[0]?.text
}

/**
 * Null on any failure at all — no key, timeout, malformed JSON. The drawer says
 * so and still lets the candidate apply, because the application is theirs to
 * send with or without our help.
 */
export async function draftApplication(me: CandidateFacts, role: RoleFacts): Promise<Draft | null> {
  const provider = activeProvider()
  if (!provider) return null

  const matched = matchedSkills(me, role)

  try {
    const raw = await call(prompt(me, role, matched), provider)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { bullets?: unknown; coverNote?: unknown }

    const candidates = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((b): b is string => typeof b === 'string' && b.trim().length > 10)
      : []

    const bullets: string[] = []
    const dropped: { text: string; reason: string }[] = []
    for (const b of candidates.slice(0, 6)) {
      const fail = groundingFailure(b, me, role)
      if (fail) dropped.push({ text: b.trim(), reason: fail })
      else bullets.push(b.trim())
    }

    const note = typeof parsed.coverNote === 'string' ? parsed.coverNote.trim() : ''
    // The note goes through the same filter. It is the part a candidate is most
    // likely to send verbatim.
    const noteFail = note ? groundingFailure(note, me, role) : 'was not written'

    return {
      bullets: bullets.slice(0, 3),
      coverNote: noteFail ? '' : note,
      matched,
      provider,
      dropped: noteFail && note ? [...dropped, { text: note, reason: noteFail }] : dropped,
    }
  } catch {
    return null
  }
}
