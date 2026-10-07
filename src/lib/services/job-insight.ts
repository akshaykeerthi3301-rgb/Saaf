import { createClient } from '@/lib/supabase/server'
import { analyseFit, type FitAnalysis } from '@/lib/job-insight'
import { fitSections, type FitSection } from '@/lib/fit-sections'
import { postingEvidence, type PostingEvidence } from '@/lib/posting-evidence'
import { cultureTags, formatDescription, isEasyApply, titleSeniority, type JdBlock, type TitleSeniority } from '@/lib/job-facts'
import { displayCity, displayEmployer } from '@/lib/display-names'
import { findStatedPay } from '@/lib/stated-pay'
import { structureJob, SECTION_LABEL, type SectionKey } from '@/lib/job-sections'
import type { ScoreBreakdown } from '@/match/score'

/**
 * Everything the job panel shows for one role, in one call.
 *
 * ⚠️ THE SCORE IS READ FROM `gate_results` FOR THIS USER, never recomputed. The
 * panel must show the number the card shows; a second computation would be a
 * second number for one role, which src/components/ui/fit-ring.tsx exists to
 * prevent.
 *
 * Runs on the caller's client: RLS scopes gate_results and profiles to
 * auth.uid() and restricts roles to candidate accounts (0026). The .eq()
 * filters are for correctness, the policies are the security.
 */

export type CompanySnapshot = {
  name: string
  openRoles: number
  cities: string[]
  /** The applicant-tracking system the posting lives on, from its URL. */
  ats: string | null
  culture: { tag: string; evidence: string }[]
}

export type JobInsight = {
  roleId: string
  /** gate_results.id — what "this score looks wrong" is filed against; null when the role is not scored for this candidate. */
  gateResultId: string | null
  /** What the extractor read from the posting, one quote each — the "how this score is built" list. */
  evidence: PostingEvidence[]
  title: string
  company: string
  city: string | null
  applyUrl: string
  postedAt: string | null
  easyApply: boolean
  seniority: TitleSeniority | null
  /** Pay as the posting states it, or null. Never estimated. */
  statedPay: string | null
  score: number | null
  reason: string | null
  analysis: FitAnalysis
  /** Experience, Seniority, Education, Core skills — each with the words it rests on (TASK-160). */
  sections: FitSection[]
  description: JdBlock[]
  /** The posting under the employer's own headings, sorted by what they say — null when it has fewer than two (TASK-179). */
  jobSections: { key: SectionKey; label: string; heading: string; blocks: JdBlock[] }[] | null
  snapshot: CompanySnapshot
  /** The candidate's tracker stage for this role, when tracked. */
  trackedStatus: string | null
}

/** The posting's sections as display blocks, or null when its headings could not be read. */
function jobSectionsOf(description: string): JobInsight['jobSections'] {
  const st = structureJob(description)
  return st.structured ? st.sections.map((x) => ({ key: x.key, label: SECTION_LABEL[x.key], heading: x.heading, blocks: formatDescription(x.text) })) : null
}

const ATS: [RegExp, string][] = [
  [/greenhouse\.io$/, 'Greenhouse'],
  [/lever\.co$/, 'Lever'],
  [/ashbyhq\.com$/, 'Ashby'],
  [/workable\.com$/, 'Workable'],
  [/recruitee\.com$/, 'Recruitee'],
  [/smartrecruiters\.com$/, 'SmartRecruiters'],
  [/myworkdayjobs\.com$/, 'Workday'],
]

function atsOf(url: string): string | null {
  try {
    const host = new URL(url).hostname
    return ATS.find(([re]) => re.test(host))?.[1] ?? null
  } catch {
    return null
  }
}

