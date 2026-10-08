import { Document, LevelFormat, Packer, Paragraph, Tab, TabStopType, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import type { ResumeSections } from '@/lib/parse/sections'
import type { AccentId, FontId, TemplateId } from '@/lib/resume-templates'
import { buildDoc } from '@/lib/resume-doc'
import { PAGE, entryGapPt, fontFamily, lineMultiple, marginXIn, marginYIn, sectionGapPt, styleFromLegacy, type ResumeStyle } from '@/lib/resume-style'
import type { Draft } from '@/lib/tailor'

/**
 * A tailored résumé section, as a .docx a candidate can actually open and edit.
 *
 * ⚠️ .docx, NOT PDF, AND THE CHOICE IS THE PRODUCT'S OWN ARGUMENT. This file is
 * handed to someone who arrived from an ATS checker that just told them parsers
 * struggle with their layout. PDFs are the format ATS systems parse WORST —
 * shipping one would contradict the page that sent them here. Word documents
 * parse cleanly and stay editable, which is what a tailored résumé has to be.
 *
 * ⚠️ IT IS A SECTION, NOT A WHOLE RÉSUMÉ, AND SAYS SO ON THE PAGE. We hold no
 * education, no dates, no contact details — src/app/actions/parse-resume.ts
 * deletes the file after reading it and /resume is built around that promise.
 * Generating a "complete résumé" from what we have would mean inventing the
 * parts we do not, which is the exact failure groundingFailure() exists to
 * prevent. So this produces the bullets and the note, to paste into their own
 * document.
 *
 * ⚠️ NO STYLING BEYOND STRUCTURE, ON PURPOSE. Bold headings, plain paragraphs,
 * real bullet list. No tables, no columns, no text boxes, no images — every one
 * of those is a finding the ATS checker itself would raise. The file has to pass
 * the check the product just sold them.
 */

export type ResumeDocxInput = {
  draft: Draft
  /** The posting this was written against, for the header line only. */
  roleTitle: string
  company?: string
}

export async function buildResumeDocx({ draft, roleTitle, company }: ResumeDocxInput): Promise<Buffer> {
  const target = [roleTitle, company].filter(Boolean).join(' · ')

  const doc = new Document({
    /**
     * Contact details are deliberately absent. We stripped them before the
     * résumé ever reached a model (stripContactDetails in parse/llm.ts), so we
     * do not have them — and writing a placeholder into a document someone may
     * send unedited would be worse than leaving it out.
     */
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Tailored résumé section', bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Written for: ', bold: true }),
              new TextRun({ text: target || 'the role you pasted' }),
            ],
          }),
          new Paragraph({ text: '' }),

          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: 'Experience bullets', bold: true })],
          }),
          ...draft.bullets.map(
            (b) =>
              new Paragraph({
                text: b,
                // A real list, not a "•" typed into a paragraph — a parser reads
                // the first as a list item and the second as a stray character.
                bullet: { level: 0 },
              }),
          ),

          ...(draft.coverNote
            ? [
                new Paragraph({ text: '' }),
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  children: [new TextRun({ text: 'Cover note', bold: true })],
                }),
                new Paragraph({ text: draft.coverNote }),
              ]
            : []),

          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                // The provenance travels with the file. A candidate opening this
                // in a week should be able to tell what it is and what it is not.
                text:
                  'Every line above was checked against the résumé you pasted. Anything that ' +
                  'stated a figure, named an employer you did not list, or claimed a credential ' +
                  'or tenure your résumé does not support was removed rather than softened. ' +
                  'Read it before you send it — it is your name on it.',
                italics: true,
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

/** A filename a candidate can find again in their downloads folder. */
export function docxFilename(roleTitle: string, company?: string): string {
  const slug = [roleTitle, company]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `saaf-tailored-${slug || 'resume'}.docx`
}

/**
 * The WHOLE résumé, rebuilt — not a section.
 *
 * ⚠️ THE CONSTRAINT ABOVE DOES NOT APPLY ON THIS PATH, AND THE DIFFERENCE IS
 * WORTH BEING PRECISE ABOUT. buildResumeDocx() produces a fragment because on
 * /today we hold a profile — skills, years, a title — and no document, so a
 * "complete résumé" would have to invent the contact block, the dates and the
 * education. Here the candidate uploaded a file minutes ago, it was parsed into
 * sections in that same request, every section was shown to them on screen, and
 * they are downloading what they just read. Nothing is invented because nothing
 * had to be: the education line in this file is the education line in theirs.
 *
 * ⚠️ STILL NOT STORED. The sections arrive with the request, are written into a
 * document, and are handed straight back. Nothing reaches a database and no
 * file is written to disk — /resume's promise is unchanged.
 *
 * ⚠️ THE DESIGN IS THE ATS-SAFE SUBSET, DELIBERATELY. Bold headings, a rule
 * under each, real bullet lists, one column, real text throughout. No tables,
 * no text boxes, no columns, no icons, no images, no headers or footers — every
 * one of those is a finding the checker on the previous screen would raise
 * against them. The document has to pass the check that sold it.
 */
