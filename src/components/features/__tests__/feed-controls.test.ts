// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EMPTY_VIEW, type FeedView } from '@/lib/feed-query'

/** The feed's new controls (redesign 2026-10-08): the search box with its dropdown, the pill menu, the All filters drawer. */
const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push, refresh: vi.fn() }) }))
vi.mock('@/app/actions/feed-prefs', () => ({ deleteFilter: vi.fn(), hideRole: vi.fn(), saveFilter: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => createElement('a', { href, ...rest }, children),
}))

const { FeedSearch } = await import('../feed-controls')
const { PillMenu } = await import('../pill-menu')
const { AllFiltersDrawer } = await import('../feed-filter-drawer')

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const render = async (el: React.ReactElement) => { await act(async () => { root.render(el) }) }
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }); await flush() }
const type = async (input: HTMLInputElement, v: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, v)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const key = async (el: Element | Document, k: string) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })) }) }
const focus = async (el: HTMLElement) => { await act(async () => { el.focus(); el.dispatchEvent(new FocusEvent('focusin', { bubbles: true })) }) }

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  nav.push.mockReset()
  document.body.innerHTML = ''
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove() })

describe('FeedSearch — one box, the examples in a dropdown', () => {
  const props = { initial: '', current: EMPTY_VIEW, chips: ['Customer Success Manager in Pune', 'entry level Customer Success Manager'] }

  it('shows only the box until it is used: no chips, no instructions on the page', async () => {
    await render(createElement(FeedSearch, props))
    expect(host.textContent).not.toContain('Try')
    expect(host.textContent).not.toContain('A new sentence starts over')
    expect(host.querySelector('input')!.getAttribute('placeholder')).toBe('Search by title or company — or describe it')
  })

  it('opens the examples when the box takes focus, and Escape closes them', async () => {
    await render(createElement(FeedSearch, props))
    const input = host.querySelector('input')!
    await focus(input)
    expect(host.textContent).toContain('Customer Success Manager in Pune')
    expect(host.textContent).toContain('A new sentence starts over')
    await key(input, 'Escape')
    expect(host.textContent).not.toContain('A new sentence starts over')
  })

  it('an example fills the box without searching, so it can be edited', async () => {
    await render(createElement(FeedSearch, props))
    const input = host.querySelector('input')!
    await focus(input)
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'entry level Customer Success Manager')!)
    expect(host.querySelector('input')!.value).toBe('entry level Customer Success Manager')
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('submitting reads the sentence into the URL', async () => {
    await render(createElement(FeedSearch, props))
    const input = host.querySelector('input')!
    await type(input, 'remote data analyst posted this week')
    await act(async () => { host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    const url = nav.push.mock.calls[0][0] as string
    expect(url).toContain('remote=1')
    expect(url).toContain('posted=7')
    expect(url).toContain('q=data+analyst')
  })

  it('keeps the tour anchor', async () => {
    await render(createElement(FeedSearch, props))
    expect(host.querySelector('[data-tour="search"]')).toBeTruthy()
  })
})

describe('PillMenu', () => {
  const options = [
    { label: 'Any', href: '/today', selected: false },
    { label: 'Past week', href: '/today?posted=7', selected: true },
  ]

  it('is closed until pressed, then lists its options as links to the URLs they produce', async () => {
    await render(createElement(PillMenu, { label: 'Posted: past week', active: true, options }))
    expect(host.querySelector('[role="menu"]')).toBeNull()
    await click(host.querySelector('button')!)
    const links = [...host.querySelectorAll('[role="menu"] a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/today', '/today?posted=7'])
    expect(links[1].getAttribute('aria-checked')).toBe('true')
    expect(host.querySelector('button')!.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes on Escape, on an outside click and on choosing an option', async () => {
    await render(createElement(PillMenu, { label: 'Date posted', options }))
    await click(host.querySelector('button')!)
    await key(document, 'Escape')
    expect(host.querySelector('[role="menu"]')).toBeNull()
    await click(host.querySelector('button')!)
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })) })
    expect(host.querySelector('[role="menu"]')).toBeNull()
    await click(host.querySelector('button')!)
    await click(host.querySelectorAll('[role="menu"] a')[0])
    expect(host.querySelector('[role="menu"]')).toBeNull()
  })

  it('takes the filled style only when something is chosen', async () => {
    await render(createElement(PillMenu, { label: 'Date posted', options, active: false }))
    expect(host.querySelector('button')!.className).not.toContain('bg-accent/10')
    await render(createElement(PillMenu, { label: 'Posted: past week', options, active: true }))
    expect(host.querySelector('button')!.className).toContain('bg-accent/10')
  })
})

