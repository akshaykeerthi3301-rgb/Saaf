/**
 * Scores a parsed résumé against its gold answers (bench/make-stress.ts). Shared by `npm run audit:parse` and the
 * stress test so the number printed and the number gated are the same number.
 *
 * Each check is binary: right, wrong, or absent. "Wrong" (a confident value that is not the truth) is counted
 * separately from "absent" (the engine abstained) — the product promise is zero wrong values, and abstaining is allowed.
 */
import type { ParsedResume } from '../src/lib/types/parsed-resume'
import type { Gold } from './make-stress'

export type Check = { field: string; verdict: 'right' | 'wrong' | 'absent'; detail?: string }

const n = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function scoreDoc(g: Gold, r: ParsedResume): Check[] {
  const d = r.derived
  const out: Check[] = []
  const eq = (field: string, got: unknown, want: unknown, detail = '') => {
    const ok = JSON.stringify(got) === JSON.stringify(want)
    out.push({ field, verdict: ok ? 'right' : got === null || got === undefined ? 'absent' : 'wrong', detail: ok ? undefined : `got ${JSON.stringify(got)} want ${JSON.stringify(want)} ${detail}`.trim() })
  }
  const role = (field: string, got: { title: string | null; employer: string | null } | null, want: { title: string; employer: string } | null) => {
    if (want === null) { out.push({ field: `${field}_title`, verdict: got === null ? 'right' : 'wrong', detail: got ? `got ${got.title} but there is none` : undefined }); out.push({ field: `${field}_company`, verdict: got === null ? 'right' : 'wrong' }); return }
    eq(`${field}_title`, got?.title ? n(got.title) : null, n(want.title))
    eq(`${field}_company`, got?.employer ? n(got.employer) : null, n(want.employer))
  }
  role('current', d.current_role, g.current)
  role('latest', d.latest_role, g.latest)
  eq('months_total', d.total_experience_months, g.months.mid)
  eq('months_bracket', [d.total_experience_months_low, d.total_experience_months_high], [g.months.low, g.months.high])
  eq('internship_months', d.internship_months, g.internship_months)
  eq('count_experience', r.experience.length, g.n_experience)
  eq('count_internships', r.internships.length, g.n_internships)
  eq('count_projects', r.projects.length, g.n_projects)
  eq('count_education', r.education.length, g.n_education)
  eq('gap_reasons', d.gaps.map((x) => x.reason), g.gap_reasons)
  for (const f of g.flags) out.push({ field: `flag_${f}`, verdict: d.flags.includes(f as never) ? 'right' : 'absent', detail: `flag ${f} not raised` })
  const have = new Set(r.skills.map(n))
  const missing = g.skills.filter((s) => !have.has(n(s)))
  out.push({ field: 'skills_recall', verdict: missing.length === 0 ? 'right' : 'absent', detail: missing.length ? `missing ${missing.join(', ')}` : undefined })
  return out
}

export type Row = { file: string; career: string; rendering: string; checks: Check[] }

/** Per-field table: how many right / wrong / absent over all documents. */
export function byField(rows: Row[]): { field: string; right: number; wrong: number; absent: number }[] {
  const m = new Map<string, { right: number; wrong: number; absent: number }>()
  for (const row of rows) for (const c of row.checks) {
    const f = m.get(c.field) ?? { right: 0, wrong: 0, absent: 0 }
    f[c.verdict]++
    m.set(c.field, f)
  }
  return [...m].map(([field, v]) => ({ field, ...v }))
}
