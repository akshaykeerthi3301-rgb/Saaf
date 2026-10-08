// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/** The profile in five tabs (TASK-189): one form, one Save, a settings hub. Child fields are stubbed; the tabs are real. */
const m = vi.hoisted(() => ({ exportMyData: vi.fn(), confirmProfile: vi.fn() }))
vi.mock('@/app/actions/account', () => ({ exportMyData: m.exportMyData }))
vi.mock('@/app/actions/confirm-profile', () => ({ confirmProfile: m.confirmProfile }))
vi.mock('@/app/actions/delete-account', () => ({ deleteAccount: vi.fn() }))
vi.mock('@/app/actions/restart-onboarding', () => ({ restartOnboarding: vi.fn() }))
vi.mock('@/app/actions/sign-out', () => ({ signOut: vi.fn() }))
const nav = vi.hoisted(() => ({ push: vi.fn(), replay: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }) }))
vi.mock('@/components/features/nudge-host', () => ({ replayNudge: nav.replay }))
const stub = (name: string) => {
  const Stub = () => createElement('div', { 'data-stub': name }, name)
  Stub.displayName = `Stub(${name})`
  return Stub
}
vi.mock('@/components/features/role-input', () => ({ RoleInput: stub('role-input') }))
vi.mock('@/components/features/location-input', () => ({ LocationInput: stub('location-input') }))
vi.mock('@/components/features/skills-field', () => ({ SkillsField: stub('skills-field') }))
vi.mock('@/components/features/extra-roles-field', () => ({ ExtraRolesField: stub('extra-roles') }))
vi.mock('@/components/features/keywords-field', () => ({ KeywordsField: stub('keywords') }))

const { ProfileForm } = await import('../profile-form')

const initial = {
  currentTitle: 'CSM', employer: 'Acme', yearsExperience: '2', preferredRole: 'Customer Success Manager', openToAdjacent: false,
  skills: ['SQL'], city: 'Pune', credential: 'none', extraRoles: [], keywords: [], workModePreference: 'no_preference',
  salaryExpectation: '', fullName: 'Asha Rao', phone: '', linkedinUrl: '', portfolioUrl: '', noticePeriod: '',
}

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const tab = (name: string) => [...host.querySelectorAll('[role="tab"]')].find((t) => t.textContent === name) as HTMLElement
const shown = () => [...host.querySelectorAll('[role="tabpanel"]')].filter((p) => !(p as HTMLElement).hidden)
const click = async (el: Element) => { await act(async () => { (el as HTMLElement).click() }); await flush() }
const key = async (el: Element, k: string) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })) }) }
const saveButton = () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Save')

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  m.exportMyData.mockReset(); m.confirmProfile.mockReset(); nav.push.mockReset(); nav.replay.mockReset()
  m.confirmProfile.mockResolvedValue({ ok: true })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root.render(createElement(ProfileForm, { initial, email: 'asha@example.com', accountExtras: createElement('div', { 'data-extra': '1' }, 'connections') })) })
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove() })

