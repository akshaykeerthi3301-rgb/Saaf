// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * The welcome card, driven the way a new person drives it. The save action and the router are mocked at their
 * boundary; everything on screen is the real component.
 */
const mocks = vi.hoisted(() => ({ saveWelcome: vi.fn(), saveProfileRoles: vi.fn(), replace: vi.fn() }))
vi.mock('@/app/actions/first-run', () => ({ saveWelcome: mocks.saveWelcome }))
vi.mock('@/app/actions/profile-cards', () => ({ saveProfileRoles: mocks.saveProfileRoles }))
vi.mock('@/app/actions/role-catalogue', () => ({ roleCatalogue: vi.fn(async () => []), checkRoleTitle: vi.fn(async () => ({ count: null, suggestions: [] })) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace, push: vi.fn() }) }))

const { WelcomeModal } = await import('../welcome-modal')

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const body = () => document.body
const button = (label: RegExp) => [...body().querySelectorAll('button')].find((b) => label.test(b.textContent ?? ''))!
const checked = () => [...body().querySelectorAll('input[type="checkbox"]')].map((i) => (i as HTMLInputElement).checked)

async function mount(props: { found: number; years: number | null; roles?: string[] }) {
  await act(async () => { root.render(createElement(WelcomeModal, { roles: ['Account Manager', 'Customer Success Manager'], ...props })) })
  await flush()
}

beforeEach(() => {
  mocks.saveWelcome.mockReset()
  mocks.saveProfileRoles.mockReset()
  mocks.replace.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove() })

describe('WelcomeModal', () => {
  it('says how many roles were found and ticks the level the years fall in', async () => {
    await mount({ found: 4602, years: 4 })
    expect(body().textContent).toContain('Welcome! We found')
    expect(body().textContent).toContain('4,602')
    expect(checked()).toEqual([false, false, true, false, false, false]) // Mid level
    expect(body().textContent).toContain('4 years of experience we read')
  })

  it('ticks nothing when the years are unknown, and does not claim to have read them', async () => {
    await mount({ found: 10, years: null })
    expect(checked().every((c) => !c)).toBe(true)
    expect(body().textContent).not.toContain('we read in your résumé')
  })

  it('saves the ticked levels and opens the feed on the matching filter', async () => {
    mocks.saveWelcome.mockResolvedValue({ ok: true, feedLevel: 'mid' })
    await mount({ found: 100, years: 4 })
    await act(async () => { button(/Confirm/).click() })
    await flush()
    expect(mocks.saveWelcome).toHaveBeenCalledWith({ levels: ['mid'], linkedinUrl: '' })
    expect(mocks.replace).toHaveBeenCalledWith('/today?level=mid')
  })

  it('shows the action’s refusal and stays open', async () => {
    mocks.saveWelcome.mockResolvedValue({ ok: false, error: 'That does not look like a LinkedIn profile link.' })
    await mount({ found: 100, years: 4 })
    await act(async () => { button(/Confirm/).click() })
    await flush()
    expect(body().textContent).toContain('does not look like a LinkedIn')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('saves nothing when skipped', async () => {
    await mount({ found: 100, years: 4 })
    await act(async () => { button(/Skip for now/).click() })
    await flush()
    expect(mocks.saveWelcome).not.toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/today')
  })

  it('lists every role the person has, main first, and saves nothing extra when they are untouched', async () => {
    mocks.saveWelcome.mockResolvedValue({ ok: true, feedLevel: 'mid' })
    await mount({ found: 100, years: 4 })
    const chips = [...body().querySelectorAll('ul[aria-label="Your roles"] li')].map((li) => li.textContent)
    expect(chips).toHaveLength(2)
    expect(chips[0]).toContain('Account Manager')
    expect(chips[0]).toContain('Main')
    expect(chips[1]).toContain('Customer Success Manager')
    await act(async () => { button(/Confirm/).click() })
    await flush()
    expect(mocks.saveProfileRoles).not.toHaveBeenCalled()
  })

  it('re-saves the roles first when one is removed, then the rest of the card', async () => {
    mocks.saveProfileRoles.mockResolvedValue({ ok: true })
    mocks.saveWelcome.mockResolvedValue({ ok: true, feedLevel: null })
    await mount({ found: 100, years: 4 })
    await act(async () => { (body().querySelector('button[aria-label="Remove Customer Success Manager"]') as HTMLButtonElement).click() })
    await act(async () => { button(/Confirm/).click() })
    await flush()
    expect(mocks.saveProfileRoles).toHaveBeenCalledWith({ primary: 'Account Manager', extras: [] })
    expect(mocks.saveWelcome).toHaveBeenCalled()
  })

  it('stops and shows the error when the roles cannot be saved', async () => {
    mocks.saveProfileRoles.mockResolvedValue({ ok: false, error: 'We could not save that just now.' })
    await mount({ found: 100, years: 4 })
    await act(async () => { (body().querySelector('button[aria-label="Remove Customer Success Manager"]') as HTMLButtonElement).click() })
    await act(async () => { button(/Confirm/).click() })
    await flush()
    expect(body().textContent).toContain('could not save that just now')
    expect(mocks.saveWelcome).not.toHaveBeenCalled()
  })
})
