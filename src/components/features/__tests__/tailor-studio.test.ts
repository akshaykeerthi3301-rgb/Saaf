// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * The result of "Customize your résumé" (the reference's step 3), driven the way a candidate drives it: the rewrite
 * is applied at once, the page shows what changed, they undo and edit lines, ask the AI for a change, restyle, fit to
 * a page and download. The server actions are mocked at their boundary; everything on screen is the real component.
 */
const mocks = vi.hoisted(() => ({
  tailorSavedResume: vi.fn(),
  scoreDraft: vi.fn(),
  rewriteStudioLine: vi.fn(),
  rewriteStudioLines: vi.fn(),
  downloadOptimisedResume: vi.fn(),
  saveResumeToAccount: vi.fn(),
}))
vi.mock('@/app/actions/tailor-studio', () => ({
  tailorSavedResume: mocks.tailorSavedResume, scoreDraft: mocks.scoreDraft,
  rewriteStudioLine: mocks.rewriteStudioLine, rewriteStudioLines: mocks.rewriteStudioLines,
}))
vi.mock('@/app/actions/resume-download', () => ({ downloadOptimisedResume: mocks.downloadOptimisedResume }))
vi.mock('@/app/actions/resume-documents', () => ({ saveResumeToAccount: mocks.saveResumeToAccount }))

const { TailorStudio } = await import('../tailor-studio')

const original: ResumeSections = {
  contact: { name: 'Asha Rao', email: 'a@b.co', phone: null, links: [] },
  summary: 'Customer success lead with six years in SaaS, working across onboarding and renewals.',
  experience: [
    { title: 'CSM', employer: 'Acme', dates: '2021–2024', location: null, bullets: ['Owned 40 accounts.', 'Cut churn by 12%.'] },
  ],
  education: [{ qualification: 'B.Com', institution: 'Pune University', dates: '2019' }],
  skills: ['Excel', 'SQL', 'Salesforce', 'Zendesk', 'Jira'],
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
  keywords: ['Excel', 'SQL'],
  scores: { before: 60, after: 72 },
}

let host: HTMLDivElement
let root: Root

const flush = async () => { await act(async () => { await Promise.resolve() }) }
const text = () => host.textContent ?? ''
const everything = () => document.body
const button = (label: RegExp, scope: ParentNode = host) => [...scope.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }); await flush() }
const type = async (el: Element, value: string) => {
  await act(async () => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}
const tab = (name: RegExp) => [...host.querySelectorAll('[role="tab"]')].find((t) => name.test(t.textContent ?? ''))!
const paper = () => host.querySelector('[data-resume-paper]')!

async function mount(props: Record<string, unknown> = {}) {
  await act(async () => {
    root.render(createElement(TailorStudio, {
      roleId: '00000000-0000-4000-8000-000000000001', resumeId: '00000000-0000-4000-8000-000000000002',
      resumeLabel: 'My résumé', original, roleTitle: 'Customer Success Manager', company: 'Diligent', ...props,
    }))
  })
}
async function tailored(props: Record<string, unknown> = {}) {
  await mount(props)
  await click(button(/Tailor my résumé/))
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
  it('offers only the button — no score, page or tabs until there is a tailored résumé', async () => {
    await mount()
    expect(text()).toContain('Tailor my résumé for this role')
    expect(host.querySelector('[role="tablist"]')).toBeNull()
    expect(host.querySelector('[data-resume-paper]')).toBeNull()
  })
})

