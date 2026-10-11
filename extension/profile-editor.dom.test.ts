// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import '../extension/profile-editor.js'

/**
 * The editable tabs of "Your Autofill information". The editor draws forms and decides the ORDER of writes; the server
 * (the Profile page's own save actions) validates. So these tests check what is sent, in what order, and what is blocked
 * before it is sent.
 */
type Ctx = { ed: Record<string, unknown>; profile: Record<string, string>; dirty: (on: boolean, fn?: () => Promise<void>) => void; write: (op: string, input: unknown, refresh?: boolean) => Promise<{ ok: boolean; error?: string }>; saved: (m?: string) => Promise<void> }
let E: { render: (key: string, pane: HTMLElement, c: Ctx) => void }
beforeAll(() => { E = (globalThis as unknown as { SaafEditor: typeof E }).SaafEditor })

const ED = () => ({
  email: 'p@example.com',
  personal: { firstName: 'Priya', lastName: 'Iyer', middleName: '', preferredName: '', suffixName: '', birthday: '', phone: '+91 98450 00000', phoneType: '', address1: '', address2: '', address3: '', country: '', state: '', city: 'Bengaluru', county: '', postalCode: '', linkedinUrl: '', githubUrl: '', portfolioUrl: '', otherUrl: '' },
  education: [
    { index: 0, institution: 'IIM Sambalpur', major: 'General Management', qualification: 'MBA, General Management', gpa: '', startMonth: null, startYear: 2023, endMonth: null, endYear: 2025, current: false },
    { index: 1, institution: 'College of Engineering', major: 'Mechanical', qualification: 'B.Tech, Mechanical', gpa: '', startMonth: null, startYear: 2017, endMonth: null, endYear: 2021, current: false },
  ],
  experience: [{ index: 0, title: 'Manager', employer: 'ICICI Bank', location: '', employmentType: 'Full-Time', summary: '', description: '● Led renewals', startMonth: 6, startYear: 2025, endMonth: null, endYear: null, current: true }],
  skills: ['Excel', 'Power BI'], favourites: ['Excel'],
  selfId: { gender: 'Male' }, work: { authorisedToWork: 'yes', needsSponsorship: 'no', willingToRelocate: '' }, anythingElse: '',
  selfIdFields: [
    { key: 'gender', label: 'What is your gender?', kind: 'text', options: ['Male', 'Female', 'Non-Binary'], required: true },
    { key: 'disability', label: 'Do you have a disability?', kind: 'yesno', required: true },
    { key: 'pronouns', label: 'What are your pronouns?', kind: 'text', options: ['He/Him', 'She/Her'] },
  ],
  choices: { employmentTypes: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'], phoneTypes: ['Home', 'Mobile', 'Work', 'Other'] },
})

let pane: HTMLElement
let saveFn: (() => Promise<void>) | undefined
let dirtyNow = false
const write = vi.fn(async (_op: string, _input: unknown, _refresh?: boolean) => ({ ok: true } as { ok: boolean; error?: string }))
const saved = vi.fn(async (_m?: string) => {})
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ ed: ED(), profile: {}, dirty: (on, fn) => { dirtyNow = on; if (fn) saveFn = fn }, write, saved, ...over })
const q = (sel: string) => pane.querySelector(sel) as HTMLInputElement
const type = (sel: string, v: string, root: ParentNode = pane) => { const el = root.querySelector(sel) as HTMLInputElement; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })) }

beforeEach(() => { document.body.innerHTML = '<div id="p"></div>'; pane = document.getElementById('p') as HTMLElement; saveFn = undefined; dirtyNow = false; write.mockClear(); saved.mockClear(); write.mockResolvedValue({ ok: true }) })

describe('Personal', () => {
  it('is not saveable until something changes, then sends every field with the Jobright-mandatory ones starred', async () => {
    E.render('personal', pane, ctx())
    expect(dirtyNow).toBe(false)
    expect(pane.textContent).toContain('LinkedIn URL')
    expect(pane.querySelectorAll('span[style*="f87171"]').length).toBeGreaterThanOrEqual(9) // first, last, phone, address, country, state, city, postal, LinkedIn
    type('[data-k=address1]', '12 MG Road')
    expect(dirtyNow).toBe(true)
    await saveFn!()
    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0][0]).toBe('personal')
    expect(write.mock.calls[0][1]).toMatchObject({ firstName: 'Priya', address1: '12 MG Road', city: 'Bengaluru', phoneType: '', linkedinUrl: '' })
    expect(saved).toHaveBeenCalledWith('Saved.')
  })
  it('shows the server\'s own refusal and does not claim it saved', async () => {
    write.mockResolvedValue({ ok: false, error: 'Add your last name.' })
    E.render('personal', pane, ctx())
    type('[data-k=lastName]', '')
    await saveFn!()
    expect(q('#ed-msg').textContent).toBe('Add your last name.')
    expect(saved).not.toHaveBeenCalled()
  })
})

