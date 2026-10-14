import { describe, expect, it } from 'vitest'
import { compareReads, engineFields, engineMode, engineWarnings, overlay, shadowLogLine } from '../engine-bridge'
import type { ParsedResume } from '@/lib/types/parsed-resume'

const base = (over: Partial<ParsedResume['derived']> = {}, meta: Partial<ParsedResume['meta']> = {}): ParsedResume =>
  ({
    schema_version: 1,
    meta: { parser_version: 'x', text_source: 'pdf_text', pages: 1, layout_columns: 1, ocr_used: false, ocr_confidence: null, model_used: false, chars: 500, document_date: null, warnings: [], ...meta },
    contact: { name: null, email: null, phone: null, links: [], city: 'Pune' },
    summary: null, experience: [], internships: [], projects: [], education: [], skills: [], certifications: [],
    derived: { as_of: '2026-10-14', current_role: null, latest_role: { title: 'Product Manager', employer: 'Zeta', source: 'dates' }, total_experience_basis: 'dates', stated_experience_years: null, total_experience_months: 34, total_experience_years: 2.8, total_experience_months_low: 34, total_experience_months_high: 34, internship_months: 0, gaps: [], flags: [], ...over },
  }) as ParsedResume

describe('engineMode', () => {
  it('defaults to shadow; only two exact words change it', () => {
    expect(engineMode(undefined)).toBe('shadow')
    expect(engineMode('')).toBe('shadow')
    expect(engineMode('PRIMARY')).toBe('shadow') // a typo must never silently promote the engine
    expect(engineMode('primary')).toBe('primary')
    expect(engineMode('off')).toBe('off')
  })
})

describe('engineFields', () => {
  it('never turns "unknown" into 0 years', () => {
    expect(engineFields(base({ total_experience_basis: 'unknown', total_experience_months: 0, total_experience_years: 0 })).yearsExperience).toBeUndefined()
    expect(engineFields(base()).yearsExperience).toBe(2.8)
  })
})

describe('overlay', () => {
  it('engine wins where it found a value; the old reader stands elsewhere', () => {
    const merged = overlay({ currentTitle: 'Manager', employer: 'Old Co', yearsExperience: 9, city: 'Delhi', skills: ['SQL'] }, base({ latest_role: { title: 'Product Manager', employer: null, source: 'dates' } }))
    expect(merged).toMatchObject({ currentTitle: 'Product Manager', employer: 'Old Co', yearsExperience: 2.8, city: 'Pune', skills: ['SQL'] })
  })
})

describe('compareReads / shadowLogLine', () => {
  it('judges within a year as agreement, and logs verdicts without any résumé text', () => {
    const p = base()
    const v = compareReads({ currentTitle: 'product manager', employer: 'Other', yearsExperience: 3 }, p)
    expect(v).toMatchObject({ title: 'same', employer: 'differ', years: 'same', city: 'only_new' })
    const line = shadowLogLine({ currentTitle: 'Secret Title', employer: 'Secret Employer' }, p, 12)
    expect(line).not.toMatch(/Secret|Zeta|Pune/)
    expect(JSON.parse(line)).toMatchObject({ event: 'resume_engine_shadow', ms: 12 })
  })
})

describe('engineWarnings', () => {
  it('speaks plainly about scans, stated years and stale files', () => {
    const w = engineWarnings(base({ total_experience_basis: 'stated', flags: ['stale_document'] }, { ocr_used: true, document_date: '2021-03-02' })).join(' ')
    expect(w).toMatch(/text recognition/)
    expect(w).toMatch(/sentence on your résumé/)
    expect(w).toMatch(/2021-03-02/)
  })
})
