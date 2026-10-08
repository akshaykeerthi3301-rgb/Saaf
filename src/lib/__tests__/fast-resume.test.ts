import { describe, it, expect } from 'vitest'
import { EMPTY_FAST, resumeFromAnswers, type FastAnswers } from '../fast-resume'
import { parseSections } from '../parse/sections'

const A: FastAnswers = { ...EMPTY_FAST, name: 'Priya Iyer', email: 'priya@example.com', phone: '98450 12345', city: 'Bengaluru', targetRole: 'Product Manager', years: '4', skills: 'SQL, Roadmapping, A/B testing, Figma', jobTitle: 'Associate PM', company: 'Paytm', dates: 'Jan 2021 – Present', achievements: '- Shipped UPI autopay\n• Cut churn 12%', school: 'IIM Bangalore', degree: 'MBA', gradYear: '2021' }
const text = (a: FastAnswers) => { const r = resumeFromAnswers(a); if (!r.ok) throw new Error(r.reason); return r.text }

describe('fast résumé', () => {
  it('uses only what was typed, under headings the parser reads', () => {
    const t = text(A)
    expect(t).toContain('Product Manager with 4 years of experience in SQL, Roadmapping, A/B testing.')
    expect(t).toContain('• Shipped UPI autopay')
    expect(t).toContain('• Cut churn 12%')
    const s = parseSections(t)
    expect(s.contact.email).toBe('priya@example.com')
    expect(s.experience[0]?.bullets).toEqual(['Shipped UPI autopay', 'Cut churn 12%'])
    expect(s.skills).toContain('SQL')
  })
  it('never invents an achievement: a missing one is a visible prompt, not a claim', () => {
    const t = text({ ...A, achievements: '' })
    expect(t).toContain('• [What did you do here')
  })
  it('never invents years: a number is used only if it looks like one', () => {
    expect(text({ ...A, years: 'lots' })).toContain('Product Manager in SQL')
    expect(text({ ...A, years: '1' })).toContain('1 year of experience')
  })
  it('asks for the two things it cannot do without', () => {
    expect(resumeFromAnswers({ ...A, name: '' })).toEqual({ ok: false, reason: expect.stringContaining('name') })
    expect(resumeFromAnswers({ ...A, jobTitle: '', targetRole: '' })).toEqual({ ok: false, reason: expect.stringContaining('role') })
  })
})
