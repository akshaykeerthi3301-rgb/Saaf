import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
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