export type FullResumeInput = {
  sections: ResumeSections
  /** Printed under the name, so the document announces what it is aimed at. */
  targetRole: string
  /** The export drawer's full set of choices (src/lib/resume-style.ts). Wins over the three legacy fields below. */
  style?: ResumeStyle
  /** The public ATS flow still sends one of three templates, a font and a colour; they are mapped onto a style. */
  template?: TemplateId
  font?: FontId
  accent?: AccentId
}

export async function buildFullResumeDocx({ sections, targetRole, template, font, accent, style }: FullResumeInput): Promise<Buffer> {
  const st = style ?? styleFromLegacy(template, font, accent)
  const blocks = buildDoc(sections, targetRole, st)

  const half = (pt: number) => Math.round(pt * 2)
  const align = (a: 'left' | 'center' | 'right') =>
    a === 'center' ? AlignmentType.CENTER : a === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT
  const page = PAGE[st.page]
  const mx = Math.round(marginXIn(st.spacing.marginX) * 1440)
  const my = Math.round(marginYIn(st.spacing.marginY) * 1440)
  const textWidth = page.twips.w - 2 * mx
  const line = Math.round(240 * lineMultiple(st.spacing.line))
  const bodyAlign = st.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT
  const accent6 = st.accent || undefined
  const nameColor = st.accentScope === 'headings' ? undefined : accent6
  const headColor = st.accentScope === 'name' ? undefined : accent6

  /**
   * ⚠️ EVERY PARAGRAPH IS REAL TEXT. The variation is a border, a tab stop, a size, a colour or an alignment — never a
   * table row, a shaded cell, a text box or an image. Those are the constructs the checker on the previous screen
   * flags, and a style that used one would produce a document our own tool marks down. The right-hand date is a
   * right TAB STOP inside the same paragraph as the role, which any ATS reads as "role, date".
   */
  const children: Paragraph[] = []
  for (const b of blocks) {
    switch (b.kind) {
      case 'name':
        children.push(new Paragraph({ alignment: align(st.headerAlign), spacing: { line }, children: [new TextRun({ text: b.text, bold: true, size: half(st.sizes.name), color: nameColor })] }))
        break
      case 'contact':
        children.push(new Paragraph({ alignment: align(st.headerAlign), spacing: { line, after: 40 }, children: [new TextRun({ text: b.text, size: half(st.sizes.body) })] }))
        break
      case 'target':
        children.push(new Paragraph({ alignment: align(st.headerAlign), spacing: { line, after: 80 }, children: [new TextRun({ text: b.text, size: half(st.sizes.body), color: '444444' })] }))
        break
      case 'heading':
        children.push(new Paragraph({
          alignment: align(st.headingAlign),
          keepNext: true,
          spacing: { before: Math.round(sectionGapPt(st.spacing.section) * 20), after: 80, line },
          border: st.hideDivider ? undefined : { bottom: { style: BorderStyle.SINGLE, size: 6, color: headColor ?? '888888', space: 2 } },
          children: [new TextRun({ text: b.text.toUpperCase(), bold: true, size: half(st.sizes.section), characterSpacing: 20, color: headColor })],
        }))
        break
      case 'para':
        children.push(new Paragraph({ alignment: bodyAlign, spacing: { line, after: 40 }, children: [new TextRun({ text: b.text, size: half(st.sizes.body) })] }))
        break
      case 'entry':
        children.push(new Paragraph({
          keepNext: true,
          spacing: { before: Math.round(entryGapPt(st.spacing.entry) * 20), line },
          tabStops: b.right ? [{ type: TabStopType.RIGHT, position: textWidth }] : undefined,
          children: [
            new TextRun({ text: b.main, bold: true, size: half(st.sizes.sub) }),
            ...(b.right ? [new TextRun({ children: [new Tab(), b.right], size: half(st.sizes.body) })] : []),
          ],
        }))
        if (b.sub) children.push(new Paragraph({ keepNext: true, spacing: { line }, children: [new TextRun({ text: b.sub, italics: b.subItalic, size: half(st.sizes.body) })] }))
        break
      case 'bullet':
        children.push(new Paragraph({
          numbering: { reference: st.bullet === '–' ? 'dash' : 'dot', level: 0 },
          alignment: bodyAlign,
          spacing: { line, after: 20 },
          children: [new TextRun({ text: b.text, size: half(st.sizes.body) })],
        }))
        break
    }
  }

  // A real list in both cases — a parser reads a numbered paragraph as a list item and a typed "•" as a stray character.
  const level = (text: string) => [{ level: 0, format: LevelFormat.BULLET, text, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }]

  return Packer.toBuffer(
    new Document({
      styles: { default: { document: { run: { font: fontFamily(st.font).docx, size: half(st.sizes.body) } } } },
      numbering: { config: [{ reference: 'dot', levels: level('•') }, { reference: 'dash', levels: level('–') }] },
      sections: [{
        properties: { page: { size: { width: page.twips.w, height: page.twips.h }, margin: { top: my, bottom: my, left: mx, right: mx } } },
        children,
      }],
    }),
  )
}

/** Their own name in the filename, because they will download several. */
export function fullResumeFilename(name: string | null, targetRole: string): string {
  const slug = [name, targetRole]
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'resume'}-saaf.docx`
}