describe('after tailoring', () => {
  it('applies the rewrite at once and marks the changed line on the page', async () => {
    await tailored()
    expect(mocks.tailorSavedResume).toHaveBeenCalledTimes(1)
    expect(paper().textContent).toContain('Owned 40 accounts worth ₹6 Cr.')
    expect(paper().querySelector('mark')!.textContent).toContain('Owned 40 accounts worth ₹6 Cr.')
    expect(text()).toContain('Enhanced 1 work-experience bullet')
  })

  it('scores the page after a pause and says how far it moved, on a ten-point scale', async () => {
    await tailored()
    expect(mocks.scoreDraft).not.toHaveBeenCalled() // debounced
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    await flush()
    expect(mocks.scoreDraft).toHaveBeenCalledTimes(1)
    expect(mocks.scoreDraft.mock.calls[0][0].sections.experience[0].bullets[0]).toBe('Owned 40 accounts worth ₹6 Cr.')
    const head = host.querySelector('[aria-label="Score for this posting"]')!.textContent!
    expect(head).toContain('Great! Your score jumped from 6 to 7')
  })

  it('says so, instead of celebrating, when the score does not rise', async () => {
    mocks.scoreDraft.mockResolvedValue({ ok: true, score: 55 })
    await tailored()
    await act(async () => { await vi.advanceTimersByTimeAsync(800) })
    await flush()
    const head = host.querySelector('[aria-label="Score for this posting"]')!.textContent!
    expect(head).toContain('Your score is 5.5 (it was 6) — undo a change to bring it back.')
    expect(head).not.toContain('Great!')
  })

  it('lists what the guard refused rather than hiding it', async () => {
    mocks.tailorSavedResume.mockResolvedValue({ ...okResult, reverted: [{ entry: 0, original: 'a', rewritten: 'Owned 90 accounts.', kept: false, reason: 'added a number your résumé does not have' }] })
    await tailored()
    expect(text()).toContain('1 refused')
    expect(text()).toContain('Owned 90 accounts.')
  })
})

describe('the Editor tab', () => {
  it('edits a line on the page, and Undo puts the saved résumé’s line back', async () => {
    await tailored()
    await click(tab(/Editor/))
    const area = [...host.querySelectorAll('textarea')].find((t) => t.value === 'Owned 40 accounts worth ₹6 Cr.')!
    expect(text()).toContain('Changed')
    await type(area, 'Owned 45 accounts.')
    expect(paper().textContent).toContain('Owned 45 accounts.')
    await click(host.querySelector('button[aria-label="Undo this change"]')!)
    expect(paper().textContent).toContain('Owned 40 accounts.')
    expect(paper().textContent).not.toContain('worth ₹6 Cr.')
    expect(text()).toContain('Nothing — this is your saved résumé.')
  })

  it('rewrites one line with AI into the box', async () => {
    mocks.rewriteStudioLine.mockResolvedValue({ ok: true, line: 'Cut churn 12%.', providerLabel: 'Groq' })
    await tailored()
    await click(tab(/Editor/))
    await click(host.querySelectorAll('button[aria-label="Rewrite this line with AI"]')[2]) // second bullet; the summary is first
    expect(mocks.rewriteStudioLine).toHaveBeenCalledWith({ roleId: '00000000-0000-4000-8000-000000000001', line: 'Cut churn by 12%.' })
    expect(paper().textContent).toContain('Cut churn 12%.')
  })
})

describe('the AI Rewrite tab', () => {
  it('"Shorten my summary" sends the summary with the instruction and applies what comes back', async () => {
    mocks.rewriteStudioLines.mockResolvedValue({ ok: true, results: [{ key: 'summary', line: 'Customer success lead, six years in SaaS.' }], providerLabel: 'Groq' })
    await tailored()
    await click(button(/Shorten my summary/))
    expect(mocks.rewriteStudioLines).toHaveBeenCalledTimes(1)
    const sent = mocks.rewriteStudioLines.mock.calls[0][0]
    expect(sent.lines).toEqual([{ key: 'summary', text: original.summary, summary: true }])
    expect(sent.instruction).toMatch(/Shorten/)
    expect(paper().textContent).toContain('Customer success lead, six years in SaaS.')
    expect(text()).toContain('1 of 1 line rewritten by Groq')
  })

  it('a free-text request goes to the summary and the latest role, and a refused line is reported, not applied', async () => {
    mocks.rewriteStudioLines.mockResolvedValue({
      ok: true,
      results: [{ key: 'summary', reason: 'Left as written: the rewrite added a figure.' }, { key: '0:0', line: 'Won 40 accounts.' }, { key: '0:1', line: 'Cut churn by 12%.' }],
      providerLabel: 'Groq',
    })
    await tailored()
    await type(host.querySelector('input[aria-label="Tell the AI what to change"]')!, 'make it punchier')
    await click(host.querySelector('button[aria-label="Send"]')!)
    expect(mocks.rewriteStudioLines.mock.calls[0][0].lines.map((l: { key: string }) => l.key)).toEqual(['summary', '0:0', '0:1'])
    expect(paper().textContent).toContain('Won 40 accounts.')
    expect(paper().textContent).toContain(original.summary!) // the refused line stayed
    expect(text()).toContain('2 of 3 lines rewritten')
    expect(text()).toContain('1 left as written')
  })

  it('"Remove skills not related" keeps what the posting names, with no model call', async () => {
    mocks.tailorSavedResume.mockResolvedValue({ ...okResult, keywords: ['Excel', 'SQL', 'Salesforce'] })
    await tailored()
    await click(button(/Remove skills not related/))
    expect(mocks.rewriteStudioLines).not.toHaveBeenCalled()
    expect(paper().textContent).not.toContain('Zendesk')
    expect(paper().textContent).toContain('Salesforce')
    expect(text()).toContain('Removed 2 skills')
  })

  it('will not strip the skills down to almost nothing', async () => {
    await tailored() // keywords: Excel, SQL → only two skills match
    await click(button(/Remove skills not related/))
    expect(paper().textContent).toContain('Zendesk')
    expect(text()).toContain('nothing was removed')
  })
})