describe('Education — the order of writes keeps positions right', () => {
  it('updates what exists, then removes from the highest position down, then adds new ones in reverse', async () => {
    E.render('education', pane, ctx())
    // edit the first, remove the second, add two new
    type('[data-row="0"] [data-k=gpa]', '8.4')
    ;(pane.querySelector('[data-del="1"]') as HTMLButtonElement).click()
    ;(pane.querySelector('#ed-add') as HTMLButtonElement).click()
    type('[data-row="0"] [data-k=institution]', 'New School A')
    ;(pane.querySelector('#ed-add') as HTMLButtonElement).click()
    type('[data-row="0"] [data-k=institution]', 'New School B')
    expect(dirtyNow).toBe(true)
    await saveFn!()
    const calls = write.mock.calls.map(([op, input]) => [op, (input as { index?: number | null; institution?: string }).index, (input as { institution?: string }).institution])
    expect(calls).toEqual([
      ['entry', 0, 'IIM Sambalpur'],      // existing, updated first (GPA now 8.4)
      ['deleteEntry', 1, undefined],       // then removals
      ['entry', null, 'New School A'],     // then adds, reversed: the first card shown ends up first
      ['entry', null, 'New School B'],
    ])
    expect(write.mock.calls[0][1]).toMatchObject({ kind: 'education', gpa: '8.4', major: 'General Management' })
    expect(write.mock.calls.every(([, , refresh]) => refresh === false)).toBe(true) // one refresh at the end, by saved()
    expect(saved).toHaveBeenCalledTimes(1)
  })
  it('stops at the first refusal and says why', async () => {
    write.mockResolvedValueOnce({ ok: false, error: 'Add the major.' })
    E.render('education', pane, ctx())
    type('[data-row="0"] [data-k=major]', '')
    await saveFn!()
    expect(write).toHaveBeenCalledTimes(1)
    expect(q('#ed-msg').textContent).toBe('Add the major.')
    expect(saved).not.toHaveBeenCalled()
  })
})

describe('Work Experience', () => {
  it('sends job type, summary and the dates (current clears the end)', async () => {
    E.render('work', pane, ctx())
    type('[data-k=summary]', 'Owned 150 relationships.')
    ;(pane.querySelector('[data-k=current]') as HTMLInputElement).checked = true
    await saveFn!()
    expect(write.mock.calls[0][1]).toMatchObject({ kind: 'experience', index: 0, title: 'Manager', employer: 'ICICI Bank', employmentType: 'Full-Time', summary: 'Owned 150 relationships.', current: true, endMonth: null, endYear: null })
  })
})

describe('Skills', () => {
  it('adds with Enter, removes with ×, ignores a duplicate, and keeps the favourites that survive', async () => {
    E.render('skill', pane, ctx())
    const add = () => q('#sk-add')
    add().value = 'SQL'; add().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    add().value = 'excel'; add().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) // duplicate (any case)
    ;(pane.querySelector('[data-x="1"]') as HTMLElement).click() // remove Power BI
    expect(dirtyNow).toBe(true)
    await saveFn!()
    expect(write).toHaveBeenCalledWith('skills', { skills: ['Excel', 'SQL'], favourites: ['Excel'] })
  })
})

describe('Equal Employment', () => {
  it('will not save while a starred question is unanswered, and names them', async () => {
    E.render('equal', pane, ctx())
    ;(pane.querySelector('[data-q="w:willingToRelocate"] button') as HTMLButtonElement).click() // touch something to enable Update
    await saveFn!()
    expect(q('#ed-msg').textContent).toMatch(/Please answer this question, marked \*: Do you have a disability\?/)
    expect(write).not.toHaveBeenCalled()
  })
  it('stores a declined starred question as declined, and an optional Decline as empty', async () => {
    E.render('equal', pane, ctx())
    ;(pane.querySelector('[data-q="s:disability"] button[data-clear]') as HTMLButtonElement).click() // Decline to state
    await saveFn!()
    expect(write.mock.calls[0]).toEqual(['selfId', { gender: 'Male', disability: 'decline' }, false])
    expect(write.mock.calls[1][0]).toBe('extras')
    expect(write.mock.calls[1][1]).toMatchObject({ authorisedToWork: 'yes', needsSponsorship: 'no', willingToRelocate: '' })
  })
  it('the two work-permit questions offer Yes and No only', () => {
    E.render('equal', pane, ctx())
    expect([...pane.querySelectorAll('[data-q="w:authorisedToWork"] button')].map((b) => b.textContent)).toEqual(['Yes', 'No'])
    expect([...pane.querySelectorAll('[data-q="w:willingToRelocate"] button')].map((b) => b.textContent)).toEqual(['Yes', 'No', 'Decline to state'])
  })
})
