import { describe, it, expect } from 'vitest'
import { diffSections, estimatePages, fitToOnePage, tailoredFilename } from '../resume-review'
import type { ResumeSections } from '@/lib/parse/sections'

const doc = (over: Partial<ResumeSections> = {}): ResumeSections => ({
  contact: { name: 'Asha Rao', email: 'a@b.co', phone: null, links: [] },
  summary: 'Customer success lead with six years in SaaS.',
  experience: [
    { title: 'CSM', employer: 'Acme', dates: '2021–2024', location: null, bullets: ['Owned 40 accounts.', 'Cut churn by 12%.'] },
    { title: 'Associate', employer: 'Beta', dates: '2019–2021', location: null, bullets: ['Handled onboarding.'] },
  ],
  education: [{ qualification: 'B.Com', institution: 'Pune University', dates: '2019' }],
  skills: ['Excel', 'SQL', 'Zendesk'],
  other: [],
  unplaced: 0,
  order: [],
  ...over,
})

const withBullets = (n: number, len = 110): ResumeSections =>
  doc({ experience: Array.from({ length: 4 }, (_, i) => ({ title: `T${i}`, employer: `E${i}`, dates: 'd', location: null, bullets: Array.from({ length: n }, (_, j) => `${'x'.repeat(len)}${j}`) })) })

describe('diffSections — the change list IS the diff', () => {
  it('two identical documents have no changes', () => {
    expect(diffSections(doc(), doc())).toEqual([])
  })

  it('a rewritten bullet is one change, named by its role, with both sides', () => {
    const b = doc()
    b.experience[0] = { ...b.experience[0], bullets: ['Owned 40 accounts worth ₹6 Cr.', 'Cut churn by 12%.'] }
    expect(diffSections(doc(), b)).toEqual([
      { kind: 'bullet', where: 'CSM — Acme', before: 'Owned 40 accounts.', after: 'Owned 40 accounts worth ₹6 Cr.' },
    ])
  })

  it('a rewritten summary is one change', () => {
    const d = diffSections(doc(), doc({ summary: 'Customer success lead.' }))
    expect(d).toEqual([{ kind: 'summary', where: 'Summary', before: 'Customer success lead with six years in SaaS.', after: 'Customer success lead.' }])
  })

  it('a hand edit shows up exactly like an accepted suggestion — the list reads the document, not the AI log', () => {
    const a = doc()
    const b = doc()
    b.experience[1] = { ...b.experience[1], bullets: ['Handled onboarding for 30 clients.'] }
    expect(diffSections(a, b)).toHaveLength(1)
  })

  it('a dismissed suggestion is not a change (the line is back to the original)', () => {
    const a = doc()
    const b = doc()
    b.experience[0].bullets[0] = 'Something else.'
    b.experience[0].bullets[0] = a.experience[0].bullets[0]
    expect(diffSections(a, b)).toEqual([])
  })

  it('skills: a reorder is one change, called a reorder', () => {
    const d = diffSections(doc(), doc({ skills: ['Zendesk', 'SQL', 'Excel'] }))
    expect(d).toHaveLength(1)
    expect(d[0]).toMatchObject({ kind: 'skills', note: 'reordered', before: 'Excel, SQL, Zendesk', after: 'Zendesk, SQL, Excel' })
  })

  it('skills: terms added or removed are named, case-insensitively', () => {
    const d = diffSections(doc(), doc({ skills: ['excel', 'SQL', 'Salesforce'] }))
    expect(d[0].note).toBe('added Salesforce; removed Zendesk')
  })

  it('a bullet that exists on only one side is an addition or a removal', () => {
    const b = doc()
    b.experience[1].bullets.push('Trained new hires.')
    expect(diffSections(doc(), b)).toEqual([{ kind: 'bullet', where: 'Associate — Beta', before: null, after: 'Trained new hires.' }])
    const c = doc()
    c.experience[0].bullets.pop()
    expect(diffSections(doc(), c)).toEqual([{ kind: 'bullet', where: 'CSM — Acme', before: 'Cut churn by 12%.', after: null }])
  })

  it('counts every changed line once, however many sections move', () => {
    const b = doc({ summary: 'New.', skills: ['SQL'] })
    b.experience[0].bullets = ['A.', 'B.']
    expect(diffSections(doc(), b).map((c) => c.kind)).toEqual(['summary', 'bullet', 'bullet', 'skills'])
  })

  it('treats null and empty summary as the same', () => {
    expect(diffSections(doc({ summary: null }), doc({ summary: '' }))).toEqual([])
  })
})