describe('style, fit and download', () => {
  it('the Style tab holds the same controls as the export drawer, and a template card restyles the page', async () => {
    await tailored()
    await click(tab(/Style/))
    expect(host.querySelector('[role="group"][aria-label="Template"]')).not.toBeNull()
    const centered = [...host.querySelectorAll('[aria-label="Template"] button')].find((b) => /Centered/.test(b.textContent ?? ''))!
    await click(centered)
    expect(centered.getAttribute('aria-pressed')).toBe('true')
    expect((paper().querySelector('h1') as HTMLElement).style.textAlign).toBe('center')
  })

  it('"Fit to one page" says it fits when it does', async () => {
    await tailored()
    await click(host.querySelector('input[role="switch"]')!)
    expect(text()).toMatch(/Fits one page \(estimated, about 0\.\d\)\./)
  })

  it('"Fit to one page" says it does NOT fit rather than claiming success', async () => {
    const long: ResumeSections = {
      ...original,
      experience: Array.from({ length: 6 }, (_, i) => ({ title: `Role ${i}`, employer: `Employer ${i}`, dates: 'd', location: null, bullets: Array.from({ length: 12 }, (_, j) => `${'achieved a measurable result '.repeat(5)}${i}${j}`) })),
    }
    mocks.tailorSavedResume.mockResolvedValue({ ...okResult, sections: long, changes: [] })
    await tailored({ original: long })
    await click(host.querySelector('input[role="switch"]')!)
    expect(text()).toContain('Still more than a page with the tightest spacing')
    expect(text()).not.toContain('Fits one page')
  })

  it('names the file for the person, role and company, and lets them rename it', async () => {
    await tailored()
    const name = host.querySelector('input[aria-label="File name"]') as HTMLInputElement
    expect(name.value).toBe('Asha_Rao_Customer_Success_Manager_Diligent')
    await type(name, 'Asha_for_Diligent')
    expect(name.value).toBe('Asha_for_Diligent')
  })

  it('Download résumé opens the drawer; Download Word sends the chosen style and the company', async () => {
    await tailored()
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    await click(tab(/Style/))
    await click([...host.querySelectorAll('[aria-label="Template"] button')].find((b) => /Compact/.test(b.textContent ?? ''))!)
    await click(button(/Download résumé/))
    await click(button(/Download Word/, everything()))
    expect(mocks.downloadOptimisedResume).toHaveBeenCalledTimes(1)
    expect(mocks.downloadOptimisedResume.mock.calls[0][0]).toMatchObject({
      company: 'Diligent', targetRole: 'Customer Success Manager', style: { preset: 'compact' },
    })
  })

  it('Download PDF prints the page under the same file name, then restores the page title', async () => {
    await tailored()
    document.title = 'Resume Tailoring Studio — Jobinko'
    let titleWhilePrinting = ''
    window.print = vi.fn(() => { titleWhilePrinting = document.title })
    await click(button(/Download résumé/))
    await click(button(/Download PDF/, everything()))
    expect(titleWhilePrinting).toBe('Asha_Rao_Customer_Success_Manager_Diligent')
    window.dispatchEvent(new Event('afterprint'))
    expect(document.title).toBe('Resume Tailoring Studio — Jobinko')
  })

  it('offers Apply now when the job has an application page', async () => {
    await tailored({ applyUrl: 'https://careers.example.com/apply/1' })
    const a = [...host.querySelectorAll('a')].find((x) => /Apply now/.test(x.textContent ?? ''))!
    expect(a.getAttribute('href')).toBe('https://careers.example.com/apply/1')
    expect(a.getAttribute('rel')).toContain('noopener')
  })
})
