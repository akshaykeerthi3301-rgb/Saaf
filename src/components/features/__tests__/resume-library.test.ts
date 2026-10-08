// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { SavedResume } from '@/lib/services/resume-documents'

/**
 * The résumé library, driven the way a new customer and a returning one drive it. The empty account is the case the
 * founder hit on 2026-10-09: no résumé, and the only visible way to add one led to another page and never back.
 */
const mocks = vi.hoisted(() => ({
  keepResumeFromFile: vi.fn(), deleteSavedResume: vi.fn(), makePrimaryResume: vi.fn(), push: vi.fn(), refresh: vi.fn(),
}))
vi.mock('@/lib/keep-resume', () => ({ keepResumeFromFile: mocks.keepResumeFromFile }))
vi.mock('@/app/actions/resume-documents', () => ({ deleteSavedResume: mocks.deleteSavedResume, makePrimaryResume: mocks.makePrimaryResume }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }))

const { ResumeLibrary } = await import('../resume-library')

const row = (over: Partial<SavedResume> = {}): SavedResume => ({
  id: '00000000-0000-4000-8000-000000000001', label: 'Asha Rao', targetRole: 'Customer Success Manager', score: 81,
  updatedAt: '2026-10-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z', isPrimary: false, ...over,
})

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const click = async (el: Element | undefined | null) => { await act(async () => { (el as HTMLElement).click() }); await flush() }
const btn = (re: RegExp, scope: ParentNode = document.body) => [...scope.querySelectorAll('button')].find((b) => re.test(b.textContent ?? '') || re.test(b.getAttribute('aria-label') ?? ''))
const mount = async (resumes: SavedResume[]) => { await act(async () => { root.render(createElement(ResumeLibrary, { resumes })) }) }
async function chooseFile(f: File) {
  const input = document.querySelector('[role="dialog"] input[type="file"]') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [f], configurable: true })
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })) })
  await flush()
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove() })

describe('an account with no résumé', () => {
  it('says so and offers an upload — in place, with no link to another page', async () => {
    await mount([])
    expect(host.textContent).toContain('You have no résumés saved yet.')
    expect(host.textContent).toContain('Upload your résumé to get started')
    expect(host.querySelector('a')).toBeNull()
  })

  it('the first résumé added becomes the primary one and appears without leaving the page', async () => {
    mocks.keepResumeFromFile.mockResolvedValue({ ok: true, saved: row({ id: '00000000-0000-4000-8000-0000000000aa', label: 'My CV', isPrimary: undefined }) })
    await mount([])
    await click(btn(/Upload your résumé/, host))
    const f = new File(['x'], 'My_CV.pdf', { type: 'application/pdf' })
    await chooseFile(f)
    expect(mocks.keepResumeFromFile).toHaveBeenCalledWith(f, { makePrimary: true })
    expect(host.textContent).toContain('You have 1 résumé saved out of 10 available slots.')
    expect(host.textContent).toContain('Primary')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('shows why a file was refused and keeps the dialog open', async () => {
    mocks.keepResumeFromFile.mockResolvedValue({ ok: false, error: 'We can read PDF and Word (.docx) files.' })
    await mount([])
    await click(btn(/Upload your résumé/, host))
    await chooseFile(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(document.body.textContent).toContain('We can read PDF and Word')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})

describe('an account with résumés', () => {
  it('counts the slots, badges the primary and opens the editor from a row', async () => {
    await mount([row({ isPrimary: true }), row({ id: '00000000-0000-4000-8000-000000000002', label: 'Tailored — CSM', isPrimary: false })])
    expect(host.textContent).toContain('You have 2 résumés saved out of 10 available slots.')
    expect(host.textContent).toContain('Primary')
    expect(host.textContent).toContain('ATS 8.1')
    await click(host.querySelector('tbody tr'))
    expect(mocks.push).toHaveBeenCalledWith('/resume/edit/00000000-0000-4000-8000-000000000001')
  })

  it('Use as primary moves the badge', async () => {
    mocks.makePrimaryResume.mockResolvedValue({ ok: true })
    await mount([row({ isPrimary: true }), row({ id: '00000000-0000-4000-8000-000000000002', label: 'Second', isPrimary: false })])
    await click(btn(/Actions for Second/))
    await click(btn(/Use as primary/))
    expect(mocks.makePrimaryResume).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000002' })
    const rows = [...host.querySelectorAll('tbody tr')]
    expect(rows[0].textContent).not.toContain('Primary')
    expect(rows[1].textContent).toContain('Primary')
  })

  it('Delete asks first, removes the row, and puts it back if the delete fails', async () => {
    mocks.deleteSavedResume.mockResolvedValue({ ok: false, error: 'We could not delete it just now. Try again in a moment.' })
    await mount([row()])
    await click(btn(/Actions for Asha Rao/))
    await click(btn(/^Delete$/))
    expect(document.body.textContent).toContain('Delete this résumé?')
    expect(mocks.deleteSavedResume).not.toHaveBeenCalled()
    await click([...document.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent === 'Delete'))
    expect(mocks.deleteSavedResume).toHaveBeenCalledWith({ id: '00000000-0000-4000-8000-000000000001' })
    expect(host.textContent).toContain('We could not delete it just now')
    expect(host.querySelectorAll('tbody tr')).toHaveLength(1) // rolled back
  })
})