describe('estimatePages', () => {
  it('a short résumé is well under a page', () => {
    expect(estimatePages(doc(), 'classic')).toBeLessThan(0.6)
  })
  it('more text is never fewer pages', () => {
    const a = estimatePages(withBullets(3), 'classic')
    const b = estimatePages(withBullets(6), 'classic')
    expect(b).toBeGreaterThan(a)
  })
  it('a tighter template is never more pages than a looser one', () => {
    const s = withBullets(5)
    expect(estimatePages(s, 'compact')).toBeLessThan(estimatePages(s, 'classic'))
    expect(estimatePages(s, 'classic')).toBeLessThan(estimatePages(s, 'headline'))
  })
  it('a very long résumé runs past one page in every template', () => {
    for (const t of ['compact', 'classic', 'headline'] as const) expect(estimatePages(withBullets(10), t)).toBeGreaterThan(1)
  })
})

describe('fitToOnePage', () => {
  it('keeps the template it was given when that already fits', () => {
    expect(fitToOnePage(doc(), 'classic')).toMatchObject({ template: 'classic', fits: true })
    expect(fitToOnePage(doc(), 'headline')).toMatchObject({ template: 'headline', fits: true })
  })
  it('tightens only as far as it must: the loosest template that fits', () => {
    // Find a size where classic does not fit but compact does.
    let n = 1
    while (estimatePages(withBullets(n), 'classic') <= 1) n++
    const s = withBullets(n)
    if (estimatePages(s, 'compact') <= 1) {
      expect(fitToOnePage(s, 'classic')).toMatchObject({ template: 'compact', fits: true })
    }
    expect(fitToOnePage(s, 'classic').pages).toBeLessThanOrEqual(estimatePages(s, 'classic'))
  })
  it('never loosens: asked to fit a page from Compact, the answer is Compact', () => {
    expect(fitToOnePage(withBullets(10), 'compact').template).toBe('compact')
  })
  it('says it does NOT fit when even Compact runs over, rather than claiming success', () => {
    const r = fitToOnePage(withBullets(12), 'headline')
    expect(r.template).toBe('compact')
    expect(r.fits).toBe(false)
    expect(r.pages).toBeGreaterThan(1)
  })
})

describe('tailoredFilename', () => {
  it('name, role and company, safe to attach', () => {
    expect(tailoredFilename({ name: 'Asha Rao', role: 'Customer Success Manager', company: 'Diligent' })).toBe('Asha_Rao_Customer_Success_Manager_Diligent.docx')
  })
  it('drops punctuation, accents and slashes', () => {
    expect(tailoredFilename({ name: 'Zoë O’Neil', role: 'Sr. PM / Growth', company: 'Acme, Inc.' })).toBe('Zoe_O_Neil_Sr_PM_Growth_Acme_Inc.docx')
  })
  it('leaves out what it was not given', () => {
    expect(tailoredFilename({ name: 'Asha Rao', role: 'Analyst' })).toBe('Asha_Rao_Analyst.docx')
    expect(tailoredFilename({ company: 'Acme' })).toBe('Acme.docx')
  })
  it('falls back to Resume and always has an extension', () => {
    expect(tailoredFilename({})).toBe('Resume.docx')
    expect(tailoredFilename({ name: '', role: null, company: undefined }, 'pdf')).toBe('Resume.pdf')
  })
  it('is capped at 80 characters before the extension and never ends in an underscore', () => {
    const f = tailoredFilename({ name: 'Asha Rao', role: 'x'.repeat(200), company: 'Acme' })
    expect(f.replace('.docx', '').length).toBeLessThanOrEqual(80)
    expect(f).not.toMatch(/_\.docx$/)
  })
  it('contains nothing a filesystem or an email client would escape', () => {
    expect(tailoredFilename({ name: 'A/B\\C:D*E?F"G<H>I|J', role: '../../etc', company: ' ' })).toMatch(/^[A-Za-z0-9_]+\.docx$/)
  })
})
