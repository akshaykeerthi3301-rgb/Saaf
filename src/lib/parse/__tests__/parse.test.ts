import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractFields } from '../extract'
import { docxToText } from '../docx'
import { pdfToText } from '../pdf'

const fx = (n: string) => readFileSync(join(__dirname, 'fixtures', n))

describe('field extraction', () => {
  const text = `Rohan Sharma
Bengaluru, Karnataka, India

Systems Engineer at Infosys
Jun 2023 - Present

Java, Spring Boot, Oracle.`

  it('reads city, title and employer', () => {
    const { fields } = extractFields(text)
    expect(fields.city).toBe('Bengaluru')
    expect(fields.currentTitle).toBe('Systems Engineer')
    expect(fields.employer).toBe('Infosys')
  })

  it('infers years from a date range and warns that it did', () => {
    const { fields, warnings } = extractFields(text)
    expect(fields.yearsExperience).toBe(new Date().getFullYear() - 2023)
    expect(warnings.some((w) => /worked out your years/i.test(w))).toBe(true)
  })

  it('prefers an explicit statement over inferred dates', () => {
    const { fields, warnings } = extractFields('5 years of experience in backend. 2015 - Present.')
    expect(fields.yearsExperience).toBe(5)
    expect(warnings.some((w) => /worked out your years/i.test(w))).toBe(false)
  })

  it('reads a chartered accountant credential', () => {
    expect(extractFields('Qualified Chartered Accountant, ICAI 2024. Mumbai.').fields.credential).toBe('CA')
  })

  it('warns rather than guessing when the résumé says little', () => {
    const { fields, warnings } = extractFields('Curriculum Vitae')
    expect(fields.city).toBeUndefined()
    expect(fields.yearsExperience).toBeUndefined()
    expect(warnings.length).toBeGreaterThanOrEqual(3)
  })
})

describe('years-of-experience: employment dates only, not education', () => {
  const currentYear = new Date().getFullYear()

  it('derives years from Experience, ignoring an earlier Education date range', () => {
    const résumé = `Priya Iyer
Mumbai

Education
B.Com, University of Mumbai
2014 - 2017

Experience
Senior Associate at Deloitte
2019 - Present`
    const { fields } = extractFields(résumé)
    expect(fields.yearsExperience).toBe(currentYear - 2019)
  })

  it('ignores an Education date range that comes after Experience in the document', () => {
    const résumé = `Priya Iyer
Mumbai

Experience
Senior Associate at Deloitte
2019 - Present

Education
B.Com, University of Mumbai
2014 - 2017`
    const { fields } = extractFields(résumé)
    expect(fields.yearsExperience).toBe(currentYear - 2019)
  })

  it('still prefers an explicit statement over a misleading Education date', () => {
    const résumé = `Priya Iyer
Mumbai
5 years of experience in strategy consulting.

Education
B.Com, University of Mumbai
2010 - 2013`
    const { fields, warnings } = extractFields(résumé)
    expect(fields.yearsExperience).toBe(5)
    expect(warnings.some((w) => /worked out your years/i.test(w))).toBe(false)
  })

  it('still infers correctly for a résumé with no section headers at all', () => {
    // Regression guard for the original fixture shape — the current role sits
    // first with no "Experience" header above it.
    const résumé = `Rohan Sharma
Bengaluru

Systems Engineer at Infosys
2023 - Present`
    const { fields } = extractFields(résumé)
    expect(fields.yearsExperience).toBe(currentYear - 2023)
  })
})

describe('real file parsing', () => {
  it('reads a real .docx produced by a word processor', async () => {
    const text = await docxToText(fx('resume.docx'))
    expect(text).toMatch(/Rohan Sharma/)
    expect(text).toMatch(/Infosys/)
    const { fields } = extractFields(text)
    expect(fields.city).toBe('Bengaluru')
    expect(fields.employer).toBe('Infosys')
  })

  it('reads a real .pdf', async () => {
    const text = await pdfToText(fx('resume.pdf'))
    expect(text).toMatch(/Rohan Sharma/)
    expect(text).toMatch(/Infosys/)
    const { fields } = extractFields(text)
    expect(fields.city).toBe('Bengaluru')
  })
})
