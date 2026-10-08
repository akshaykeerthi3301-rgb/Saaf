// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

vi.mock('@/app/actions/jd-match', () => ({ scorePastedJd: async () => ({ ok: false, error: 'not used' }) }))
vi.mock('@/components/features/tailor-panel', () => ({ TailorPanel: () => null }))
const { JdMatchForm } = await import('../jd-match-form')

/**
 * "Tailor my résumé" in the extension opens /tools/paste-jd?from=extension and leaves the posting for
 * this page to take, ONCE. The page must ask only when it was opened that way, only once per load (React's
 * development double-run would otherwise consume it and find it gone), and must send nothing itself.
 */
const asked: unknown[] = []
let root: Root, box: HTMLElement
const setUrl = (qs: string) => window.history.replaceState({}, '', `/tools/paste-jd${qs}`)
const fakeExtension = (reply: unknown) => {
  ;(globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { sendMessage: (_id: string, msg: unknown, cb: (r: unknown) => void) => { asked.push(msg); cb(reply) } },
  }
}
const render = async () => { await act(async () => { root.render(createElement(JdMatchForm)) }) }

beforeEach(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  asked.length = 0
  box = document.createElement('div'); document.body.appendChild(box); root = createRoot(box)
})
afterEach(() => { act(() => root.unmount()); box.remove(); delete (globalThis as { chrome?: unknown }).chrome })

describe('JdMatchForm — posting handed over by the extension', () => {
  it('fills the boxes, says where it came from, and has sent nothing', async () => {
    setUrl('?from=extension')
    fakeExtension({ ok: true, jd: { text: 'Own renewals. '.repeat(20), title: 'Customer Success Manager', location: 'Pune' }, resumeText: 'Asha Rao — CSM. '.repeat(10) })
    await render()
    expect((document.getElementById('jd-text') as HTMLTextAreaElement).value).toContain('Own renewals.')
    expect(box.textContent).toContain('came from the Saaf extension')
    expect(box.textContent).toContain('Customer Success Manager')
    expect(box.textContent).toContain('Nothing has been sent yet')
    expect(asked).toEqual([{ type: 'saaf:take-jd' }])
  })
  it('asks the extension for nothing when the page was not opened by it', async () => {
    setUrl('')
    fakeExtension({ ok: true, jd: { text: 'x'.repeat(200), title: 't', location: 'l' }, resumeText: '' })
    await render()
    expect(asked).toEqual([])
    expect((document.getElementById('jd-text') as HTMLTextAreaElement).value).toBe('')
  })
  it('stays an ordinary empty form when the extension has nothing (or is not installed)', async () => {
    setUrl('?from=extension')
    fakeExtension({ ok: true, jd: null, resumeText: '' })
    await render()
    expect((document.getElementById('jd-text') as HTMLTextAreaElement).value).toBe('')
    expect(box.textContent).not.toContain('came from the Saaf extension')
  })
})
