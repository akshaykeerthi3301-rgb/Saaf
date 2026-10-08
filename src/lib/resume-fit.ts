import type { ResumeSections } from '@/lib/parse/sections'
import { buildDoc } from '@/lib/resume-doc'
import { PAGE, entryGapPt, lineMultiple, marginXIn, marginYIn, sectionGapPt, type ResumeStyle } from '@/lib/resume-style'

/**
 * About how many pages a résumé runs to in a given style, and the smallest change that gets it onto one.
 *
 * An ESTIMATE, and labelled "about" wherever it is shown: it counts characters per line and lines per page from the
 * style's own point sizes and cannot know a font's exact widths. The export drawer's page badge, by contrast, is
 * MEASURED from the rendered page. This is for the decision "does it fit one page" before there is a page to measure.
 */

export function estimatePagesForStyle(s: ResumeSections, st: ResumeStyle): number {
  const page = PAGE[st.page]
  const usableW = (page.widthIn - 2 * marginXIn(st.spacing.marginX)) * 72
  const usableH = (page.heightIn - 2 * marginYIn(st.spacing.marginY)) * 72
  const pt = st.sizes.body
  const mult = lineMultiple(st.spacing.line)
  const lineH = pt * 1.15 * mult
  const rowH = (size: number) => size * 1.15 * mult
  const wrap = (text: string, indentPt = 0) => Math.max(1, Math.ceil((text.length * pt * 0.5) / (usableW - indentPt)))

  let h = 0
  for (const b of buildDoc(s, '', st)) {
    switch (b.kind) {
      case 'name': h += rowH(st.sizes.name); break
      case 'contact': case 'target': h += lineH; break
      case 'heading': h += sectionGapPt(st.spacing.section) + rowH(st.sizes.section) + 5; break
      case 'para': h += wrap(b.text) * lineH + 2; break
      case 'entry': h += entryGapPt(st.spacing.entry) + rowH(st.sizes.sub) + (b.sub ? lineH : 0); break
      case 'bullet': h += wrap(b.text, pt * 1.3) * lineH + 1; break
    }
  }
  return h / usableH
}

export type FitResult = { style: ResumeStyle; pages: number; fits: boolean }

/**
 * The gentlest tightening that reaches one page: first the spacing, then the type, then the margins — in that order
 * because that is the order a reader notices least. Returns the original untouched when it already fits, and the
 * tightest version tried, marked as not fitting, when nothing does — never a quiet success.
 */
export function fitStyleToOnePage(s: ResumeSections, st: ResumeStyle): FitResult {
  const floor = (n: number) => Math.max(0, n)
  const steps: ((x: ResumeStyle) => ResumeStyle)[] = [
    ...Array<(x: ResumeStyle) => ResumeStyle>(3).fill((x) => ({ ...x, spacing: { ...x.spacing, section: floor(x.spacing.section - 1), entry: floor(x.spacing.entry - 1), line: floor(x.spacing.line - 1) } })),
    ...Array<(x: ResumeStyle) => ResumeStyle>(4).fill((x) => ({
      ...x,
      sizes: { name: Math.max(16, x.sizes.name - 1), section: Math.max(9.5, x.sizes.section - 0.5), sub: Math.max(9, x.sizes.sub - 0.5), body: Math.max(8.5, x.sizes.body - 0.5) },
    })),
    ...Array<(x: ResumeStyle) => ResumeStyle>(3).fill((x) => ({ ...x, spacing: { ...x.spacing, marginY: Math.max(1, x.spacing.marginY - 1), marginX: Math.max(1, x.spacing.marginX - 1) } })),
  ]
  let cur = st
  let pages = estimatePagesForStyle(s, cur)
  if (pages <= 1) return { style: st, pages, fits: true }
  for (const step of steps) {
    cur = step(cur)
    pages = estimatePagesForStyle(s, cur)
    if (pages <= 1) return { style: cur, pages, fits: true }
  }
  return { style: cur, pages, fits: false }
}
