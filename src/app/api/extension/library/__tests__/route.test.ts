import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/** The résumé picker's and the pop-up's read-only data. The gate is mocked at its boundary; the route's own rules run for real. */
const mocks = vi.hoisted(() => ({ listResumes: vi.fn(), getResume: vi.fn(), readPrimaryResume: vi.fn() }))
vi.mock('@/lib/extension-session', () => ({
  requireExtensionUser: vi.fn(async () => ({ user: { userId: 'u1', email: 'p@example.com' } })),
  json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  refuse: (status: number, error: string) => Response.json({ ok: false, error }, { status }),
}))
vi.mock('@/lib/services/resume-documents', () => ({ listResumes: mocks.listResumes, getResume: mocks.getResume }))
vi.mock('@/lib/services/profile-cards', () => ({ readPrimaryResume: mocks.readPrimaryResume }))

const { GET } = await import('../route')
const call = (qs: string) => GET(new NextRequest(`http://localhost/api/extension/library${qs}`))
beforeEach(() => Object.values(mocks).forEach((m) => m.mockReset()))

describe('/api/extension/library', () => {
  it('lists the person\'s résumés with the primary marked', async () => {
    mocks.listResumes.mockResolvedValue([{ id: 'a', label: 'Main', isPrimary: true, updatedAt: 't1', score: 80 }, { id: 'b', label: 'Tailored — X', updatedAt: 't2' }])
    const body = await (await call('?view=list')).json()
    expect(body.resumes).toEqual([{ id: 'a', label: 'Main', isPrimary: true, updatedAt: 't1' }, { id: 'b', label: 'Tailored — X', isPrimary: false, updatedAt: 't2' }])
  })

  it('previews one résumé by id — and only a real id', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    mocks.getResume.mockResolvedValue({ id, label: 'Main', body: 'AKSHAY KEERTHI\nEXPERIENCE' })
    expect((await (await call(`?view=preview&id=${id}`)).json()).text).toContain('EXPERIENCE')
    expect(mocks.getResume).toHaveBeenCalledWith('u1', id)
    expect((await call('?view=preview&id=not-a-uuid')).status).toBe(400)
    mocks.getResume.mockResolvedValue(null)
    expect((await call(`?view=preview&id=${id}`)).status).toBe(404)
  })

  it('reads education, work and skills from the primary résumé, including GPA, major and summary', async () => {
    mocks.readPrimaryResume.mockResolvedValue({ resume: { sections: {
      education: [{ qualification: 'MBA, General Management', institution: 'IIM Sambalpur', dates: '2023 – 2025', major: 'General Management', gpa: '8.4' }],
      experience: [{ title: 'Manager', employer: 'ICICI Bank', dates: 'Jun 2025 - Jul 2026', location: 'Bangalore', bullets: [], employmentType: 'Full-Time', summary: 'Owned 150 clients.' }],
      skills: ['Excel', 'Power BI'],
    } } })
    const body = await (await call('?view=profile')).json()
    expect(body.education[0]).toMatchObject({ school: 'IIM Sambalpur', degree: 'MBA, General Management', major: 'General Management', gpa: '8.4' })
    expect(body.experience[0]).toMatchObject({ company: 'ICICI Bank', title: 'Manager', type: 'Full-Time', summary: 'Owned 150 clients.' })
    expect(body.skills).toEqual(['Excel', 'Power BI'])
  })

  it('has nothing to show — not an error — when there is no résumé yet; refuses an unknown view', async () => {
    mocks.readPrimaryResume.mockResolvedValue(null)
    expect(await (await call('?view=profile')).json()).toEqual({ ok: true, education: [], experience: [], skills: [] })
    expect((await call('?view=nope')).status).toBe(400)
  })
})