describe('the five tabs', () => {
  it('has exactly the five, Basics first and selected', () => {
    expect([...host.querySelectorAll('[role="tab"]')].map((t) => t.textContent)).toEqual(['Basics', 'Job search', 'Skills', 'Application details', 'Account & data'])
    expect(tab('Basics').getAttribute('aria-selected')).toBe('true')
    expect(shown()).toHaveLength(1)
    expect(shown()[0].textContent).toContain('Current title')
  })

  it('every field lives on exactly one tab', async () => {
    const where: Record<string, string[]> = {}
    for (const name of ['Basics', 'Job search', 'Skills', 'Application details', 'Account & data']) {
      await click(tab(name))
      for (const l of shown()[0].querySelectorAll('label')) (where[l.textContent!.trim().slice(0, 30)] ??= []).push(name)
    }
    expect(where['Current title']).toEqual(['Basics'])
    expect(where['Credential']).toEqual(['Basics'])
    expect(where['Work mode']).toEqual(['Job search'])
    expect(where['Salary expectation']).toEqual(['Job search'])
    expect(where['Full name']).toEqual(['Application details'])
    expect(Object.values(where).every((tabs) => tabs.length === 1)).toBe(true)
  })

  it('one tab is shown at a time, and the tab and its panel are tied together for assistive tech', async () => {
    await click(tab('Skills'))
    expect(shown()).toHaveLength(1)
    const t = tab('Skills')
    expect(shown()[0].getAttribute('aria-labelledby')).toBe(t.id)
    expect(t.getAttribute('aria-controls')).toBe(shown()[0].id)
    expect(tab('Basics').getAttribute('tabindex')).toBe('-1')
  })

  it('arrow keys, Home and End move between tabs, wrapping round', async () => {
    await key(tab('Basics'), 'ArrowRight')
    expect(tab('Job search').getAttribute('aria-selected')).toBe('true')
    await key(tab('Job search'), 'ArrowLeft')
    await key(tab('Basics'), 'ArrowLeft')
    expect(tab('Account & data').getAttribute('aria-selected')).toBe('true')
    await key(tab('Account & data'), 'Home')
    expect(tab('Basics').getAttribute('aria-selected')).toBe('true')
    await key(tab('Basics'), 'End')
    expect(tab('Account & data').getAttribute('aria-selected')).toBe('true')
  })

  it('what you type on one tab survives a trip to another, and one Save sends everything', async () => {
    const input = [...shown()[0].querySelectorAll('input')].find((i) => i.value === 'CSM')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Senior CSM')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(tab('Application details'))
    await click(tab('Basics'))
    expect(([...shown()[0].querySelectorAll('input')].find((i) => i.value === 'Senior CSM'))).toBeTruthy()
    await click(saveButton()!)
    expect(m.confirmProfile).toHaveBeenCalledTimes(1)
    expect(m.confirmProfile.mock.calls[0][0]).toMatchObject({ currentTitle: 'Senior CSM', fullName: 'Asha Rao', city: 'Pune', preferredRole: 'Customer Success Manager' })
  })
})

describe('Save', () => {
  it('shows on the four profile tabs and not on Account & data, where nothing is saved', async () => {
    for (const name of ['Basics', 'Job search', 'Skills', 'Application details']) {
      await click(tab(name))
      expect(saveButton(), name).toBeTruthy()
    }
    await click(tab('Account & data'))
    expect(saveButton()).toBeUndefined()
  })
})

describe('Account & data', () => {
  beforeEach(async () => { await click(tab('Account & data')) })

  it('says who is signed in and offers sign-out, the data download, the connections extra, restart and delete', () => {
    const t = host.textContent!
    expect(t).toContain('asha@example.com')
    for (const s of ['Sign out', 'Download my data', 'Show the tour again', 'connections', 'Start again with a different résumé', 'Delete your account']) expect(t).toContain(s)
  })

  it('Download my data asks the server for the account\'s data and saves it as the file it names', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const clicked: string[] = []
    const orig = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicked.push(this.download) }
    m.exportMyData.mockResolvedValue({ ok: true, filename: 'jobinko-my-data-2026-10-08.json', json: '{"a":1}' })
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Download my data')!)
    HTMLAnchorElement.prototype.click = orig
    expect(m.exportMyData).toHaveBeenCalledTimes(1)
    expect(m.exportMyData.mock.calls[0]).toEqual([]) // no argument: the account is the session's
    expect(clicked).toEqual(['jobinko-my-data-2026-10-08.json'])
    expect(host.textContent).toContain('Downloaded jobinko-my-data-2026-10-08.json.')
  })

  it('"Show the tour again" resets the tour and takes you to the feed', async () => {
    nav.replay.mockReturnValue(true)
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Show the tour again')!)
    expect(nav.replay).toHaveBeenCalledWith('tour:feed')
    expect(nav.push).toHaveBeenCalledWith('/today')
  })

  it('says so, and goes nowhere, when this browser cannot remember (so no tour could be shown)', async () => {
    nav.replay.mockReturnValue(false)
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Show the tour again')!)
    expect(nav.push).not.toHaveBeenCalled()
    expect(host.textContent).toContain('cannot remember tours')
  })

  it('a failed download says why and saves nothing', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    m.exportMyData.mockResolvedValue({ ok: false, error: 'Not signed in.' })
    await click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Download my data')!)
    expect(host.textContent).toContain('Not signed in.')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
