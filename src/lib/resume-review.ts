import type { ResumeSections } from '@/lib/parse/sections'
import { DOCX_SIZES, templateSpec, type TemplateId } from '@/lib/resume-templates'

/**
 * What the tailor review shows beside the two résumés (TASK-159): the change
 * list, a page estimate, and the file's name. All pure.
 */

// ------------------------------------------------------------ the change list

export type SectionChange = {
  kind: 'summary' | 'bullet' | 'skills'
  /** Where, in the candidate's own terms: "Summary", "Analyst — Acme", "Skills". */
  where: string
  before: string | null
  after: string | null
  /** Skills only: "reordered", or which terms were added / removed. */
  note?: string
}

const roleLabel = (e: ResumeSections['experience'][number], i: number) =>
  [e.title, e.employer].filter(Boolean).join(' — ') || `Role ${i + 1}`

/**
 * Every difference between two documents, nothing else.
 *
 * ⚠️ THE LIST IS COMPUTED FROM THE TWO DOCUMENTS, NOT FROM THE AI'S SUGGESTION
 * LOG. The log says what the model proposed; the diff says what is now on the
 * page — and the candidate edits lines by hand, accepts some suggestions and
 * dismisses others. A list built from the log would drift from the document the
 * moment any of that happened. Built from the documents it cannot, which is the
 * acceptance the task names: the change list equals the diff.
 */
export function diffSections(a: ResumeSections, b: ResumeSections): SectionChange[] {
  const out: SectionChange[] = []

  if ((a.summary ?? '') !== (b.summary ?? '')) {
    out.push({ kind: 'summary', where: 'Summary', before: a.summary, after: b.summary })
  }

  const entries = Math.max(a.experience.length, b.experience.length)
  for (let i = 0; i < entries; i++) {
    const x = a.experience[i]
    const y = b.experience[i]
    const where = roleLabel(y ?? x, i)
    const n = Math.max(x?.bullets.length ?? 0, y?.bullets.length ?? 0)
    for (let j = 0; j < n; j++) {
      const before = x?.bullets[j] ?? null
      const after = y?.bullets[j] ?? null
      if ((before ?? '') !== (after ?? '')) out.push({ kind: 'bullet', where, before, after })
    }
  }

  const same = a.skills.length === b.skills.length && a.skills.every((s, i) => s === b.skills[i])
  if (!same) {
    const key = (s: string) => s.trim().toLowerCase()
    const had = new Set(a.skills.map(key))
    const has = new Set(b.skills.map(key))
    const added = b.skills.filter((s) => !had.has(key(s)))
    const removed = a.skills.filter((s) => !has.has(key(s)))
    const note =
      !added.length && !removed.length
        ? 'reordered'
        : [added.length ? `added ${added.join(', ')}` : '', removed.length ? `removed ${removed.join(', ')}` : ''].filter(Boolean).join('; ')
    out.push({ kind: 'skills', where: 'Skills', before: a.skills.join(', '), after: b.skills.join(', '), note })
  }
  return out
}

// ------------------------------------------------------------ pages

const A4 = { usableWidthPt: 504, usableHeightPt: 734 } // 0.75 in margins all round
const BODY_PT = { tight: 9.5, regular: 10, airy: 10.5 } as const

/**
 * About how many A4 pages a document runs to in a template. An ESTIMATE, and
 * labelled "about" wherever it is shown: it counts characters per line and lines
 * per page from the template's own point sizes, and cannot know a font's exact
 * widths. It is built to be right about the question that matters — does this fit
 * on one page, and is Compact enough — and to say "about" when it is close.
 */
export function estimatePages(s: ResumeSections, template: TemplateId): number {
  const spec = templateSpec(template)
  const d = spec.density
  const size = DOCX_SIZES[d]
  const pt = BODY_PT[d]
  const charsPerLine = Math.floor(A4.usableWidthPt / (pt * 0.5))
  const lineH = pt * 1.2
  const gapLines = size.gapBefore / 20 / lineH // twips → points → lines

  const wrap = (text: string | null | undefined, indent = 0) => Math.max(1, Math.ceil(((text ?? '').length + indent) / charsPerLine))

  let lines = 2 + 1 // name block, contact line
  const heading = () => { lines += 1 + gapLines }

  if (s.summary) { heading(); lines += wrap(s.summary) }
  if (s.experience.length) {
    heading()
    for (const e of s.experience) {
      lines += 1 // title — employer, dates
      for (const b of e.bullets) lines += wrap(b, 3)
      lines += gapLines / 2
    }
  }
  if (s.skills.length) { heading(); lines += wrap(s.skills.join(', ')) }
  if (s.education.length) {
    heading()
    for (const ed of s.education) lines += wrap(`${ed.qualification}${ed.institution ? ` — ${ed.institution}` : ''}${ed.dates ? ` · ${ed.dates}` : ''}`)
  }
  for (const o of s.other) { heading(); for (const l of o.lines) lines += wrap(l) }

  return lines / (A4.usableHeightPt / lineH)
}

export type FitResult = { template: TemplateId; pages: number; fits: boolean }

/**
 * The loosest template that still gets the document onto one page, so a
 * candidate keeps as much air as the content allows; Compact (tightest) when
 * none does, reported as not fitting rather than as a success.
 */
export function fitToOnePage(s: ResumeSections, preferred: TemplateId): FitResult {
  // The preferred template, then each tighter one, loosest first. Never a looser one: asked to fit a
  // page, the answer is never "use more air".
  const byAir: TemplateId[] = ['headline', 'classic', 'compact']
  for (const id of byAir.slice(byAir.indexOf(preferred))) {
    const pages = estimatePages(s, id)
    if (pages <= 1) return { template: id, pages, fits: true }
  }
  const pages = estimatePages(s, 'compact')
  return { template: 'compact', pages, fits: pages <= 1 }
}

// ------------------------------------------------------------ naming

/**
 * A recruiter sees this name in a list of forty attachments, so it carries what
 * they search for — who, which role, which company — and nothing that needs
 * escaping. "Akshay_Keerthi_Customer_Success_Manager_Diligent.docx".
 */
export function tailoredFilename(parts: { name?: string | null; role?: string | null; company?: string | null }, ext = 'docx'): string {
  const clean = (s: string | null | undefined) =>
    (s ?? '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('_')
  const body = [parts.name, parts.role, parts.company].map(clean).filter(Boolean).join('_').slice(0, 80).replace(/_+$/g, '')
  return `${body || 'Resume'}.${ext}`
}
