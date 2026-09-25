import { createClient } from '@/lib/supabase/server'
import { normaliseCompany } from '@/lib/company-name'

/**
 * Interview questions candidates report being asked (migration 0031). Jobright
 * shows a bank of "11,534 questions" (CLAIMED on their page, 2026-09-25); ours
 * starts empty and grows only from reports, because a seeded question we did not
 * collect would be an invented one. Reporters are never shown.
 */

export type BankQuestion = { id: string; question: string; kind: string; roleTitle: string | null; askedIn: string | null; mine: boolean }
export const QUESTION_KINDS = ['behavioural', 'technical', 'case', 'hr', 'other'] as const
export type QuestionKind = (typeof QUESTION_KINDS)[number]

/** Questions reported for this company, newest first. `stored: false` when 0031 is not applied. */
export async function listCompanyQuestions(userId: string, company: string): Promise<{ questions: BankQuestion[]; stored: boolean }> {
  const norm = normaliseCompany(company)
  if (!norm) return { questions: [], stored: true }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interview_questions')
    .select('id, question, kind, role_title, asked_in, reported_by')
    .eq('company_norm', norm)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return { questions: [], stored: false }
  return {
    stored: true,
    questions: ((data ?? []) as { id: string; question: string; kind: string; role_title: string | null; asked_in: string | null; reported_by: string | null }[])
      .map((r) => ({ id: r.id, question: r.question, kind: r.kind, roleTitle: r.role_title, askedIn: r.asked_in, mine: r.reported_by === userId })),
  }
}

export async function reportQuestion(userId: string, q: { company: string; roleTitle: string; kind: QuestionKind; question: string; askedIn: string | null }): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('interview_questions').insert({
    company: q.company, company_norm: normaliseCompany(q.company), role_title: q.roleTitle || null,
    kind: q.kind, question: q.question, asked_in: q.askedIn, reported_by: userId,
  })
  return !error
}

export async function deleteOwnQuestion(userId: string, id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase.from('interview_questions').delete().eq('id', id).eq('reported_by', userId)
  return !error
}
