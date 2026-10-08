import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The step that puts a résumé into the account, shared by the first run and the tailor drawer. The two server
 * actions it composes are mocked at their boundary.
 */
const mocks = vi.hoisted(() => ({ readResumeFile: vi.fn(), saveResumeToAccount: vi.fn(), makePrimaryResume: vi.fn() }))
vi.mock('@/app/actions/read-resume-file', () => ({ readResumeFile: mocks.readResumeFile }))
vi.mock('@/app/actions/resume-documents', () => ({ saveResumeToAccount: mocks.saveResumeToAccount, makePrimaryResume: mocks.makePrimaryResume }))

const { keepResumeFromFile, labelFromFile } = await import('../keep-resume')

const file = (name = 'Asha_Rao_Resume.pdf') => new File(['x'], name, { type: 'application/pdf' })
const sections = { contact: { name: 'Asha Rao', email: null, phone: null, links: [] }, summary: null, experience: [], education: [], skills: [], other: [], unplaced: 0, order: [] }

beforeEach(() => { Object.values(mocks).forEach((m) => m.mockReset()) })

describe('keepResumeFromFile', () => {
  it('reads the file, saves its sections under the file name, and makes it primary when asked', async () => {
    mocks.readResumeFile.mockResolvedValue({ ok: true, text: 'x', fields: {}, sections, warnings: [] })
    mocks.saveResumeToAccount.mockResolvedValue({ ok: true, saved: { id: 'r1', label: 'Asha Rao Resume' } })
    mocks.makePrimaryResume.mockResolvedValue({ ok: true })

    const r = await keepResumeFromFile(file(), { makePrimary: true })

    expect(r).toEqual({ ok: true, saved: { id: 'r1', label: 'Asha Rao Resume' } })
    expect(mocks.saveResumeToAccount).toHaveBeenCalledWith({ sections, label: 'Asha Rao Resume' })
    expect(mocks.makePrimaryResume).toHaveBeenCalledWith({ id: 'r1' })
  })

  it('does not touch the primary when not asked', async () => {
    mocks.readResumeFile.mockResolvedValue({ ok: true, text: 'x', fields: {}, sections, warnings: [] })
    mocks.saveResumeToAccount.mockResolvedValue({ ok: true, saved: { id: 'r1', label: 'a' } })
    await keepResumeFromFile(file())
    expect(mocks.makePrimaryResume).not.toHaveBeenCalled()
  })

  it('passes the reader’s refusal through and saves nothing', async () => {
    mocks.readResumeFile.mockResolvedValue({ ok: false, error: 'We can read PDF and Word (.docx) files.' })
    expect(await keepResumeFromFile(file('a.txt'))).toEqual({ ok: false, error: 'We can read PDF and Word (.docx) files.' })
    expect(mocks.saveResumeToAccount).not.toHaveBeenCalled()
  })

  it('passes the save refusal through, and still succeeds if only the primary flag fails', async () => {
    mocks.readResumeFile.mockResolvedValue({ ok: true, text: 'x', fields: {}, sections, warnings: [] })
    mocks.saveResumeToAccount.mockResolvedValueOnce({ ok: false, error: 'We could not save it just now.' })
    expect(await keepResumeFromFile(file())).toEqual({ ok: false, error: 'We could not save it just now.' })

    mocks.saveResumeToAccount.mockResolvedValueOnce({ ok: true, saved: { id: 'r2', label: 'b' } })
    mocks.makePrimaryResume.mockRejectedValue(new Error('down'))
    expect((await keepResumeFromFile(file(), { makePrimary: true })).ok).toBe(true)
  })
})

describe('labelFromFile', () => {
  it('drops the extension and underscores, and never returns an empty label', () => {
    expect(labelFromFile('AKSHAY_KEERTHI_Resume_2026.docx')).toBe('AKSHAY KEERTHI Resume 2026')
    expect(labelFromFile('.pdf')).toBe('My résumé')
  })
})
