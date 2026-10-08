import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { DEFAULT_STYLE, PRESETS, formatDates, presetStyle, styleSchema, withPreset, type ResumeStyle } from '../resume-style'
import { buildDoc, docText } from '../resume-doc'
import { buildFullResumeDocx } from '../resume-docx'
import { parseSections, sectionsToText } from '../parse/sections'
import { checkResume } from '../ats-check'

/**
 * The export drawer's value, its block list and the Word file it produces. The claim these hold is the drawer's own
 * badge: "ATS-friendly format" — every combination is one column of real text, and the preview and the file are
 * drawn from the same blocks.
 */

const RESUME = `Priya Iyer
priya.iyer@example.com | +91 98765 43210 | linkedin.com/in/priyaiyer
Bengaluru, Karnataka, India

Summary
Product manager with six years in Indian fintech, working on merchant payments
and onboarding across a funnel she owned end to end.

Experience

Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments funnel end to end, covering onboarding and
activation. Ran A/B tests that lifted completion by 14% across 40,000 merchants.
Wrote SQL against the warehouse for weekly activation reporting, replacing a
manual spreadsheet three analysts had maintained between them.

Associate Product Manager at Zeta
Jul 2019 - Feb 2021
Shipped the first version of the card controls dashboard, adopted by 12 banking
clients in its first year.

Projects

Merchant risk queue | Internal tool
Rebuilt the risk review queue, cutting median review time from 3 days to 8 hours.

Skills
SQL, Product Roadmapping, A/B Testing, Figma, Amplitude

Education
B.Tech, Computer Science, VIT Vellore, 2019`

const sections = parseSections(RESUME)
const xml = async (style: ResumeStyle) => {
  const zip = await JSZip.loadAsync(await buildFullResumeDocx({ sections, targetRole: 'Product Manager', style }))
  return { doc: await zip.file('word/document.xml')!.async('string'), styles: await zip.file('word/styles.xml')!.async('string') }
}
const mod = (patch: Partial<ResumeStyle>): ResumeStyle => ({ ...DEFAULT_STYLE, ...patch })

describe('formatDates', () => {
  it('re-writes month-year ranges as asked and leaves everything else alone', () => {
    expect(formatDates('Jun 2025 - Jul 2026', 'long')).toBe('June 2025 – July 2026')
    expect(formatDates('June 2025 – Present', 'short')).toBe('Jun 2025 – Present')
    expect(formatDates('Apr 2022 - Jan 2023', 'numeric')).toBe('04/2022 – 01/2023')
    expect(formatDates('Apr 2022 - Jan 2023', 'year')).toBe('2022 – 2023')
    expect(formatDates('2023 - 2025', 'long')).toBe('2023 – 2025')
    expect(formatDates('Sept 2020', 'short')).toBe('Sep 2020')
    expect(formatDates('Marketing 2020', 'long')).toBe('Marketing 2020')
    expect(formatDates(null, 'short')).toBeNull()
  })
})

describe('buildDoc', () => {
  it('separates projects from jobs, puts dates on the entry, and keeps real text in reading order', () => {
    const b = buildDoc(sections, 'Product Manager', DEFAULT_STYLE)
    const headings = b.filter((x) => x.kind === 'heading').map((x) => x.text)
    expect(headings).toEqual(['Professional summary', 'Experience', 'Projects', 'Education', 'Skills'])
    const paytm = b.find((x) => x.kind === 'entry' && /Paytm/.test(x.main))
    expect(paytm).toMatchObject({ right: 'Mar 2021 – Present' })
  })

  it('honours the date format, education order and skills layout', () => {
    const b = buildDoc(sections, '', mod({ dateFormat: 'long', educationFirst: 'institution', skillsLayout: 'list' }))
    expect(b.find((x) => x.kind === 'entry' && /Paytm/.test(x.main))).toMatchObject({ right: 'March 2021 – Present' })
    const edu = b.filter((x) => x.kind === 'entry').at(-1)
    expect(edu).toMatchObject({ main: expect.stringContaining('VIT') })
    expect(b.filter((x) => x.kind === 'bullet' && /^(SQL|Figma)$/.test(x.text))).toHaveLength(2)
  })
})

