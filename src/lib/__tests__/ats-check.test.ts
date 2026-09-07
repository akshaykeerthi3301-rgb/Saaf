import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkResume, AtsCheckError, MIN_RESUME_CHARS } from '../ats-check'

/**
 * TASK-061 — the ATS checker, proved against documents with known defects.
 *
 * The roadmap's own verification line is "a checker run against a known-bad
 * résumé (missing sections, image-based text) surfaces the specific defect",
 * so the fixtures below are built defect-first: each one carries exactly the
 * fault its test names.
 */

const CLEAN = `Priya Iyer
priya.iyer@example.com | +91 98765 43210
Bengaluru, Karnataka, India

Experience

Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments funnel. Ran A/B tests on the onboarding flow.
Wrote SQL against the warehouse for weekly activation reporting.

Associate Product Manager at Zeta
Jul 2019 - Feb 2021
Shipped the first version of the card controls dashboard.

Skills
SQL, Product Roadmapping, A/B Testing, Figma, Amplitude

Education
B.Tech, Computer Science, VIT Vellore, 2019`

const ids = (t: string) => checkResume(t).findings.map((f) => f.id)

describe('a clean résumé', () => {
  it('raises no high-severity finding', () => {
    const r = checkResume(CLEAN)
    expect(r.findings.filter((f) => f.severity === 'high')).toEqual([])
  })

  it('scores well and shows the arithmetic', () => {
    const r = checkResume(CLEAN)
    expect(r.readability.score).toBeGreaterThanOrEqual(90)
    const total = r.readability.deductions.reduce((s, d) => s + d.points, 0)
    expect(r.readability.score).toBe(100 - total)
  })

  it('demonstrates what a parser got, rather than asserting it', () => {
    const r = checkResume(CLEAN)
    expect(r.read.currentTitle).toBe('Product Manager')
    expect(r.read.employer).toBe('Paytm')
    expect(r.read.city).toBe('Bengaluru')
  })
})

describe('parsing defects', () => {
  it('flags missing section headings', () => {
    const noSections = CLEAN.replace(/\nExperience\n/, '\n').replace(/\nSkills\n/, '\n').replace(/\nEducation\n/, '\n')
    expect(ids(noSections)).toContain('missing-sections')
  })

  it('flags a two-column layout from interleaved whitespace', () => {
    const twoCol = [
      'Priya Iyer                              priya.iyer@example.com',
      'Product Manager                         Mar 2021 - Present',
      'Paytm                                   Bengaluru, India',
      'Owned the merchant payments funnel      SQL, Figma, Amplitude',
      'Ran A/B tests on onboarding             Product Roadmapping',
      'Associate Product Manager               Jul 2019 - Feb 2021',
      'Zeta                                    Bengaluru, India',
      'Shipped the card controls dashboard     A/B Testing, SQL',
    ].join('\n')
    const r = checkResume(twoCol)
    const finding = r.findings.find((x) => x.id === 'multi-column')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    // Checkable: it must quote the candidate's own line back.
    expect(finding!.evidence).toBeTruthy()
    expect(twoCol).toContain(finding!.evidence!.slice(0, 30))
  })

  it('flags a document that extracts as one unbroken block', () => {
    const blob = CLEAN.replace(/\n+/g, ' ')
    expect(ids(blob)).toContain('single-blob')
  })

  it('flags a missing email and a missing phone', () => {
    const noContact = CLEAN.replace('priya.iyer@example.com | +91 98765 43210', 'Contact on request')
    const found = ids(noContact)
    expect(found).toContain('no-email')
    expect(found).toContain('no-phone')
  })

  it('flags dates a parser cannot read', () => {
    const noDates = CLEAN.replace('Mar 2021 - Present', '3 yrs').replace('Jul 2019 - Feb 2021', '2 yrs')
    expect(ids(noDates)).toContain('no-dates')
  })

  it('flags a separator-built role line, which the parser answers WRONGLY rather than failing on', () => {
    // ⚠️ THE REGRESSION THIS PINS. The first version of this test asserted
    // 'title-unreadable' here, assuming a parser that cannot read a line
    // returns nothing. It does not: against this input extractFields()
    // returned currentTitle "PRODUCT" and employer "ZETA" — a fragment of one
    // role and a fragment of another, with no error. A confident wrong answer
    // is invisible to the candidate, because their screen shows a title.
    const sep = CLEAN.replace('Product Manager at Paytm', 'PRODUCT | PAYTM | LEADERSHIP')
      .replace('Associate Product Manager at Zeta', 'PRODUCT | ZETA')
    const finding = checkResume(sep).findings.find((x) => x.id === 'separator-header')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toContain('|')
  })

  it('flags a title no parser could find at all', () => {
    const noTitle = CLEAN.replace('Product Manager at Paytm', 'Paytm')
      .replace('Associate Product Manager at Zeta', 'Zeta')
    expect(ids(noTitle)).toContain('title-unreadable')
  })
})

