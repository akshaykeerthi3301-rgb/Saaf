import { callJsonModel, type Provider } from '@/lib/parse/llm'
import { groundText, type CandidateFacts, type RoleFacts } from '@/lib/tailor'
import {
  coverLetterTemplate, LINKEDIN_NOTE_MAX, outreachTemplates, scoreAnswerHeuristic,
  type AnswerFeedback, type ContactKey, type OutreachMessage, type Tone,
} from '@/lib/copilot-templates'

export type { AnswerFeedback, OutreachMessage, Tone } from '@/lib/copilot-templates'
// groundText moved to src/lib/tailor.ts (2026-09-24) so the review drawer's
// cover note can use it without a circular import; re-exported for callers.
export { groundText } from '@/lib/tailor'

/**
 * The Co-Pilot's model-backed writing: cover letters, outreach messages and
 * mock-interview feedback. Templates and the follow-up email live in
 * copilot-templates.ts, which the browser can import.
 *
 * ⚠️ EVERY TOOL HAS A NO-MODEL PATH THAT STILL WORKS. Groq's free tier is
 * 8,000 tokens a minute shared across the whole site (src/lib/parse/llm.ts); a
 * busy minute must degrade to a good template the candidate can edit, never to
 * an empty screen. The templates carry [Variable] tags for what we genuinely do
 * not know — a project name, a hiring manager — rather than inventing it.
 *
 * ⚠️ MODEL TEXT GOES THROUGH groundingFailure() BEFORE ANYONE SEES IT, the
 * same filter as the review drawer: no figure, employer, tenure or credential
 * the profile does not hold. A failing paragraph is dropped and listed.
 */

// ------------------------------------------------------------- cover letter

const TONE_GUIDE: Record<Tone, string> = {
  Professional: 'measured and courteous; complete sentences; no slang',
  Direct: 'short sentences; lead with the fit; no pleasantries beyond one line',
  Consultative: 'frame the letter around the problems the team likely has and how the candidate would approach them',
  'High-Impact': 'confident and energetic; strong verbs; still no claims beyond the facts given',
}

export type WrittenDraft = {
  text: string
  /** Null when the template was used. */
  provider: Provider | null
  dropped: { text: string; reason: string }[]
}

const LETTER_SYSTEM = [
  'You write cover letters for Indian job seekers.',
  'You may ONLY state facts given to you about the candidate. Never invent numbers, percentages,',
  'employers, years of experience, degrees or certifications.',
  'Where a specific fact would help but was not given, write a bracketed tag instead:',
  '[Key Project] for a project name, [Hiring Manager] for the reader, [Your Name] for the signature.',
  'Respond with JSON only.',
].join(' ')

export async function draftCoverLetter(me: CandidateFacts, role: RoleFacts, tone: Tone, matched: string[]): Promise<WrittenDraft> {
  const fallback: WrittenDraft = { text: coverLetterTemplate(me, tone), provider: null, dropped: [] }
  const answer = await callJsonModel({
    system: LETTER_SYSTEM,
    caller: 'cover-letter',
    temperature: 0.5,
    schema: {
      type: 'object',
      properties: { paragraphs: { type: 'array', items: { type: 'string' } } },
      required: ['paragraphs'],
    },
    prompt: [
      `Write a cover letter of 3 or 4 short paragraphs. Tone: ${tone} — ${TONE_GUIDE[tone]}.`,
      'Open with "Dear [Hiring Manager]," as its own paragraph and end with a sign-off paragraph ending in [Your Name].',
      '',
      'THE CANDIDATE — everything that is known:',
      `  current title: ${me.currentTitle ?? 'unknown'}`,
      `  employer: ${me.employer ?? 'unknown'}`,
      `  years of experience: ${me.yearsExperience ?? 'unknown'}`,
      `  skills: ${me.skills.join(', ') || 'none recorded'}`,
      `  skills this posting also names: ${matched.join(', ') || 'none'}`,
      '',
      `THE ROLE: ${role.title} at ${role.company}`,
      `THE POSTING (excerpt): ${(role.description ?? '').slice(0, 2500)}`,
    ].join('\n'),
  }).catch(() => null)
  if (!answer) return fallback

  try {
    const parsed = JSON.parse(answer.raw) as { paragraphs?: unknown }
    const paras = Array.isArray(parsed.paragraphs) ? parsed.paragraphs.filter((p): p is string => typeof p === 'string' && p.trim().length > 0) : []
    const kept: string[] = []
    const dropped: { text: string; reason: string }[] = []
    for (const p of paras) {
      const fail = groundText(p, me, role)
      if (fail) dropped.push({ text: p.trim(), reason: fail })
      else kept.push(p.trim())
    }
    if (kept.length < 2) return { ...fallback, dropped }
    return { text: kept.join('\n\n'), provider: answer.provider, dropped }
  } catch {
    return fallback
  }
}

// ----------------------------------------------------------------- outreach

