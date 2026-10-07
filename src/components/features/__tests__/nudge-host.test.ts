// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/** The governor and the feed tour, driven the way a first-time visitor meets them. */
const nav = vi.hoisted(() => ({ path: '/today' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.path }))

const { NudgeHost, replayNudge } = await import('../nudge-host')
const { FeedTour } = await import('../feed-tour')

const ANCHORS = ['search', 'filters', 'card', 'panel', 'nav-tracker']
let host: HTMLDivElement
let root: Root
const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage')
/** Swap the device's storage for one that fails the way a blocked or full one does. */
function breakStorage(failing: { read?: boolean; write?: boolean }) {
  const real = window.localStorage
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => { if (failing.read) throw new Error('blocked'); return real.getItem(k) },
      setItem: (k: string, v: string) => { if (failing.write) throw new Error('quota'); real.setItem(k, v) },
    },
  })
}
const stored = () => JSON.parse(window.localStorage.getItem('saaf.nudges.v1') ?? 'null')
const text = () => document.body.textContent ?? ''
const btn = (label: RegExp) => [...document.querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }) }
const wait = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }

function addAnchors(which: string[] = ANCHORS) {
  for (const a of which) {
    const el = document.createElement('div')
    el.setAttribute('data-tour', a)
    el.scrollIntoView = vi.fn()
    document.body.appendChild(el)
  }
}
async function mount() {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root.render(createElement(NudgeHost)) })
  await wait(1000)
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  window.localStorage.clear()
  nav.path = '/today'
  document.body.innerHTML = ''
})
afterEach(async () => {
  await act(async () => { root?.unmount() })
  vi.useRealTimers()
  vi.restoreAllMocks()
  if (realStorage) Object.defineProperty(window, 'localStorage', realStorage)
})

describe('the feed tour', () => {
  it('shows once on a first visit to the feed, at the first stop', async () => {
    addAnchors()
    await mount()
    expect(text()).toContain('Quick tour · 1 of 5')
    expect(text()).toContain('Say what you want')
    expect(document.querySelector('[data-tour="search"]')!.getAttribute('data-tour-active')).toBe('true')
    expect(stored().shown['tour:feed']).toBeTypeOf('number')
  })

  it('walks the five stops, outlining each element in turn, and finishing marks it done for good', async () => {
    addAnchors()
    await mount()
    for (let n = 1; n < 5; n++) {
      await click(btn(/^Next$/))
      expect(text()).toContain(`Quick tour · ${n + 1} of 5`)
      expect(document.querySelector(`[data-tour="${ANCHORS[n]}"]`)!.getAttribute('data-tour-active')).toBe('true')
      expect(document.querySelector(`[data-tour="${ANCHORS[n - 1]}"]`)!.getAttribute('data-tour-active')).toBeNull() // one at a time
    }
    await click(btn(/^Done$/))
    expect(text()).not.toContain('Quick tour')
    expect(stored().done['tour:feed']).toBeTypeOf('number')
    expect(document.querySelector('[data-tour-active]')).toBeNull() // nothing left outlined
  })

  it('waits for the feed to finish drawing, then counts ALL its stops (found live: it opened as "1 of 1" while the feed streamed in)', async () => {
    addAnchors(['nav-tracker']) // only the sidebar exists at first
    await mount()
    expect(text()).not.toContain('Quick tour')
    expect(window.localStorage.getItem('saaf.nudges.v1')).toBeNull() // not recorded as shown while nothing is there to point at
    await wait(3000)
    addAnchors(['search', 'filters', 'card', 'panel']) // the feed arrives
    await wait(1000)
    expect(text()).toContain('Quick tour · 1 of 5')
  })

  it('gives up quietly if the page never draws what the tour points at, and asks again next visit', async () => {
    addAnchors(['nav-tracker'])
    await mount()
    await wait(30_000)
    expect(text()).not.toContain('Quick tour')
    expect(window.localStorage.getItem('saaf.nudges.v1')).toBeNull() // not shown, not done: it will try again
  })

  it('Back goes back', async () => {
    addAnchors()
    await mount()
    await click(btn(/^Next$/))
    await click(btn(/^Back$/))
    expect(text()).toContain('1 of 5')
  })

  it('a finished tour never returns on a later visit', async () => {
    addAnchors()
    await mount()
    await click(btn(/Don’t show again/))
    await act(async () => { root.unmount() })
    await wait(30 * 24 * 3_600_000)
    await mount()
    expect(text()).not.toContain('Quick tour')
  })

  it('skips a stop whose element is not on the page, and counts only the ones it can point at', async () => {
    addAnchors(['search', 'card']) // no filters drawer, no panel (a phone), no tracker link
    await mount()
    expect(text()).toContain('Quick tour · 1 of 2')
  })

  it('the tour itself finishes quietly rather than show an empty card if every target has gone', async () => {
    const onDone = vi.fn()
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    await act(async () => { root.render(createElement(FeedTour, { onDone, onLater: vi.fn() })) })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(text()).not.toContain('Quick tour')
  })

  it('"Not now" hides it and brings it back after a day, not before', async () => {
    addAnchors()
    await mount()
    await click(btn(/^Not now$/))
    expect(text()).not.toContain('Quick tour')
    expect(stored().snoozes['tour:feed']).toBe(1)
    await act(async () => { root.unmount() })
    await wait(13 * 3_600_000) // quiet period over, snooze not
    await mount()
    expect(text()).not.toContain('Quick tour')
    await act(async () => { root.unmount() })
    await wait(12 * 3_600_000) // 25 h in
    await mount()
    expect(text()).toContain('Quick tour · 1 of 5')
  })

  it('does not appear on other pages', async () => {
    addAnchors()
    nav.path = '/profile'
    await mount()
    expect(text()).not.toContain('Quick tour')
    expect(window.localStorage.getItem('saaf.nudges.v1')).toBeNull() // and nothing was recorded as shown
  })

  it('is not repeated inside the quiet period if it was left unfinished', async () => {
    addAnchors()
    await mount()
    await act(async () => { root.unmount() })
    await wait(3_600_000)
    await mount()
    expect(text()).not.toContain('Quick tour')
  })
})

describe('when the device cannot remember', () => {
  it('shows nothing at all — a prompt that cannot be stopped is worse than none', async () => {
    addAnchors()
    breakStorage({ write: true })
    await mount()
    expect(text()).not.toContain('Quick tour')
  })
  it('shows nothing when storage cannot even be read', async () => {
    addAnchors()
    breakStorage({ read: true })
    await mount()
    expect(text()).not.toContain('Quick tour')
  })
  it('replayNudge reports that it could not, so the Help button can say so', () => {
    breakStorage({ read: true })
    expect(replayNudge('tour:feed')).toBe(false)
  })
})

describe('replay ("Show the tour again")', () => {
  it('after finishing, shows the tour at once — even inside the quiet period', async () => {
    addAnchors()
    await mount()
    await click(btn(/Don’t show again/))
    expect(text()).not.toContain('Quick tour')
    expect(replayNudge('tour:feed')).toBe(true)
    await wait(1000)
    expect(text()).toContain('Quick tour · 1 of 5')
  })
})
