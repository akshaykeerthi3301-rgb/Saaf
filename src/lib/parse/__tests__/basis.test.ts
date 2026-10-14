import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseResume } from '../engine'

const AS_OF = new Date('2026-10-14T00:00:00Z')
const P = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
async function docx(lines: string[], modified?: string): Promise<Buffer> {
  const z = new JSZip()
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
  z.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${lines.map(P).join('')}</w:body></w:document>`)
  if (modified) z.file('docProps/core.xml', `<?xml version="1.0"?><cp:coreProperties xmlns:cp="x" xmlns:dcterms="y"><dcterms:modified>${modified}T10:00:00Z</dcterms:modified></cp:coreProperties>`)
  return z.generateAsync({ type: 'nodebuffer' })
}
const HEAD = ['Asha Verma', 'Pune, India', 'asha@example.com']

describe('how the headline number was found', () => {
  it('uses the résumé\'s own "N years" sentence when no role has dates, and SAYS so', async () => {
    const r = await parseResume(await docx([...HEAD, 'SUMMARY', '3+ years of experience in environmental education.', 'EXPERIENCE', 'Teaching Assistant', 'University of Washington', 'June 20xx - Present', '- Taught labs.', 'EDUCATION', 'B.Sc Biology, University of Pune, 2018']), { asOf: AS_OF, ocr: 'never' })
    expect(r.derived.total_experience_basis).toBe('stated')
    expect(r.derived.stated_experience_years).toBe(3)
    expect(r.derived.total_experience_months).toBe(36)
    expect(r.derived.flags).toContain('placeholder_dates')
  })
  it('says UNKNOWN, not zero, when there is nothing to go on', async () => {
    const r = await parseResume(await docx([...HEAD, 'EXPERIENCE', 'Teaching Assistant', 'University of Washington', '- Taught labs.', 'EDUCATION', 'B.Sc Biology, University of Pune, 2018']), { asOf: AS_OF, ocr: 'never' })
    expect(r.derived.total_experience_basis).toBe('unknown')
    expect(r.derived.stated_experience_years).toBeNull()
  })
  it('computes from dates and cross-checks the stated figure', async () => {
    const r = await parseResume(await docx([...HEAD, 'SUMMARY', '10+ years of experience in sales.', 'EXPERIENCE', 'Sales Executive at Titan', 'Jan 2024 - Present', '- Sold.', 'EDUCATION', 'B.Com, Pune University, 2018']), { asOf: AS_OF, ocr: 'never' })
    expect(r.derived.total_experience_basis).toBe('dates')
    expect(r.derived.total_experience_months).toBe(34)
    expect(r.derived.flags).toContain('stated_vs_computed')
  })
})

describe('stale files', () => {
  const body = [...HEAD, 'EXPERIENCE', 'Sales Executive at Titan', 'Jan 2019 - Present', '- Sold.', 'EDUCATION', 'B.Com, Pune University, 2018']
  it('flags a Present in a file last saved years ago', async () => {
    const r = await parseResume(await docx(body, '2021-03-02'), { asOf: AS_OF, ocr: 'never' })
    expect(r.meta.document_date).toBe('2021-03-02')
    expect(r.derived.flags).toContain('stale_document')
  })
  it('does not flag a recently saved file', async () => {
    const r = await parseResume(await docx(body, '2026-08-01'), { asOf: AS_OF, ocr: 'never' })
    expect(r.derived.flags).not.toContain('stale_document')
  })
  it('does not flag a file with no saved date', async () => {
    const r = await parseResume(await docx(body), { asOf: AS_OF, ocr: 'never' })
    expect(r.meta.document_date).toBeNull()
    expect(r.derived.flags).not.toContain('stale_document')
  })
})
