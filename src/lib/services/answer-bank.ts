import { createClient } from '@/lib/supabase/server'
import { mergeAsked, sanitizeAnswerBank, type BankEntry } from '@/lib/answer-bank'

/**
 * The candidate's own answers to custom questions (migration 0046). The caller's client:
 * the owner-only profiles policy is the security. A read error means "not stored yet" so
 * the screen can say the update is missing.
 */
export async function readAnswerBank(userId: string): Promise<{ bank: BankEntry[]; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('answer_bank').eq('id', userId).maybeSingle()
  if (error) return { bank: [], stored: false }
  return { bank: sanitizeAnswerBank((data as { answer_bank?: unknown } | null)?.answer_bank), stored: true }
}

/** Replace the whole list; clearing an answer or removing a row removes it from the extension at its next sync. */
export async function writeAnswerBank(userId: string, bank: BankEntry[]): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ answer_bank: sanitizeAnswerBank(bank) }).eq('id', userId)
  return { ok: !error }
}

/** File the questions the extension met. Returns the questions now on file, so the extension can drop them. */
export async function fileAskedQuestions(userId: string, asked: { key: string; question: string }[]): Promise<{ handled: string[]; added: number }> {
  const { bank, stored } = await readAnswerBank(userId)
  if (!stored) return { handled: [], added: 0 }
  const merged = mergeAsked(bank, asked)
  const added = merged.bank.length - bank.length
  if (added > 0 && !(await writeAnswerBank(userId, merged.bank)).ok) return { handled: [], added: 0 }
  return { handled: asked.filter((a) => merged.handled.includes(a.key)).map((a) => a.key), added }
}