describe('AllFiltersDrawer', () => {
  const view: FeedView = { ...EMPTY_VIEW, posted: '7', skip: 'Accenture,TCS', remote: true }
  const base = { view, keep: [['tab', 'new']] as [string, string][], notes: ['3 roles have no posting date and are left out.'], saved: [], stored: true, activeCount: 2, withinReach: false }
  const dlg = () => document.querySelector('[role="dialog"][aria-label="All filters"]') as HTMLElement | null

  it('is one pill with a count; the form is not on the page until it is opened', async () => {
    await render(createElement(AllFiltersDrawer, base))
    const pill = [...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!
    expect(pill.textContent).toContain('2')
    expect(dlg()).toBeNull()
  })

  it('opens from the right with the filters, the notes and the saved searches', async () => {
    await render(createElement(AllFiltersDrawer, base))
    await click([...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!)
    const d = dlg()!
    expect(d).toBeTruthy()
    for (const s of ['Date posted', 'Experience asked', 'Job type', 'Pay at least', 'Leave out these employers', 'Saved searches', 'Only roles within reach']) expect(d.textContent).toContain(s)
    expect(d.textContent).toContain('3 roles have no posting date')
    expect((d.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe('7')
    expect((d.querySelector('input[placeholder^="Accenture"]') as HTMLInputElement).value).toBe('Accenture, TCS')
  })

  it('Confirm pushes the same URL the pills would — the current view, the new fields, and what must be kept', async () => {
    await render(createElement(AllFiltersDrawer, base))
    await click([...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!)
    const d = dlg()!
    await act(async () => {
      const sel = d.querySelectorAll('select')[1] as HTMLSelectElement
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(sel, 'mid')
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => { d.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    const url = nav.push.mock.calls[0][0] as string
    expect(url).toContain('posted=7')
    expect(url).toContain('level=mid')
    expect(url).toContain('remote=1') // the pill filters already on are kept
    expect(url).toContain('skip=Accenture%2CTCS')
    expect(url).toContain('tab=new') // and so is the tab
    expect(dlg()).toBeNull() // and the drawer closes
  })

  it('"Within reach" becomes fit=clears; "Clear these" empties the drawer\'s fields but keeps the pills', async () => {
    await render(createElement(AllFiltersDrawer, { ...base, withinReach: true }))
    await click([...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!)
    await act(async () => { dlg()!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
    expect(nav.push.mock.calls[0][0]).toContain('fit=clears')
    await click([...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!)
    await click([...dlg()!.querySelectorAll('button')].find((b) => b.textContent === 'Clear these')!)
    const cleared = nav.push.mock.calls[1][0] as string
    expect(cleared).not.toContain('posted=')
    expect(cleared).not.toContain('skip=')
    expect(cleared).not.toContain('fit=')
    expect(cleared).toContain('remote=1')
  })

  it('has no nested forms (the saved-search control has its own)', async () => {
    await render(createElement(AllFiltersDrawer, base))
    await click([...host.querySelectorAll('button')].find((b) => /All filters/.test(b.textContent!))!)
    expect(dlg()!.querySelectorAll('form form').length).toBe(0)
  })
})
