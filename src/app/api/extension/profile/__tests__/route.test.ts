import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/** The gate in front of the website's own save actions: only whitelisted operations, extras limited to what the pop-up edits. */
const mocks = vi.hoisted(() => ({
  saveProfilePersonal: vi.fn(), saveProfileEntry: vi.fn(), deleteProfileEntry: vi.fn(), saveProfileSkills: vi.fn(), saveProfileExtras: vi.fn(), saveSelfId: vi.fn(),
}))
vi.mock('@/lib/extension-session', () => ({
  requireExtensionUser: vi.fn(async () => ({ user: { userId: 'u1', email: 'p@example.com' } })),
  json: (b: unknown, init?: ResponseInit) => Response.json(b, init),
  refuse: (status: number, error: string) => Response.json({ ok: false, error }, { status }),
}))
vi.mock('@/app/actions/profile-cards', () => ({
  saveProfilePersonal: mocks.saveProfilePersonal, saveProfileEntry: mocks.saveProfileEntry, deleteProfileEntry: mocks.deleteProfileEntry,
  saveProfileSkills: mocks.saveProfileSkills, saveProfileExtras: mocks.saveProfileExtras,
}))
vi.mock('@/app/actions/self-id', () => ({ saveSelfId: mocks.saveSelfId }))

const { POST } = await import('../route')
const call = (body: unknown) => POST(new NextRequest('http://localhost/api/extension/profile', { method: 'POST', body: JSON.stringify(body) }))
beforeEach(() => { Object.values(mocks).forEach((m) => { m.mockReset(); m.mockResolvedValue({ ok: true }) }) })

describe('/api/extension/profile', () => {
  it('hands each operation to the website\'s own action, unchanged', async () => {
    await call({ op: 'personal', input: { firstName: 'Priya' } })
    await call({ op: 'entry', input: { kind: 'education', index: null } })
    await call({ op: 'deleteEntry', input: { kind: 'education', index: 1 } })
    await call({ op: 'skills', input: { skills: ['Excel'], favourites: [] } })
    await call({ op: 'selfId', input: { gender: 'Male' } })
    expect(mocks.saveProfilePersonal).toHaveBeenCalledWith({ firstName: 'Priya' })
    expect(mocks.saveProfileEntry).toHaveBeenCalledWith({ kind: 'education', index: null })
    expect(mocks.deleteProfileEntry).toHaveBeenCalledWith({ kind: 'education', index: 1 })
    expect(mocks.saveProfileSkills).toHaveBeenCalledWith({ skills: ['Excel'], favourites: [] })
    expect(mocks.saveSelfId).toHaveBeenCalledWith({ gender: 'Male' })
  })
  it('returns the action\'s own refusal sentence, with a 422', async () => {
    mocks.saveProfileEntry.mockResolvedValue({ ok: false, error: 'Add the major.' })
    const res = await call({ op: 'entry', input: {} })
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ ok: false, error: 'Add the major.' })
  })
  it('lets extras through only for the four the pop-up edits', async () => {
    await call({ op: 'extras', input: { authorisedToWork: 'yes', anythingElse: 'hi', githubUrl: 'https://evil', preferredName: 'x' } })
    expect(mocks.saveProfileExtras).toHaveBeenCalledWith({ authorisedToWork: 'yes', anythingElse: 'hi' })
  })
  it('refuses an operation that is not on the list', async () => {
    expect((await call({ op: 'deleteAccount', input: {} })).status).toBe(400)
    expect((await call({ nothing: true })).status).toBe(400)
  })
})
