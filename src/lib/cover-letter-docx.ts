import { Document, Packer, Paragraph, TextRun } from 'docx'

/**
 * A cover letter as a plain Word file an upload box will accept: paragraphs only — no tables, columns, text boxes or
 * images, so it reads cleanly in any applicant-tracking system (the same rule as the résumé file).
 */
export async function buildCoverLetterDocx(text: string): Promise<Buffer> {
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: paragraphs.map((p) => new Paragraph({
        spacing: { after: 220, line: 276 },
        children: p.split('\n').flatMap((line, i) => [new TextRun({ text: line, font: 'Calibri', size: 22, break: i ? 1 : 0 })]),
      })),
    }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** "Akshay-Keerthi-Cover-Letter-Acme-Robotics.docx": a name an employer reads — no brand, no id. */
export function coverLetterFilename(name: string | null | undefined, company: string | null | undefined): string {
  const base = slug(name || 'Candidate').slice(0, 50) || 'Candidate'
  const tail = slug(company || '').slice(0, 40)
  return `${base}-Cover-Letter${tail ? `-${tail}` : ''}.docx`
}