export async function draftOutreach(me: CandidateFacts, role: RoleFacts): Promise<{ messages: OutreachMessage[]; provider: Provider | null; dropped: number }> {
  const fallback = { messages: outreachTemplates(me, role), provider: null, dropped: 0 }
  const answer = await callJsonModel({
    system: LETTER_SYSTEM,
    caller: 'outreach',
    temperature: 0.5,
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              contact: { type: 'string', enum: ['recruiter', 'manager', 'peer'] },
              note: { type: 'string' },
              subject: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['contact', 'note', 'subject', 'email'],
          },
        },
      },
      required: ['messages'],
    },
    prompt: [
      'Write cold outreach for three contacts at the company: "recruiter", "manager" (the hiring manager), and "peer" (a team member).',
      `For each: a LinkedIn connection note under ${LINKEDIN_NOTE_MAX} characters, an email subject, and a short email (under 130 words).`,
      'Address the reader as [Name]. Sign emails as [Your Name]. Use [Key Project] where a project name would help.',
      '',
      'THE CANDIDATE — everything that is known:',
      `  current title: ${me.currentTitle ?? 'unknown'}`,
      `  employer: ${me.employer ?? 'unknown'}`,
      `  years of experience: ${me.yearsExperience ?? 'unknown'}`,
      `  skills: ${me.skills.join(', ') || 'none recorded'}`,
      '',
      `THE ROLE: ${role.title} at ${role.company}`,
      `THE POSTING (excerpt): ${(role.description ?? '').slice(0, 2000)}`,
    ].join('\n'),
  }).catch(() => null)
  if (!answer) return fallback

  try {
    const parsed = JSON.parse(answer.raw) as { messages?: unknown }
    const raw = Array.isArray(parsed.messages) ? parsed.messages : []
    let dropped = 0
    const byContact = new Map<ContactKey, OutreachMessage>()
    for (const m of raw as Partial<OutreachMessage>[]) {
      if (!m || !['recruiter', 'manager', 'peer'].includes(m.contact as string)) continue
      const note = String(m.note ?? '').trim().slice(0, LINKEDIN_NOTE_MAX)
      const subject = String(m.subject ?? '').trim()
      const email = String(m.email ?? '').trim()
      if (!note || !email || groundText(note, me, role) || groundText(email, me, role)) { dropped++; continue }
      byContact.set(m.contact as ContactKey, { contact: m.contact as ContactKey, note, subject, email })
    }
    // Any contact the model got wrong keeps its template, so all three always render.
    const messages = fallback.messages.map((t) => byContact.get(t.contact) ?? t)
    return { messages, provider: byContact.size ? answer.provider : null, dropped }
  } catch {
    return fallback
  }
}

// ----------------------------------------------------------- mock interview

export async function scoreAnswer(me: CandidateFacts, role: RoleFacts, question: string, answer: string, keywords: string[]): Promise<AnswerFeedback> {
  const heuristic = scoreAnswerHeuristic(question, answer, keywords)
  const res = await callJsonModel({
    system: 'You are a fair, specific interview coach for Indian job seekers. Judge only what the answer says. Respond with JSON only.',
    caller: 'mock-interview',
    temperature: 0.2,
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number' },
        strengths: { type: 'array', items: { type: 'string' } },
        improvements: { type: 'array', items: { type: 'string' } },
        modelAnswer: { type: 'string' },
      },
      required: ['score', 'strengths', 'improvements', 'modelAnswer'],
    },
    prompt: [
      `ROLE: ${role.title} at ${role.company}`,
      `QUESTION: ${question}`,
      `CANDIDATE'S ANSWER: ${answer.slice(0, 3000)}`,
      '',
      'Score it 0–10. Give up to 3 strengths and up to 3 concrete improvements.',
      'Then write a model answer of 120–180 words in STAR form. The model answer must use ONLY these',
      `facts about the candidate — title: ${me.currentTitle ?? 'unknown'}, employer: ${me.employer ?? 'unknown'},`,
      `years: ${me.yearsExperience ?? 'unknown'}, skills: ${me.skills.join(', ') || 'none'} — and write [Key Project]`,
      'and [Result] where a specific project or outcome is needed. Never invent numbers.',
    ].join('\n'),
  }).catch(() => null)
  if (!res) return heuristic

  try {
    const p = JSON.parse(res.raw) as Partial<AnswerFeedback>
    const score = Math.max(0, Math.min(10, Math.round(Number(p.score))))
    if (!Number.isFinite(score)) return heuristic
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3) : [])
    const model = typeof p.modelAnswer === 'string' ? p.modelAnswer.trim() : ''
    return {
      score,
      strengths: list(p.strengths),
      improvements: list(p.improvements),
      // The sample answer is the part a candidate might repeat word for word,
      // so it gets the same grounding check as a cover letter.
      modelAnswer: model && !groundText(model, me, role) ? model : null,
      provider: res.provider,
    }
  } catch {
    return heuristic
  }
}
