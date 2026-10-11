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
const data = { firstName: 'Priya', lastName: 'Iyer', email: 'p@example.com', phone: '+91 98450 00000', city: 'Bengaluru', extras: { ...EMPTY_EXTRAS }, selfId: {}, selfIdStored: true, links: { linkedin: '', portfolio: '', github: '', other: '' } }

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

  const REQUIRED = [
    ['Are you legally authorised to work in India?', /^Yes$/], ['Will you now or in the future require sponsorship for an employment visa?', /^No$/],
    ['What is your gender?', /^Female$/], ['Do you have a disability?', /Decline/], ['Are you a veteran?', /Decline/],
    ['How would you identify your race?', /Decline/], ['Are you Hispanic or Latino?', /Decline/], ['Do you identify as LGBTQ+?', /^No$/],
    ['How would you describe your sexual orientation?', /Decline/],
  ] as const
  const answerRequired = async (skip: string[] = []) => {
    for (const [q, chip] of REQUIRED) if (!skip.includes(q)) await act(async () => { button(chip, group(q)).click() })
  }

  it('will not save until every question marked * is answered or declined, and says which', async () => {
    await mount(); await openEmployment()
    await answerRequired(['What is your gender?', 'Are you a veteran?'])
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(body().textContent).toContain('Please answer these 2 questions, marked *')
    expect(body().textContent).toContain('What is your gender? · Are you a veteran?')
    expect(mocks.saveSelfId).not.toHaveBeenCalled()
    expect(mocks.saveProfileExtras).not.toHaveBeenCalled()
  })

  it('the two work-permit questions are Yes/No only — no way to decline them, as on Jobright', async () => {
    await mount(); await openEmployment()
    expect([...group('Are you legally authorised to work in India?').querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Yes', 'No'])
    expect([...group('Are you willing to relocate?').querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Yes', 'No', 'Decline to state'])
  })

  it('saves what was tapped; a declined voluntary question is stored as declined, an untouched optional one is left out', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: true }); mocks.saveProfileExtras.mockResolvedValue({ ok: true })
    await mount(); await openEmployment()
    await answerRequired()
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(mocks.saveSelfId).toHaveBeenCalledWith({ gender: 'Female', lgbtq: 'no', disability: 'decline', veteran: 'decline', ethnicity: 'decline', hispanic: 'decline', orientation: 'decline' })
    expect(mocks.saveProfileExtras).toHaveBeenCalledWith({ authorisedToWork: 'yes', needsSponsorship: 'no', willingToRelocate: '' })
  })

  it('Decline to state on an optional question simply empties it', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: true }); mocks.saveProfileExtras.mockResolvedValue({ ok: true })
    await mount({ selfId: { pronouns: 'He/Him', gender: 'Male' } }); await openEmployment()
    expect(button(/^Male$/, group('What is your gender?')).getAttribute('aria-pressed')).toBe('true')
    await act(async () => { button(/Decline to state/, group('What are your pronouns?')).click() })
    await answerRequired(['What is your gender?'])
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    const sent = mocks.saveSelfId.mock.calls[0][0]
    expect(sent.pronouns).toBeUndefined()
    expect(sent.gender).toBe('Male')
  })

  it('shows the action’s refusal and keeps the pop-up open', async () => {
    mocks.saveSelfId.mockResolvedValue({ ok: false, error: 'This needs a database update (0038) that has not been applied yet.' })
    await mount(); await openEmployment()
    await answerRequired()
    await act(async () => { button(/^\s*Update\s*$/).click() }); await flush()
    expect(body().textContent).toContain('0038')
    expect(mocks.saveProfileExtras).not.toHaveBeenCalled()
  })
})
