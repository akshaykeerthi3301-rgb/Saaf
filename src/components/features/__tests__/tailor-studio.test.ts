// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * The tailor review (TASK-159), driven the way a candidate drives it: tailor,
 * accept, edit, switch style, fit to a page, export. The server actions are
 * mocked at their boundary; everything on screen is the real component.
 *
 * Added because the founder's account has no saved résumé, so the screen could
 * not be walked in a browser — a component test is the next best proof, and is
 * labelled as that in ROADMAP rather than as a browser walk.
 */
const mocks = vi.hoisted(() => ({
  tailorSavedResume: vi.fn(),
  scoreDraft: vi.fn(),
  downloadOptimisedResume: vi.fn(),
  saveResumeToAccount: vi.fn(),
}))
vi.mock('@/app/actions/tailor-studio', () => ({ tailorSavedResume: mocks.tailorSavedResume, scoreDraft: mocks.scoreDraft }))
vi.mock('@/app/actions/resume-download', () => ({ downloadOptimisedResume: mocks.downloadOptimisedResume }))
vi.mock('@/app/actions/resume-documents', () => ({ saveResumeToAccount: mocks.saveResumeToAccount }))

const { TailorStudio } = await import('../tailor-studio')

const original: ResumeSections = {
  contact: { name: 'Asha Rao', email: 'a@b.co', phone: null, links: [] },
  summary: 'Customer success lead with six years in SaaS.',
  experience: [
    { title: 'CSM', employer: 'Acme', dates: '2021–2024', location: null, bullets: ['Owned 40 accounts.', 'Cut churn by 12%.'] },
  ],
  education: [{ qualification: 'B.Com', institution: 'Pune University', dates: '2019' }],
  skills: ['Excel', 'SQL'],
  other: [], unplaced: 0, order: [],
}
const rewrittenDoc: ResumeSections = {
  ...original,
  experience: [{ ...original.experience[0], bullets: ['Owned 40 accounts worth ₹6 Cr.', 'Cut churn by 12%.'] }],
}
const okResult = {
  ok: true as const,
  sections: rewrittenDoc,
  changes: [{ entry: 0, original: 'Owned 40 accounts.', rewritten: 'Owned 40 accounts worth ₹6 Cr.', kept: true }],
  reverted: [],
  skillsReordered: false,
  providerLabel: 'Groq',
  keywords: [],
  scores: { before: 60, after: 72 },
}

let host: HTMLDivElement
let root: Root

const flush = async () => { await act(async () => { await Promise.resolve() }) }
const text = () => host.textContent ?? ''
const button = (label: RegExp) => [...host.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }); await flush() }

async function mount() {
  await act(async () => {
    root.render(createElement(TailorStudio, {
      roleId: '00000000-0000-4000-8000-000000000001', resumeId: '00000000-0000-4000-8000-000000000002',
      resumeLabel: 'My résumé', original, roleTitle: 'Customer Success Manager', company: 'Diligent',
    }))
  })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.tailorSavedResume.mockResolvedValue(okResult)
  mocks.scoreDraft.mockResolvedValue({ ok: true, score: 70 })
  mocks.downloadOptimisedResume.mockResolvedValue({ ok: true, filename: 'x.docx', base64: 'AA==' })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  host.remove()
  vi.useRealTimers()
})

describe('before the model runs', () => {
  it('shows no score strip, change list or style bar until there is a tailored draft', async () => {
    await mount()
    expect(text()).toContain('Tailor my résumé for this role')
    expect(text()).not.toContain('Your draft now')
    expect(text()).not.toContain('Fit to one page')
  })
})

