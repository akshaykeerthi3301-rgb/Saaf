import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/** The extension's "Generate cover letter": the website's writer, for the posting on screen. Writer and gate mocked at their boundary. */
const mocks = vi.hoisted(() => ({ draftCoverLetter: vi.fn(), profile: vi.fn() }))
vi.mock('@/lib/extension-session', () => ({
  requireExtensionUser: vi.fn(async () => ({ user: { userId: 'u1', email: 'p@example.com' } })),
  json: (b: unknown, init?: ResponseInit) => Response.json(b, init),
  refuse: (status: number, error: string) => Response.json({ ok: false, error }, { status }),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }) }) }))
vi.mock('@/lib/copilot-writer', () => ({ draftCoverLetter: mocks.draftCoverLetter }))
vi.mock('@/lib/services/profile-cards', () => ({ readPrimaryResume: vi.fn(async () => ({ resume: { sections: { contact: { name: 'Priya Iyer' } } } })) }))

const { POST } = await import('../route')
const JD = 'Customer Success Manager. You will own a book of enterprise accounts, drive adoption and renewals, run quarterly business reviews, and partner with sales on expansion across Bengaluru. Excel and Salesforce are used daily.'
const call = (body: unknown) => POST(new NextRequest('http://localhost/api/extension/cover-letter', { method: 'POST', body: JSON.stringify(body) }))
beforeEach(() => {
  mocks.draftCoverLetter.mockReset(); mocks.profile.mockReset()
  mocks.profile.mockResolvedValue({ data: { current_title: 'Manager', employer: 'ICICI Bank', years_experience: 4, skills: ['Excel', 'Salesforce', 'Go'], domain: null, credential: 'none' } })
  mocks.draftCoverLetter.mockResolvedValue({ text: 'Dear team…', provider: null, dropped: [{ text: 'x', reason: 'unsupported' }] })
})

describe('/api/extension/cover-letter', () => {
  it('writes from the posting and the account\'s own facts, with the skills the posting mentions', async () => {
    const res = await call({ jdText: JD, jdTitle: 'Customer Success Manager', company: 'Acme', tone: 'Direct' })
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, text: 'Dear team…', dropped: 1, matched: ['Excel', 'Salesforce'], unfilled: [] })
    const [me, role, tone] = mocks.draftCoverLetter.mock.calls[0]
    expect(me).toMatchObject({ currentTitle: 'Manager', employer: 'ICICI Bank', yearsExperience: 4 })
    expect(role).toMatchObject({ title: 'Customer Success Manager', company: 'Acme', description: JD })
    expect(tone).toBe('Direct')
  })
  it('fills the blanks the website\'s fallback template leaves — role, company, skill, name — and reports what is left', async () => {
    mocks.profile.mockResolvedValue({ data: { full_name: 'Priya Iyer', current_title: 'Manager', employer: 'ICICI Bank', years_experience: 4, skills: ['Excel'], domain: null, credential: 'none' } })
    mocks.draftCoverLetter.mockResolvedValue({ text: 'Dear [Hiring Manager],\n\nI am writing to apply for the [Role] position at [Company]. On [Key Project] I used [Target Skill].\n\nKind regards,\n[Your Name]', provider: null, dropped: [] })
    const body = await (await call({ jdText: JD, jdTitle: 'Customer Success Manager', company: 'Acme' })).json()
    expect(body.text).toBe('Dear Hiring Manager,\n\nI am writing to apply for the Customer Success Manager position at Acme. On [Key Project] I used Excel.\n\nKind regards,\nPriya Iyer')
    expect(body.unfilled).toEqual(['Key Project'])
  })
  it('refuses a posting that is too short, and an unknown tone', async () => {
    expect((await call({ jdText: 'too short' })).status).toBe(400)
    expect((await call({ jdText: JD, tone: 'Pushy' })).status).toBe(400)
    expect(mocks.draftCoverLetter).not.toHaveBeenCalled()
  })
  it('asks the person to finish their profile when there is none', async () => {
    mocks.profile.mockResolvedValue({ data: null })
    const res = await call({ jdText: JD })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toMatch(/profile/i)
  })
})
