import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { roleLine, type ResumeSections } from '@/lib/parse/sections'
import { templateSpec, fontSpec, accentSpec, DOCX_SIZES, type AccentId, type FontId, type TemplateId } from '@/lib/resume-templates'
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
  /** One of the three ATS-safe templates. See src/lib/resume-templates.ts. */
  template?: TemplateId
  /** Typeface and accent colour for the name and headings (src/lib/resume-templates.ts). Typographic only. */
  font?: FontId
  accent?: AccentId
}

export async function buildFullResumeDocx({ sections, targetRole, template, font, accent }: FullResumeInput): Promise<Buffer> {
  const s = sections
  const spec = templateSpec(template)
  const face = fontSpec(font).docx
  const ink = accentSpec(accent).hex ?? undefined
  const size = DOCX_SIZES[spec.density]
  const align = spec.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT
  const children: Paragraph[] = []

  /**
   * ⚠️ ALL THREE HEADING STYLES ARE A REAL PARAGRAPH OF REAL TEXT. The variation
   * is a border, letter-spacing or a weight — never a table row, never a shaded
   * cell, never an image. Those three are the constructs the checker on the
   * previous screen flags, and a template that used one would produce a
   * document our own tool marks down.
   */
  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: size.gapBefore, after: 90 },
      border:
        spec.heading === 'ruled'
          ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: ink ?? '888888', space: 2 } }
          : undefined,
      children: [
        new TextRun({
          text: spec.heading === 'bold' ? text : text.toUpperCase(),
          bold: true,
          size: size.heading,
          characterSpacing: spec.heading === 'caps' ? 50 : spec.heading === 'ruled' ? 30 : 0,
          color: ink ?? (spec.heading === 'caps' ? '555555' : undefined),
        }),
      ],
    })

  children.push(
    new Paragraph({
      alignment: align,
      children: [new TextRun({ text: s.contact.name ?? 'Your name', bold: true, size: size.name, color: ink })],
    }),
  )

  const contactLine = [s.contact.email, s.contact.phone, ...s.contact.links].filter(Boolean).join('  |  ')
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 40 },
        children: [new TextRun({ text: contactLine, size: size.body - 1 })],
      }),
    )
  }
  if (targetRole) {
    children.push(
      new Paragraph({
        alignment: align,
        spacing: { after: 120 },
        children: [new TextRun({ text: targetRole, size: size.body, color: '444444' })],
      }),
    )
  }

  if (s.summary) {
    children.push(heading('Professional summary'))
    children.push(new Paragraph({ children: [new TextRun({ text: s.summary, size: size.body })] }))
  }

  if (s.experience.length) {
    children.push(heading('Experience'))
    for (const e of s.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 140 },
          // Shared with the scorer and the preview — see roleLine()'s note.
          children: [new TextRun({ text: roleLine(e), bold: true, size: size.body + 1 })],
        }),
      )
      const meta = [e.dates, e.location].filter(Boolean).join('  |  ')
      if (meta) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: meta, size: 19, color: '444444' })] }),
        )
      }
      for (const b of e.bullets) {
        children.push(
          new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: b, size: size.body })] }),
        )
      }
    }
  }

  if (s.skills.length) {
    children.push(heading('Skills'))
    children.push(new Paragraph({ children: [new TextRun({ text: s.skills.join('  ·  '), size: size.body })] }))
  }

  if (s.education.length) {
    children.push(heading('Education'))
    for (const e of s.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: e.qualification, bold: true, size: size.body }),
            new TextRun({
              text: [e.institution, e.dates].filter(Boolean).length
                ? `  ·  ${[e.institution, e.dates].filter(Boolean).join('  ·  ')}`
                : '',
              size: size.body,
            }),
          ],
        }),
      )
    }
  }

  for (const o of s.other) {
    children.push(heading(o.heading))
    for (const line of o.lines) {
      children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: line, size: size.body })] }))
    }
  }

  return Packer.toBuffer(
    new Document({
      styles: { default: { document: { run: { font: face } } } },
      sections: [{ properties: {}, children }],
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
