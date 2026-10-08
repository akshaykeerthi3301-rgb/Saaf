'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCookieContext, type CookieContext } from '@/lib/services/cookie'
import { listResumes, getResume } from '@/lib/services/resume-documents'
import { readAccountSummary } from '@/lib/services/workspace'
import { extractFields } from '@/lib/parse/extract'
import { extractSkillPhrases } from '@/lib/taxonomy/skills'
import { parseSections, sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import { checkResume } from '@/lib/ats-check'
import { matchedSkills } from '@/lib/tailor'
import { displayEmployer } from '@/lib/display-names'
import { readMinYears } from '@/lib/services/job-insight'

/**
 * The data behind the three AI tools on a job (Customize your résumé, Build a cover letter, Analyze how well you
 * fit) when they open as drawers on the feed. Each one re-authenticates and reads server-side from ids — the browser
 * names the role and the résumé, never their contents (the same rule as tailor-studio.ts).
 */

const roleSchema = z.object({ roleId: z.string().uuid(), resumeId: z.string().uuid().optional() })

export type GapRow = {
  key: 'title' | 'years' | 'keywords' | 'summary'
  label: string
  /** good = green tick, warn = amber, bad = red cross. */
  status: 'good' | 'warn' | 'bad'
  job: string
  you: string
}

export type TailorContext =
  | {
      ok: true
      role: { id: string; title: string; company: string }
      resumes: { id: string; label: string; isPrimary: boolean }[]
      resume: { id: string; label: string; sections: ResumeSections }
      /** The ATS readability score of the saved résumé against THIS posting, 0–10, or null when it is too short to check. */
      gauge: number | null
      rows: GapRow[]
      keywords: { term: string; inResume: boolean }[]
    }
  | { ok: false; needsResume: true }
  | { ok: false; error: string }

const SENIORITY = new Set(['senior', 'junior', 'staff', 'lead', 'principal', 'associate', 'assistant', 'intern', 'head', 'chief', 'executive', 'trainee', 'sr', 'jr', 'the', 'and', 'for', 'with'])

function words(title: string): string[] {
  return [...new Set(title.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length >= 3 && !SENIORITY.has(w) && !/^\d+$/.test(w)))]
}

export async function loadTailorContext(input: z.input<typeof roleSchema>): Promise<TailorContext> {
  const parsed = roleSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Pick a job first.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const saved = await listResumes(user.id).catch(() => [])
  if (saved.length === 0) return { ok: false, needsResume: true }
  const chosen = saved.find((r) => r.id === parsed.data.resumeId) ?? saved.find((r) => r.isPrimary) ?? saved[0]

  const [detail, ctx, need] = await Promise.all([
    getResume(user.id, chosen.id).catch(() => null),
    getCookieContext(user.id, parsed.data.roleId),
    readMinYears(parsed.data.roleId).catch(() => null),
  ])
  if (!detail) return { ok: false, error: 'That saved résumé could not be found.' }
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { role } = ctx.context

  // ---- the four rows, each read from the two documents and nothing else ------------------------------------------
  const jobWords = words(role.title)
  // The stored sections were read when the résumé was saved; the body is read again here, so a résumé saved before
  // a reader fix (e.g. company-first headers) is still judged on the titles it actually holds.
  const fresh = (() => { try { return parseSections(detail.body).experience } catch { return [] } })()
  const titlesOf = (entries: typeof fresh) => [...new Set(entries.filter((e) => !e.isProject && e.title).map((e) => e.title as string))]
  const resumeTitles = titlesOf(fresh).length ? titlesOf(fresh) : titlesOf(detail.sections.experience)
  const resumeWords = new Set(resumeTitles.flatMap(words))
  const overlap = jobWords.filter((w) => resumeWords.has(w)).length
  const titleRow: GapRow = {
    key: 'title', label: 'Job title',
    status: jobWords.length === 0 || overlap >= Math.ceil(jobWords.length / 2) ? 'good' : overlap > 0 ? 'warn' : 'bad',
    job: role.title,
    you: resumeTitles.slice(0, 2).join(' / ') || 'No job title found',
  }

  const have = extractFields(detail.body).fields.yearsExperience ?? null
  const yearsRow: GapRow = {
    key: 'years', label: 'Years of experience',
    status: need === null || have === null ? 'good' : have >= need ? 'good' : have >= need - 2 ? 'warn' : 'bad',
    job: need === null ? 'Not stated' : `${need}+ years`,
    you: have === null ? 'Not stated' : `${have} years`,
  }

  const terms = extractSkillPhrases(`${role.title}\n${role.description ?? ''}`).slice(0, 12)
  const body = detail.body.toLowerCase()
  const keywords = terms.map((term) => ({ term, inResume: body.includes(term.toLowerCase()) }))
  const hit = keywords.filter((k) => k.inResume).length
  const kwRow: GapRow = {
    key: 'keywords', label: `Keywords (${hit}/${keywords.length})`,
    status: keywords.length === 0 || hit / keywords.length >= 0.6 ? 'good' : hit / keywords.length >= 0.3 ? 'warn' : 'bad',
    job: keywords.length ? `${keywords.length} the posting names` : 'None found',
    you: keywords.length ? `${hit} already in your résumé` : '—',
  }

  const summary = detail.sections.summary?.trim() ?? ''
  const summaryRow: GapRow = {
    key: 'summary', label: 'Summary',
    status: summary.length >= 80 ? 'good' : summary.length > 0 ? 'warn' : 'bad',
    job: 'A short summary of why you fit',
    you: summary.length ? `${summary.split(/\s+/).length} words` : 'None',
  }

  let gauge: number | null = null
  try {
    gauge = Math.round(checkResume(sectionsToText(detail.sections), role.title, undefined, role.description ?? undefined).readability.score) / 10
  } catch { /* too short to check: the gauge reads "—" */ }

  return {
    ok: true,
    role: { id: parsed.data.roleId, title: role.title, company: displayEmployer(role.company) },
    resumes: saved.map((r) => ({ id: r.id, label: r.label, isPrimary: Boolean(r.isPrimary) })),
    resume: { id: detail.id, label: detail.label, sections: detail.sections },
    gauge,
    rows: [titleRow, yearsRow, kwRow, summaryRow],
    keywords,
  }
}

export type CoverLetterContext =
  | { ok: true; me: Extract<CookieContext, { me: unknown }>['me']; defaults: Record<string, string> }
  | { ok: false; error: string }

export async function loadCoverLetterContext(input: { roleId: string }): Promise<CoverLetterContext> {
  const parsed = z.object({ roleId: z.string().uuid() }).safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Pick a job first.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const [ctx, account] = await Promise.all([
    getCookieContext(user.id, parsed.data.roleId),
    readAccountSummary(user.id, user.email ?? ''),
  ])
  if (!ctx.ok) return { ok: false, error: ctx.error }
  const { me, role } = ctx.context
  return {
    ok: true,
    me,
    defaults: {
      Company: displayEmployer(role.company),
      Role: role.title,
      'Target Skill': matchedSkills(me, role)[0] ?? me.skills[0] ?? '',
      'Your Name': account.name ?? '',
    },
  }
}