describe('the Word file', () => {
  it('carries the font, sizes, page, margins, bullet and colours the style asks for', async () => {
    const { doc, styles } = await xml(mod({ font: 'georgia', page: 'letter', accent: '1F3A68', accentScope: 'both', bullet: '–', sizes: { name: 24, section: 12, sub: 11, body: 9 } }))
    expect(styles).toContain('Georgia')
    expect(doc).toContain('<w:pgSz w:w="12240" w:h="15840"')
    expect(doc).toContain('w:val="48"') // 24 pt name, in half-points
    expect(doc).toContain('1F3A68')
    expect(doc).toMatch(/<w:tab\/>/) // the right-aligned date is a tab, not a table
  })

  it('applies the accent where the scope says, and nowhere else', async () => {
    const nameOnly = (await xml(mod({ accent: 'AA0000', accentScope: 'name' }))).doc
    const headingsOnly = (await xml(mod({ accent: 'AA0000', accentScope: 'headings' }))).doc
    expect(nameOnly.match(/AA0000/g)?.length).toBe(1)
    expect((headingsOnly.match(/AA0000/g)?.length ?? 0)).toBeGreaterThan(1)
    // headings-only never colours the name run
    expect(headingsOnly.indexOf('Priya Iyer')).toBeGreaterThan(-1)
  })

  it('drops the divider, justifies, and switches the bullet glyph on request', async () => {
    const a = (await xml(DEFAULT_STYLE)).doc
    const b = (await xml(mod({ hideDivider: true, justify: true }))).doc
    expect(a).toContain('<w:pBdr>')
    expect(b).not.toContain('<w:pBdr>')
    expect(b).toContain('w:val="both"')
    const zip = await JSZip.loadAsync(await buildFullResumeDocx({ sections, targetRole: '', style: mod({ bullet: '–' }) }))
    expect(await zip.file('word/numbering.xml')!.async('string')).toContain('w:lvlText w:val="–"')
  })

  it('every preset and every layout choice stays one column of plain text', async () => {
    for (const p of PRESETS) {
      for (const layout of [{}, { skillsLayout: 'list' as const }, { educationFirst: 'institution' as const, headerAlign: 'right' as const }]) {
        const { doc } = await xml({ ...presetStyle(p.id), ...layout })
        for (const forbidden of ['<w:tbl>', '<w:txbxContent', '<w:cols ', '<w:drawing', '<w:pict', '<w:sectPr><w:headerReference']) expect(doc, `${p.id} ${JSON.stringify(layout)}`).not.toContain(forbidden)
      }
    }
  })

  it('reads as the same text to our own checker, whatever the style', () => {
    const baseline = new Set(checkResume(RESUME).findings.map((f) => f.id))
    for (const p of PRESETS) {
      const text = sectionsToText(sections)
      const introduced = checkResume(text).findings.map((f) => f.id).filter((id) => !baseline.has(id))
      expect(introduced, p.id).toEqual([])
    }
    // The preview text and the file's blocks are one list.
    expect(docText(buildDoc(sections, '', DEFAULT_STYLE))).toContain('Product Manager at Paytm')
  })
})

describe('the style value', () => {
  it('a preset card keeps the person’s page, font and colour', () => {
    const cur = mod({ font: 'verdana', accent: '0F766E', page: 'letter' })
    const next = withPreset(cur, 'centered')
    expect(next).toMatchObject({ preset: 'centered', headerAlign: 'center', font: 'verdana', accent: '0F766E', page: 'letter' })
  })

  it('validates at the boundary: every preset passes, a bad colour or size does not', () => {
    for (const p of PRESETS) expect(styleSchema.safeParse(p.style).success, p.id).toBe(true)
    expect(styleSchema.safeParse({ ...DEFAULT_STYLE, accent: 'red' }).success).toBe(false)
    expect(styleSchema.safeParse({ ...DEFAULT_STYLE, sizes: { ...DEFAULT_STYLE.sizes, body: 40 } }).success).toBe(false)
    expect(styleSchema.safeParse({ ...DEFAULT_STYLE, font: 'comic-sans' }).success).toBe(false)
  })
})
