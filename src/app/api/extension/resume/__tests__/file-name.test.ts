import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/extension-session', () => ({ json: vi.fn(), refuse: vi.fn(), requireExtensionUser: vi.fn() }))
vi.mock('@/lib/services/resume-documents', () => ({ getResume: vi.fn() }))
vi.mock('@/lib/services/profile-cards', () => ({ readPrimaryResume: vi.fn() }))
const { fileName } = await import('../route')

describe('the résumé file name an employer sees', () => {
  it('is the person, plainly — no brand', () => {
    expect(fileName('Akshay Keerthi', 'AKSHAY KEERTHI AI Account Manager')).toBe('Akshay-Keerthi-Resume.docx')
  })
  it('carries the company for a tailored résumé, so the two files differ', () => {
    expect(fileName('Akshay Keerthi', 'Tailored — Customer Success Manager at Acme Robotics')).toBe('Akshay-Keerthi-Resume-Acme-Robotics.docx')
  })
  it('never puts a non-Latin name in the header — it falls back to a plain name', () => {
    expect(fileName('अक्षय कीर्ति', 'Tailored — Analyst at Acme')).toBe('Resume-Resume-Acme.docx')
    expect(fileName('José Núñez', 'x')).toBe('Jose-Nunez-Resume.docx')
  })
  it('falls back to the role when the label names no company, and to the label when there is no name', () => {
    expect(fileName('Priya Iyer', 'Tailored — Product Manager')).toBe('Priya-Iyer-Resume-Product-Manager.docx')
    expect(fileName(null, 'My résumé')).toBe('My-resume-Resume.docx')
    expect(fileName(null, 'Tailored — Analyst at Acme')).toBe('Resume-Resume-Acme.docx')
  })
})
