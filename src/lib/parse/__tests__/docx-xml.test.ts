import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { docxToLines, NotAWordFileError } from '../docx-xml'

/** A minimal but valid .docx built from raw XML, so every shape Word produces can be reproduced exactly. */
async function docx(body: string, extra: Record<string, string> = {}): Promise<Buffer> {
  const z = new JSZip()
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml"><w:body>${body}</w:body></w:document>`)
  for (const [n, x] of Object.entries(extra)) z.file(n, `<?xml version="1.0"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:r><w:t>${x}</w:t></w:r></w:p></w:hdr>`)
  return z.generateAsync({ type: 'nodebuffer' })
}
const p = (t: string, numbered = false) => `<w:p>${numbered ? '<w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>' : ''}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
const cell = (...ps: string[]) => `<w:tc>${ps.join('')}</w:tc>`

describe('docxToLines', () => {
  it('reads paragraphs in order and marks list items as bullets', async () => {
    const lines = await docxToLines(await docx(p('Priya Iyer') + p('Led the rollout', true)))
    expect(lines).toEqual(['Priya Iyer', '• Led the rollout'])
  })

  it('reads a text box ONCE although Word stores it twice (Choice + Fallback)', async () => {
    const box = `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wps:wsp><wps:txbx><w:txbxContent>${p('SKILLS')}${p('SQL, Figma')}</w:txbxContent></wps:txbx></wps:wsp></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent>${p('SKILLS')}${p('SQL, Figma')}</w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r></w:p>`
    const lines = await docxToLines(await docx(box + p('EXPERIENCE') + p('Product Manager at Zeta')))
    expect(lines.filter((l) => l === 'SQL, Figma')).toHaveLength(1)
    expect(lines).toContain('EXPERIENCE')
  })

  it('treats a one-row, two-cell table as columns: whole cells, left to right', async () => {
    const t = `<w:tbl><w:tr>${cell(p('CONTACT'), p('a@b.co'), p('SKILLS'), p('SQL'))}${cell(p('EXPERIENCE'), p('Role at Co'), p('Jan 2020 – Present'))}</w:tr></w:tbl>`
    expect(await docxToLines(await docx(t))).toEqual(['CONTACT', 'a@b.co', 'SKILLS', 'SQL', 'EXPERIENCE', 'Role at Co', 'Jan 2020 – Present'])
  })

  it('treats a many-row table as records: one tab-joined line per row', async () => {
    const t = `<w:tbl><w:tr>${cell(p('ICICI Bank'))}${cell(p('Jun 2025 – Present'))}</w:tr><w:tr>${cell(p('Amazon'))}${cell(p('Apr 2022 – Jan 2023'))}</w:tr></w:tbl>`
    expect(await docxToLines(await docx(t))).toEqual(['ICICI Bank\tJun 2025 – Present', 'Amazon\tApr 2022 – Jan 2023'])
  })

  it('skips text formatted as hidden', async () => {
    const hidden = '<w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t>kubernetes terraform</w:t></w:r><w:r><w:t>Visible</w:t></w:r></w:p>'
    expect(await docxToLines(await docx(hidden))).toEqual(['Visible'])
  })

  it('includes headers once and drops bare page numbers from footers', async () => {
    const lines = await docxToLines(await docx(p('Body'), { 'word/header1.xml': 'Priya Iyer | +91 98450 12345', 'word/header2.xml': 'Priya Iyer | +91 98450 12345', 'word/footer1.xml': '2' }))
    expect(lines).toEqual(['Priya Iyer | +91 98450 12345', 'Body'])
  })

  it('refuses a file that is not Word, with a typed error', async () => {
    await expect(docxToLines(Buffer.from('%PDF-1.4 not a zip'))).rejects.toBeInstanceOf(NotAWordFileError)
    const z = new JSZip(); z.file('hello.txt', 'x')
    await expect(docxToLines(await z.generateAsync({ type: 'nodebuffer' }))).rejects.toBeInstanceOf(NotAWordFileError)
  })
})
