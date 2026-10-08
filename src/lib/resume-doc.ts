import { roleLine, type ResumeSections } from '@/lib/parse/sections'
import { formatDates, type ResumeStyle } from '@/lib/resume-style'

/**
 * The résumé as a flat list of blocks — the one description both renderers draw from.
 *
 * The on-screen page (src/components/features/resume-paper.tsx) and the Word file (src/lib/resume-docx.ts) used to be
 * written separately, which is how a preview and a download come to disagree. Now each is a loop over these blocks;
 * all the decisions (what is a heading, which line carries the dates, education order, skills layout, date format)
 * are made here, once, and covered by tests.
 *
 * ⚠️ EVERY BLOCK IS REAL TEXT IN READING ORDER. No block is a table cell, a column or an image, and the right-hand
 * date is a tab stop in the same paragraph, not a second cell — the constructs our ATS checker marks down are
 * unrepresentable here.
 */

export type DocBlock =
  | { kind: 'name'; text: string }
  | { kind: 'contact'; text: string }
  | { kind: 'target'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  /** A job, a project or a school: a bold main line with an optional date on the right, and an optional second line. */
  | { kind: 'entry'; main: string; right: string | null; sub: string | null; subItalic: boolean }
  | { kind: 'bullet'; text: string }

export function buildDoc(s: ResumeSections, targetRole: string, style: ResumeStyle): DocBlock[] {
  const out: DocBlock[] = []
  out.push({ kind: 'name', text: s.contact.name ?? 'Your name' })

  const contact = [s.contact.email, s.contact.phone, ...s.contact.links].filter(Boolean).join('  |  ')
  if (contact) out.push({ kind: 'contact', text: contact })
  if (targetRole) out.push({ kind: 'target', text: targetRole })

  if (s.summary) {
    out.push({ kind: 'heading', text: 'Professional summary' })
    out.push({ kind: 'para', text: s.summary })
  }

  const jobs = s.experience.filter((e) => !e.isProject)
  const projects = s.experience.filter((e) => e.isProject)
  const entries = (list: typeof s.experience) => {
    for (const e of list) {
      out.push({
        kind: 'entry',
        // Shared with the scorer and the previews — see roleLine()'s note.
        main: roleLine(e),
        right: formatDates(e.dates, style.dateFormat),
        sub: e.location,
        subItalic: true,
      })
      for (const b of e.bullets) out.push({ kind: 'bullet', text: b })
    }
  }
  if (jobs.length) { out.push({ kind: 'heading', text: 'Experience' }); entries(jobs) }
  if (projects.length) { out.push({ kind: 'heading', text: 'Projects' }); entries(projects) }

  if (s.education.length) {
    out.push({ kind: 'heading', text: 'Education' })
    for (const e of s.education) {
      const degreeFirst = style.educationFirst === 'degree'
      const main = degreeFirst ? e.qualification : (e.institution ?? e.qualification)
      const sub = degreeFirst ? e.institution : (e.institution ? e.qualification : null)
      out.push({ kind: 'entry', main, right: formatDates(e.dates, style.dateFormat), sub, subItalic: true })
    }
  }

  if (s.skills.length) {
    out.push({ kind: 'heading', text: 'Skills' })
    if (style.skillsLayout === 'list') for (const k of s.skills) out.push({ kind: 'bullet', text: k })
    else out.push({ kind: 'para', text: s.skills.join('  ·  ') })
  }

  for (const o of s.other) {
    out.push({ kind: 'heading', text: o.heading })
    for (const line of o.lines) out.push({ kind: 'bullet', text: line })
  }
  return out
}

/** What the page's text amounts to, in reading order — for the "does the preview say what the file says" tests. */
export function docText(blocks: DocBlock[]): string {
  return blocks
    .map((b) => (b.kind === 'entry' ? [b.main, b.right, b.sub].filter(Boolean).join('  ') : b.text))
    .join('\n')
}
