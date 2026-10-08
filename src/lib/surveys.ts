/**
 * One-question surveys (F-1107, TASK-199). Pure: what is asked, who is asked and when.
 *
 * A survey lives in CODE, so asking is a reviewed change; its answers live in
 * `survey_answers` with one row per candidate per survey, so nobody is ever asked twice.
 * It is shown through the popup governor (src/lib/nudges.ts) — one prompt at a time, not
 * on top of a tour — and only to someone who has used Saaf enough to have an opinion.
 *
 * There is no payment survey: nothing is for sale, and a "why didn't you upgrade?" card
 * for a plan that does not exist would be a question with no honest answer.
 */
export type Survey = { id: string; question: string; options: readonly string[]; noteLabel: string; minVisits: number }

export const SURVEYS: readonly Survey[] = [
  {
    id: 'match-list-useful-v1',
    question: 'How useful is your match list so far?',
    options: ['Very', 'Somewhat', 'Not yet'],
    noteLabel: 'What would make it better? (optional)',
    minVisits: 4,
  },
]

export const surveyById = (id: string) => SURVEYS.find((s) => s.id === id) ?? null

/** Is this answer one of the survey's own options? Anything else is refused at the boundary. */
export const validAnswer = (s: Survey, answer: string) => s.options.includes(answer)

/** Counts visits (separate sessions) in a plain object the host keeps on the device. */
export type Visits = { n: number; lastSession: string | null }
export const EMPTY_VISITS: Visits = { n: 0, lastSession: null }

export function parseVisits(raw: string | null): Visits {
  try {
    const o = JSON.parse(raw ?? '') as Partial<Visits>
    return { n: Number.isInteger(o.n) && (o.n as number) >= 0 ? (o.n as number) : 0, lastSession: typeof o.lastSession === 'string' ? o.lastSession : null }
  } catch { return { ...EMPTY_VISITS } }
}

/** A new browser session counts as one more visit; reloads within it do not. */
export function countVisit(v: Visits, sessionId: string): Visits {
  return v.lastSession === sessionId ? v : { n: v.n + 1, lastSession: sessionId }
}

export const eligible = (s: Survey, v: Visits) => v.n >= s.minVisits