export async function readJobInsight(userId: string, roleId: string): Promise<JobInsight | null> {
  const supabase = await createClient()
  const [{ data: profile }, { data: role }, { data: gate }, { data: reqs }, { data: app }] = await Promise.all([
    supabase.from('profiles').select('skills, years_experience, current_title, credential').eq('id', userId).maybeSingle(),
    supabase
      .from('roles')
      .select('id, title, company_name, description, city, apply_url, posted_at')
      .eq('id', roleId)
      .maybeSingle(),
    supabase
      .from('gate_results')
      .select('id, score, reason, score_breakdown')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .maybeSingle(),
    supabase.from('role_requirements').select('kind, min_years, credential, confidence, source_quote').eq('role_id', roleId),
    supabase.from('applications').select('status').eq('role_id', roleId).maybeSingle(),
  ])
  if (!role) return null

  type RoleRow = {
    id: string
    title: string
    company_name: string | null
    description: string
    city: string | null
    apply_url: string
    posted_at: string | null
  }
  const r = role as unknown as RoleRow
  const g = gate as unknown as { id: string; score: number | null; reason: string; score_breakdown: ScoreBreakdown | null } | null
  const p = profile as unknown as { skills: string[] | null; years_experience: number | null; current_title: string | null; credential: string | null } | null
  const reqRows = (reqs ?? []) as unknown as { kind: string; min_years: number | null; credential: string | null; confidence: number | null; source_quote: string }[]

  // The company's other open roles in India — the one company figure we can
  // state without a licence: we indexed them ourselves.
  const companyName = r.company_name ?? ''
  const { data: siblings, count } = companyName
    ? await supabase
        .from('roles')
        .select('city', { count: 'exact' })
        .eq('company_name', companyName)
        .eq('in_india', true)
        .limit(200)
    : { data: [], count: 0 }
  const cities = [
    ...new Set(((siblings ?? []) as { city: string | null }[]).map((s) => displayCity(s.city)).filter(Boolean)),
  ].slice(0, 6) as string[]

  const analysis = analyseFit({
    skills: p?.skills ?? [],
    description: r.description ?? '',
    title: r.title,
    yearsExperience: p?.years_experience === null || p?.years_experience === undefined ? null : Number(p.years_experience),
    breakdown: g?.score_breakdown ?? null,
    requirements: reqRows.map((q) => ({
      kind: q.kind,
      minYears: q.min_years === null ? null : Number(q.min_years),
      sourceQuote: q.source_quote,
    })),
  })

  const sections = fitSections({
    title: r.title,
    description: r.description ?? '',
    yearsExperience: p?.years_experience === null || p?.years_experience === undefined ? null : Number(p.years_experience),
    currentTitle: p?.current_title?.trim() || null,
    credential: p?.credential ?? null,
    skills: p?.skills ?? [],
    matchedSkills: analysis.matched,
    missingSkills: analysis.missing.map((m) => m.term),
    requirements: reqRows.map((q) => ({
      kind: q.kind,
      minYears: q.min_years === null ? null : Number(q.min_years),
      credential: q.credential,
      sourceQuote: q.source_quote,
      confidence: q.confidence === null ? undefined : Number(q.confidence),
    })),
  })

  return {
    roleId: r.id,
    gateResultId: g?.id ?? null,
    evidence: postingEvidence(reqRows.map((q) => ({ kind: q.kind, minYears: q.min_years === null ? null : Number(q.min_years), confidence: Number(q.confidence ?? 1), sourceQuote: q.source_quote }))),
    title: r.title,
    company: displayEmployer(r.company_name),
    city: displayCity(r.city) || null,
    applyUrl: r.apply_url,
    postedAt: r.posted_at,
    easyApply: isEasyApply(r.apply_url),
    seniority: titleSeniority(r.title),
    statedPay: findStatedPay(r.description ?? '')?.text ?? null,
    score: g?.score === null || g?.score === undefined ? null : Number(g.score),
    reason: g?.reason ?? null,
    analysis,
    sections,
    description: formatDescription(r.description ?? ''),
    jobSections: jobSectionsOf(r.description ?? ''),
    snapshot: {
      name: displayEmployer(r.company_name),
      openRoles: count ?? 0,
      cities,
      ats: atsOf(r.apply_url),
      culture: cultureTags(r.description ?? ''),
    },
    trackedStatus: (app as { status: string } | null)?.status ?? null,
  }
}
