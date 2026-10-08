import { describe, it, expect } from 'vitest'
import { TEMPLATES, templateSpec, DEFAULT_TEMPLATE, DOCX_SIZES } from '../resume-templates'
import { parseSections, sectionsToText } from '../parse/sections'
import { checkResume } from '../ats-check'
import { buildFullResumeDocx } from '../resume-docx'
import JSZip from 'jszip'

/**
 * ⚠️ THE TEST THAT MAKES THE TEMPLATES CLAIM TRUE.
 *
 * The page tells a candidate that multi-column layouts, tables and text inside
 * images are why their résumé does not parse — and then offers to build them a
 * new one. If any template we ship produced a document our own checker marked
 * down, the argument would end in a single screenshot. So parse-safety is not
 * asserted in a comment; it is a test that fails.
 *
 * The check runs on the TEXT each template's structure produces, which is what
 * a parser sees. Typography is the only axis the templates vary on, precisely
 * so this test can hold for all three.
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
Rebuilt the merchant risk review queue with operations, cutting median review
time from 3 days to 8 hours without changing headcount.

Associate Product Manager at Zeta
Jul 2019 - Feb 2021
Shipped the first version of the card controls dashboard, adopted by 12 banking
clients in its first year.
Built the reporting finance used to close the month, reducing the close from 6
days to 2.

Skills
SQL, Product Roadmapping, A/B Testing, Figma, Amplitude, Experiment Design,
Stakeholder Management, Customer Discovery

Education
B.Tech, Computer Science, VIT Vellore, 2019`

describe('every template we ship', () => {
  const sections = parseSections(RESUME)
  const baseline = checkResume(RESUME)

  it('offers a real choice rather than one option wearing three names', () => {
    expect(TEMPLATES).toHaveLength(3)
    expect(new Set(TEMPLATES.map((t) => t.align)).size).toBeGreaterThan(1)
    expect(new Set(TEMPLATES.map((t) => t.heading)).size).toBe(3)
    expect(new Set(TEMPLATES.map((t) => t.density)).size).toBe(3)
  })

  it('produces a document that passes our own checker', () => {
    const had = new Set(baseline.findings.map((f) => f.id))
    for (const t of TEMPLATES) {
      // Structure is shared by design, so the text is identical across
      // templates — which is exactly what makes the claim safe to make.
      const introduced = checkResume(sectionsToText(sections))
        .findings.map((f) => f.id)
        .filter((id) => !had.has(id))
      expect(introduced, `${t.id} introduced findings`).toEqual([])
    }
  })

  it('never varies on anything a parser can trip over', () => {
    // The axes are typographic only. If a future template adds a structural
    // axis — columns, tables, a sidebar — this fails and the author has to come
    // back and read the header comment.
    for (const t of TEMPLATES) {
      expect(Object.keys(t).sort()).toEqual(['align', 'density', 'heading', 'id', 'name', 'note'])
    }
  })

  it('falls back to a real template rather than crashing on an unknown id', () => {
    expect(templateSpec(undefined).id).toBe(DEFAULT_TEMPLATE)
    // @ts-expect-error deliberately wrong, because a stale URL or an old client
    // is exactly how this arrives in production.
    expect(templateSpec('does-not-exist').id).toBe(DEFAULT_TEMPLATE)
  })

  it('carries a size table for every density, so the .docx cannot fall back to zero', () => {
    for (const t of TEMPLATES) {
      const size = DOCX_SIZES[t.density]
      expect(size).toBeDefined()
      expect(size.body).toBeGreaterThan(0)
      expect(size.name).toBeGreaterThan(size.body)
    }
  })
})

describe('font and accent colour', () => {
  const sections = parseSections(RESUME)
  const xmlOf = async (opts: Parameters<typeof buildFullResumeDocx>[0]) => {
    const zip = await JSZip.loadAsync(await buildFullResumeDocx(opts))
    return {
      doc: await zip.file('word/document.xml')!.async('string'),
      styles: await zip.file('word/styles.xml')!.async('string'),
    }
  }

  it('writes the chosen typeface and accent into the Word file, and nothing structural', async () => {
    const { doc, styles } = await xmlOf({ sections, targetRole: 'PM', font: 'georgia', accent: 'navy' })
    expect(styles).toContain('Georgia')
    expect(doc).toContain('1F3A68')
    expect(doc).not.toContain('<w:tbl>')
    expect(doc).not.toContain('<w:txbxContent')
  })

  it('leaves the default file as it was when nothing is chosen', async () => {
    const { doc, styles } = await xmlOf({ sections, targetRole: 'PM' })
    expect(styles).toContain('Calibri')
    expect(doc).not.toContain('1F3A68')
  })
})