describe('after tailoring', () => {
  async function tailored() {
    await mount()
    await click(button(/Tailor my résumé/))
  }

  it('shows the saved résumé\'s score, the draft\'s score (equal while nothing is changed) and what accepting everything would give', async () => {
    await tailored()
    expect(mocks.tailorSavedResume).toHaveBeenCalledTimes(1)
    const strip = host.querySelector('[aria-label="Score for this posting"]')!.textContent!
    expect(strip).toContain('Saved résumé60')
    expect(strip).toContain('Your draft now60')
    expect(strip).toContain('If you accept everything72')
    expect(mocks.scoreDraft).not.toHaveBeenCalled() // identical to the saved résumé: no call
    expect(text()).toContain('No changes yet')
  })

  it('accepting a suggestion changes the draft, asks for its score after a pause, and says how far it moved', async () => {
    await tailored()
    await click(button(/Accept all AI suggestions/))
    expect(mocks.scoreDraft).not.toHaveBeenCalled() // debounced
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    await flush()
    expect(mocks.scoreDraft).toHaveBeenCalledTimes(1)
    const sent = mocks.scoreDraft.mock.calls[0][0]
    expect(sent.roleId).toBe('00000000-0000-4000-8000-000000000001')
    expect(sent.sections.experience[0].bullets[0]).toBe('Owned 40 accounts worth ₹6 Cr.')
    const strip = host.querySelector('[aria-label="Score for this posting"]')!.textContent!
    expect(strip).toContain('Your draft now70')
    expect(strip).toContain('10 points above the saved résumé')
  })

  it('the change list is the diff: one change after accepting, none after undoing it', async () => {
    await tailored()
    await click(button(/Accept all AI suggestions/))
    expect(text()).toContain('1 change from your saved résumé')
    const listed = host.querySelector('details ul')!.textContent!
    expect(listed).toContain('CSM — Acme')
    expect(listed).toContain('Owned 40 accounts.')
    expect(listed).toContain('Owned 40 accounts worth ₹6 Cr.')
    await click(host.querySelector('button[aria-label="Undo this rewrite"]')!)
    expect(text()).toContain('No changes yet')
  })

  it('a hand edit appears in the list too — it reads the document, not the AI log', async () => {
    await tailored()
    // Dismiss the suggestion, then edit the first line by hand.
    await click(button(/Keep mine/))
    await click(host.querySelector('button[aria-label="Edit this line"]')!)
    const area = host.querySelector('textarea')!
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      set.call(area, 'Owned 45 accounts.')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(button(/^Done$/))
    expect(text()).toContain('1 change from your saved résumé')
    expect(host.querySelector('details ul')!.textContent).toContain('Owned 45 accounts.')
  })

  it('a slow score for an older draft never overwrites the newer one', async () => {
    await tailored()
    let release!: (v: unknown) => void
    mocks.scoreDraft.mockReturnValueOnce(new Promise((r) => { release = r }))
    await click(button(/Accept all AI suggestions/))
    await act(async () => { await vi.advanceTimersByTimeAsync(800) }) // first request in flight, held
    await click(host.querySelector('button[aria-label="Undo this rewrite"]')!) // back to the saved résumé
    await act(async () => { release({ ok: true, score: 99 }) })
    await flush()
    const strip = host.querySelector('[aria-label="Score for this posting"]')!.textContent!
    expect(strip).toContain('Your draft now60') // not 99
  })

  it('offers the three styles, says how many pages, and names the file for the person, role and company', async () => {
    await tailored()
    const bar = host.querySelector('[aria-label="Style and page length"]')!
    const names = [...bar.querySelectorAll('button')].map((b) => b.textContent)
    expect(names).toEqual(['Classic', 'Compact', 'Headline'])
    expect(bar.textContent).toMatch(/About 0\.\d pages? in Classic \(estimated\)/)
    expect(bar.textContent).toContain('Asha_Rao_Customer_Success_Manager_Diligent.docx')
    await click([...bar.querySelectorAll('button')].find((b) => b.textContent === 'Compact')!)
    expect(host.querySelector('[aria-label="Style and page length"]')!.textContent).toMatch(/in Compact \(estimated\)/)
  })

  it('"Fit to one page" says it fits when it does, and keeps the style it was given', async () => {
    await tailored()
    await click(host.querySelector('[aria-label="Style and page length"] input[type="checkbox"]')!)
    expect(host.querySelector('[aria-label="Style and page length"]')!.textContent).toMatch(/Fits one page in Classic \(estimated, about 0\.\d\)\./)
  })

  it('"Fit to one page" says it does NOT fit rather than claiming success, when even Compact runs over', async () => {
    const long: ResumeSections = {
      ...original,
      experience: Array.from({ length: 6 }, (_, i) => ({ title: `Role ${i}`, employer: `Employer ${i}`, dates: 'd', location: null, bullets: Array.from({ length: 12 }, (_, j) => `${'achieved a measurable result '.repeat(5)}${i}${j}`) })),
    }
    mocks.tailorSavedResume.mockResolvedValue({ ...okResult, sections: long, changes: [] })
    await act(async () => {
      root.render(createElement(TailorStudio, {
        roleId: 'r', resumeId: 's', resumeLabel: 'L', original: long, roleTitle: 'CSM', company: 'Diligent',
      }))
    })
    await click(button(/Tailor my résumé/))
    await click(host.querySelector('[aria-label="Style and page length"] input[type="checkbox"]')!)
    const note = host.querySelector('[aria-label="Style and page length"]')!.textContent!
    expect(note).toMatch(/Still about \d\.\d pages in Compact/)
    expect(note).not.toContain('Fits one page')
  })

  it('Export Word sends the chosen style and the company, so the file is named for all three', async () => {
    await tailored()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const bar = host.querySelector('[aria-label="Style and page length"]')!
    await click([...bar.querySelectorAll('button')].find((b) => b.textContent === 'Headline')!)
    await click(button(/Export Word/))
    expect(mocks.downloadOptimisedResume).toHaveBeenCalledTimes(1)
    expect(mocks.downloadOptimisedResume.mock.calls[0][0]).toMatchObject({ template: 'headline', company: 'Diligent', targetRole: 'Customer Success Manager' })
  })

  it('Export PDF names the print by the same file name, then restores the page title', async () => {
    await tailored()
    document.title = 'Resume Tailoring Studio — Jobinko'
    let titleWhilePrinting = ''
    window.print = vi.fn(() => { titleWhilePrinting = document.title })
    await click(button(/Export PDF/))
    expect(titleWhilePrinting).toBe('Asha_Rao_Customer_Success_Manager_Diligent')
    window.dispatchEvent(new Event('afterprint'))
    expect(document.title).toBe('Resume Tailoring Studio — Jobinko')
  })
})
