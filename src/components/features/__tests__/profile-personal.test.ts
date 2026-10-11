// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EMPTY_EXTRAS } from '@/lib/profile-extras'

/** The Employment pop-up, driven the way a candidate drives it: tap an answer, tap Update. Actions are mocked at their boundary. */
const mocks = vi.hoisted(() => ({ saveSelfId: vi.fn(), saveProfileExtras: vi.fn(), saveProfilePersonal: vi.fn(), refresh: vi.fn() }))
vi.mock('@/app/actions/self-id', () => ({ saveSelfId: mocks.saveSelfId }))
vi.mock('@/app/actions/profile-cards', () => ({ saveProfileExtras: mocks.saveProfileExtras, saveProfilePersonal: mocks.saveProfilePersonal }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, replace: vi.fn(), push: vi.fn() }) }))

const { ProfilePersonal } = await import('../profile-personal')

let host: HTMLDivElement
let root: Root
const flush = async () => { await act(async () => { await Promise.resolve() }) }
const body = () => document.body
const button = (label: RegExp, within: ParentNode = body()) => [...within.querySelectorAll('button')].find((b) => label.test(b.textContent ?? b.getAttribute('aria-label') ?? ''))!
const group = (label: string) => body().querySelector(`[role="group"][aria-label="${label}"]`)!
const data = { firstName: 'Priya', lastName: 'Iyer', email: 'p@example.com', phone: '+91 98450 00000', city: 'Bengaluru', extras: { ...EMPTY_EXTRAS }, selfId: {}, selfIdStored: true }

async function mount(over: Partial<typeof data> = {}) {
  await act(async () => { root.render(createElement(ProfilePersonal, { data: { ...data, ...over } })) })
  await flush()
}
const openEmployment = async () => { await act(async () => { (body().querySelector('button[aria-label="Edit employment information"]') as HTMLButtonElement).click() }); await flush() }

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(async () => { await act(async () => { root.unmount() }); host.remove(); document.body.innerHTML = '' })

describe('Personal info — the new details', () => {
  it('lists every detail Jobright collects, empty ones as a dash', async () => {
    await mount()
    for (const l of ['Middle Name', 'Phone Type', 'Address Line', 'Country/Region', 'State/Province', 'County', 'Postal Code']) expect(body().textContent).toContain(l)
  })
})

describe('Employment pop-up', () => {
  it('shows Jobright’s choices as chips, each with a Decline to state', async () => {
    await mount(); await openEmployment()
    const race = group('How would you identify your race?')
    expect([...race.querySelectorAll('button')].map((b) => b.textContent)).toEqual([
      'American Indian or Alaskan Native', 'Asian', 'Black or African American', 'Hispanic or Latino', 'White',
      'Native Hawaiian or Other Pacific Islander', 'Two or More Races', 'Decline to state',
    ])
    expect([...group('What are your pronouns?').querySelectorAll('button')].map((b) => b.textContent)).toEqual(['He/Him', 'She/Her', 'They/Them', 'Other', 'Decline to state'])
    expect([...group('Do you identify as LGBTQ+?').querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Yes', 'No', 'Decline to state'])
  })

  it('saves exactly the answers tapped — nothing for a question left on Decline to state', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: true }); mocks.saveProfileExtras.mockResolvedValue({ ok: true })
    await mount(); await openEmployment()
    await act(async () => { button(/^Female$/, group('What is your gender?')).click() })
    await act(async () => { button(/^No$/, group('Do you identify as LGBTQ+?')).click() })
    await act(async () => { button(/^Yes$/, group('Are you legally authorised to work in India?')).click() })
    await act(async () => { button(/^No$/, group('Will you now or in the future require sponsorship for an employment visa?')).click() })
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(mocks.saveSelfId).toHaveBeenCalledWith({ gender: 'Female', lgbtq: 'no' })
    expect(mocks.saveProfileExtras).toHaveBeenCalledWith({ authorisedToWork: 'yes', needsSponsorship: 'no', willingToRelocate: '' })
  })

  it('tapping a chosen chip again, or Decline to state, takes the answer back', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: true }); mocks.saveProfileExtras.mockResolvedValue({ ok: true })
    await mount({ selfId: { gender: 'Male', pronouns: 'He/Him' } }); await openEmployment()
    expect(button(/^Male$/, group('What is your gender?')).getAttribute('aria-pressed')).toBe('true')
    await act(async () => { button(/^Male$/, group('What is your gender?')).click() })
    await act(async () => { button(/Decline to state/, group('What are your pronouns?')).click() })
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(mocks.saveSelfId).toHaveBeenCalledWith({})
  })

  it('shows the action’s refusal and keeps the pop-up open', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: false, error: 'This needs a database update (0038) that has not been applied yet.' })
    await mount(); await openEmployment()
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(body().textContent).toContain('0038')
    expect(mocks.saveProfileExtras).not.toHaveBeenCalled()
  })
})
