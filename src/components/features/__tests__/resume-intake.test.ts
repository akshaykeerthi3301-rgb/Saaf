// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * The tailor drawer's empty state — the one a new customer hit on 2026-10-09 ("Add résumé" sent them to the ATS
 * checker and never brought them back). Driven the way they drive it: choose a file, see it read, get sent on.
 */
const mocks = vi.hoisted(() => ({ keepResumeFromFile: vi.fn() }))
vi.mock('@/lib/keep-resume', () => ({ keepResumeFromFile: mocks.keepResumeFromFile }))
vi.mock('@/app/actions/job-tools', () => ({ loadTailorContext: vi.fn(), loadCoverLetterContext: vi.fn() }))
vi.mock('@/components/features/tailor-studio', () => ({ TailorStudio: () => null }))
vi.mock('@/components/features/cover-letter-studio', () => ({ CoverLetterStudio: () => null }))
vi.mock('@/components/features/job-panel', () => ({ OverviewTab: () => null }))
vi.mock('@/components/features/feed-selection', () => ({ useFeed: () => ({}) }))

const { ResumeIntake } = await import('../job-tools')

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const fileInput = () => host.querySelector('input[type="file"]') as HTMLInputElement

async function choose(file: File) {
  Object.defineProperty(fileInput(), 'files', { value: [file], configurable: true })
  await act(async () => { fileInput().dispatchEvent(new Event('change', { bubbles: true })) })
  await flush()
}

beforeEach(() => {
  mocks.keepResumeFromFile.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove() })

describe('ResumeIntake', () => {
  it('says what is kept and sends nobody to another page', async () => {
    await act(async () => { root.render(createElement(ResumeIntake, { onSaved: vi.fn() })) })
    expect(host.textContent).toContain('Add your résumé to tailor it for this job')
    expect(host.textContent).toContain('not the file')
    expect(host.querySelector('a')).toBeNull()
  })

  it('keeps the file as the primary résumé and hands its id back so step 1 can load', async () => {
    mocks.keepResumeFromFile.mockResolvedValue({ ok: true, saved: { id: 'r1', label: 'Asha' } })
    const onSaved = vi.fn()
    await act(async () => { root.render(createElement(ResumeIntake, { onSaved })) })
    const f = new File(['x'], 'Asha.pdf', { type: 'application/pdf' })
    await choose(f)
    expect(mocks.keepResumeFromFile).toHaveBeenCalledWith(f, { makePrimary: true })
    expect(onSaved).toHaveBeenCalledWith('r1')
  })

  it('shows why a file was refused and stays put', async () => {
    mocks.keepResumeFromFile.mockResolvedValue({ ok: false, error: 'We can read PDF and Word (.docx) files.' })
    const onSaved = vi.fn()
    await act(async () => { root.render(createElement(ResumeIntake, { onSaved })) })
    await choose(new File(['x'], 'a.txt', { type: 'text/plain' }))
    expect(host.textContent).toContain('We can read PDF and Word')
    expect(onSaved).not.toHaveBeenCalled()
  })
})