describe('keyword defects', () => {
  it('flags a long comma-separated keyword dump', () => {
    const skills = Array.from({ length: 22 }, (_, i) => `Skill${i}`).join(', ')
    const r = checkResume(CLEAN.replace('SQL, Product Roadmapping, A/B Testing, Figma, Amplitude', skills))
    const finding = r.findings.find((x) => x.id === 'keyword-dump')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toBeTruthy()
  })

  it('flags one term repeated far past describing the work', () => {
    const stuffed = CLEAN + '\n' + 'Kubernetes '.repeat(30)
    const finding = checkResume(stuffed).findings.find((x) => x.id === 'repeated-term')
    expect(finding).toBeDefined()
    expect(finding!.title).toMatch(/kubernetes/i)
  })

  it('does not flag ordinary prose as stuffing', () => {
    expect(ids(CLEAN)).not.toContain('repeated-term')
    expect(ids(CLEAN)).not.toContain('keyword-dump')
  })
})

describe('consistency defects', () => {
  it('flags two roles both marked ongoing', () => {
    const overlap = CLEAN.replace('Jul 2019 - Feb 2021', 'Jul 2019 - Present')
    expect(ids(overlap)).toContain('overlapping-present')
  })

  it('flags a summary whose years disagree with the dates', () => {
    const claim = CLEAN.replace('Experience\n', 'Experience\n\n12 years of experience in product.\n')
    const finding = checkResume(claim).findings.find((x) => x.id === 'years-disagree')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toMatch(/12/)
  })

  it('flags a future-dated entry', () => {
    const future = CLEAN.replace('Mar 2021 - Present', `Mar ${new Date().getFullYear() + 3} - Present`)
    expect(ids(future)).toContain('future-date')
  })

  it('does not accuse the candidate of anything', () => {
    // ⚠️ THE PRODUCT RULE, PINNED. These findings describe what a parser does,
    // never what kind of person wrote the document. A formatting artefact
    // written as dishonesty is the worst failure this tool could have.
    const overlap = CLEAN.replace('Jul 2019 - Feb 2021', 'Jul 2019 - Present')
    const claim = CLEAN.replace('Experience\n', 'Experience\n\n12 years of experience in product.\n')
    const accusatory = /\b(lie|lying|lied|dishonest|false|fake|inflat|exaggerat|misleading|fraud)/i
    for (const text of [overlap, claim]) {
      for (const f of checkResume(text).findings) {
        expect(`${f.title} ${f.detail} ${f.fix}`).not.toMatch(accusatory)
      }
    }
  })
})

describe('every finding is actionable and checkable', () => {
  it('carries a title, a mechanical reason and a concrete fix', () => {
    const messy = [
      'Priya Iyer                          Bengaluru',
      'PRODUCT | PAYTM                     no dates here',
      'PRODUCT | ZETA                      none here either',
      'A very long line of text that exists only to give the checker enough',
      'substantial lines to work with when it measures column-ness properly.',
      'Another substantial line so the ratio has a real denominator to divide.',
    ].join('\n')
    const r = checkResume(messy)
    expect(r.findings.length).toBeGreaterThan(0)
    for (const f of r.findings) {
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.detail.length).toBeGreaterThan(20)
      expect(f.fix.length).toBeGreaterThan(10)
      expect(['parsing', 'keywords', 'consistency']).toContain(f.area)
      expect(['high', 'medium', 'low']).toContain(f.severity)
    }
  })

  it('never returns a score it cannot itemise', () => {
    const messy = CLEAN.replace(/\nExperience\n/, '\n').replace('Mar 2021 - Present', '3 yrs')
    const r = checkResume(messy)
    expect(r.readability.deductions.length).toBe(r.findings.length)
    expect(r.readability.score).toBe(
      Math.max(0, 100 - r.readability.deductions.reduce((s, d) => s + d.points, 0))
    )
  })
})

describe('bounds and purity', () => {
  it('refuses input too short to assess', () => {
    expect(() => checkResume('too short')).toThrow(AtsCheckError)
    expect(() => checkResume('x'.repeat(MIN_RESUME_CHARS - 1))).toThrow(AtsCheckError)
  })

  it('reaches no database and calls no model', () => {
    const source = readFileSync(join(__dirname, '..', 'ats-check.ts'), 'utf8')
    expect(source).not.toMatch(/supabase/i)
    expect(source).not.toMatch(/\.from\(['"`]/)
    // Deterministic by construction: no provider, no fetch, no key.
    expect(source).not.toMatch(/readResumeWithModel|GROQ|GEMINI|fetch\(/)
  })

  it('is deterministic — the same input gives the same report', () => {
    const a = checkResume(CLEAN)
    const b = checkResume(CLEAN)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
