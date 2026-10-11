import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The profile pop-ups' save rules: a field is mandatory exactly where Jobright marks a red star, and GPA, major and the
 * experience summary reach the résumé record. Services are mocked at their boundary; the action's own rules run for real.
 */
const mocks = vi.hoisted(() => ({
  readPrimaryResume: vi.fn(), updateResume: vi.fn(), saveResume: vi.fn(), setPrimaryResume: vi.fn(),
  writeProfilePersonal: vi.fn(), writeProfileLinks: vi.fn(), writeProfileExtras: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } }) }))
vi.mock('@/lib/evaluate-user', () => ({ evaluateUser: vi.fn(async () => undefined) }))
vi.mock('@/lib/services/resume-documents', () => ({ saveResume: mocks.saveResume, setPrimaryResume: mocks.setPrimaryResume, updateResume: mocks.updateResume }))
vi.mock('@/lib/services/profile-cards', () => ({
  readPrimaryResume: mocks.readPrimaryResume, writeProfileExtras: mocks.writeProfileExtras, writeProfileLinks: mocks.writeProfileLinks,
  writeProfilePersonal: mocks.writeProfilePersonal, writeProfileKeywords: vi.fn(), writeProfileRoles: vi.fn(), writeProfileSkills: vi.fn(),
}))

const { saveProfileEntry, saveProfilePersonal } = await import('../profile-cards')

const dates = { startMonth: null, startYear: null, endMonth: null, endYear: null, current: false }
beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
  mocks.readPrimaryResume.mockResolvedValue(null)
  mocks.saveResume.mockResolvedValue({ id: 'r1' })
  mocks.updateResume.mockResolvedValue(true)
  mocks.writeProfilePersonal.mockResolvedValue({ ok: true })
  mocks.writeProfileLinks.mockResolvedValue({ ok: true })
  mocks.writeProfileExtras.mockResolvedValue({ ok: true })
})

describe('Education', () => {
  const ok = { kind: 'education' as const, index: null, institution: 'IIM Sambalpur', major: 'General Management', qualification: 'MBA, General Management', gpa: '', ...dates }
  it.each([
    [{ institution: '' }, 'Add the school.'], [{ major: '' }, 'Add the major.'], [{ qualification: '' }, 'Add the degree type.'],
  ])('will not save without %j', async (patch, message) => {
    expect(await saveProfileEntry({ ...ok, ...patch })).toEqual({ ok: false, error: message })
    expect(mocks.saveResume).not.toHaveBeenCalled()
  })
  it('saves with no GPA (optional), and keeps one when given — in the résumé record', async () => {
    expect((await saveProfileEntry(ok)).ok).toBe(true)
    expect(mocks.saveResume.mock.calls[0][0].sections.education[0]).not.toHaveProperty('gpa')
    mocks.saveResume.mockClear()
    await saveProfileEntry({ ...ok, gpa: '8.4' })
    expect(mocks.saveResume.mock.calls[0][0].sections.education[0]).toMatchObject({ institution: 'IIM Sambalpur', major: 'General Management', gpa: '8.4' })
  })
})

describe('Work experience', () => {
  const ok = { kind: 'experience' as const, index: null, title: 'Account Manager', employer: 'ICICI Bank', location: '', employmentType: 'Full-Time', summary: '', description: '● Led renewals', ...dates }
  it.each([
    [{ title: '' }, 'Add a title.'], [{ employer: '' }, 'Add the company.'], [{ employmentType: '' }, 'Choose the job type.'],
  ])('a job will not save without %j', async (patch, message) => {
    expect(await saveProfileEntry({ ...ok, ...patch })).toEqual({ ok: false, error: message })
  })
  it('a project needs only its name — company and type stay optional', async () => {
    expect((await saveProfileEntry({ ...ok, kind: 'project', employer: '', employmentType: '' })).ok).toBe(true)
  })
  it('keeps the experience summary — and leaves location, dates and summary optional', async () => {
    expect((await saveProfileEntry(ok)).ok).toBe(true)
    expect(mocks.saveResume.mock.calls[0][0].sections.experience[0]).not.toHaveProperty('summary')
    mocks.saveResume.mockClear()
    await saveProfileEntry({ ...ok, summary: 'Owned 150 relationships.' })
    expect(mocks.saveResume.mock.calls[0][0].sections.experience[0].summary).toBe('Owned 150 relationships.')
  })
})

describe('Personal info', () => {
  const ok = {
    firstName: 'Priya', lastName: 'Iyer', phone: '+91 98450 00000', city: 'Bengaluru', preferredName: '', suffixName: '', birthday: '',
    address1: '12 MG Road', address2: '', address3: '', postalCode: '560001', middleName: '', phoneType: '' as const,
    country: 'India', state: 'Karnataka', county: '', linkedinUrl: 'https://www.linkedin.com/in/priya', portfolioUrl: '', githubUrl: '', otherUrl: '',
  }
  it.each([
    ['lastName', 'Add your last name.'], ['phone', 'Add your phone number.'], ['address1', 'Add your address line.'], ['country', 'Add your country.'],
    ['state', 'Add your state or province.'], ['postalCode', 'Add your postal code.'], ['linkedinUrl', 'Add your LinkedIn URL.'],
  ])('will not save without %s', async (field, message) => {
    expect(await saveProfilePersonal({ ...ok, [field]: '' } as typeof ok)).toEqual({ ok: false, error: message })
    expect(mocks.writeProfilePersonal).not.toHaveBeenCalled()
  })
  it('middle name, phone type, county, GitHub and portfolio are optional, and the links are saved with it', async () => {
    expect((await saveProfilePersonal(ok)).ok).toBe(true)
    expect(mocks.writeProfileLinks).toHaveBeenCalledWith('u1', { linkedinUrl: 'https://www.linkedin.com/in/priya', portfolioUrl: '' })
  })
})
