/**
 * The candidate's own answers to employers' custom questions (F-705, TASK-194).
 *
 * ⚠️ NOTHING HERE WRITES AN ANSWER FOR ANYONE. An entry's answer is words the candidate
 * typed for that question; the extension fills it only when a form asks the same question
 * (compared by `questionKey` — lower-case, no punctuation — never "similar"), and Apply
 * for me uses it only if `auto` was ticked. A question the extension met and could not
 * answer is stored with a blank answer, waiting for the candidate.
 *
 * `questionKey` is mirrored by the same-named function in extension/autofill.js;
 * extension/answer-bank.test.ts fails if they ever disagree.
 */
export type BankEntry = { q: string; a: string; auto: boolean }

export const MAX_ENTRIES = 60
export const MAX_QUESTION = 200
export const MAX_ANSWER = 1500

export function questionKey(label: string): string {
  return String(label ?? '').toLowerCase()
    .replace(/\((optional|required)\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 200)
}

/** Rebuild whatever was stored or submitted through the whitelist; first entry per question wins. */
export function sanitizeAnswerBank(raw: unknown): BankEntry[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: BankEntry[] = []
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue
    const { q, a, auto } = e as Record<string, unknown>
    if (typeof q !== 'string') continue
    const question = q.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION)
    const key = questionKey(question)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ q: question, a: typeof a === 'string' ? a.trim().slice(0, MAX_ANSWER) : '', auto: auto === true })
    if (out.length >= MAX_ENTRIES) break
  }
  return out
}

/** Questions the extension met, added with a blank answer. Existing entries are never touched; returns the keys now on file. */
export function mergeAsked(bank: BankEntry[], asked: { question: string }[]): { bank: BankEntry[]; handled: string[] } {
  const have = new Set(bank.map((b) => questionKey(b.q)))
  const next = [...bank]
  const handled: string[] = []
  for (const { question } of asked) {
    const q = question.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION)
    const key = questionKey(q)
    if (!key) continue
    if (have.has(key)) { handled.push(key); continue }
    if (next.length >= MAX_ENTRIES) continue
    have.add(key)
    next.push({ q, a: '', auto: false })
    handled.push(key)
  }
  return { bank: next, handled }
}

/** What the extension gets: answered entries only, keyed by `questionKey`. */
export function forExtension(bank: BankEntry[]): { key: string; a: string; auto: boolean }[] {
  return bank.filter((b) => b.a).map((b) => ({ key: questionKey(b.q), a: b.a, auto: b.auto }))
}

/**
 * One answer the candidate just gave on a form: replaces the entry for the same question (keeping whether it may be used by
 * "Apply for me"), or is added. A blank answer removes nothing — it is ignored. Existing entries for other questions are untouched.
 */
export function upsertAnswer(bank: BankEntry[], question: string, answer: string): BankEntry[] {
  const q = String(question ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION)
  const a = String(answer ?? '').trim().slice(0, MAX_ANSWER)
  const key = questionKey(q)
  if (!key || !a) return bank
  const i = bank.findIndex((b) => questionKey(b.q) === key)
  if (i >= 0) return bank.map((b, n) => (n === i ? { ...b, a } : b))
  if (bank.length >= MAX_ENTRIES) return bank
  return [...bank, { q, a, auto: false }]
}
