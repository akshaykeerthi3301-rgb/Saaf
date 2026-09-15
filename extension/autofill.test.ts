import { describe, it, expect, beforeAll } from 'vitest'
import '../extension/autofill.js'

/**
 * The extension's form filler.
 *
 * ⚠️ THIS IS TESTED BECAUSE IT WRITES INTO A REAL JOB APPLICATION. A scorer that
 * is wrong shows a bad number; a filler that is wrong puts the wrong phone
 * number, or somebody's salary expectation, into a form a stranger reads. The
 * refusal cases below matter more than the fill cases.
 */
type Verdict = { key?: string; refused?: boolean; reason?: string } | null
type Autofill = {
  classify: (s: string) => Verdict
  valueFor: (k: string, p: Record<string, string>) => string | undefined
  isFillable: (el: unknown) => boolean
  fillForm: (p: Record<string, string>, doc: Document) => {
    filled: { key: string; value: string }[]
    refused: { reason: string }[]
    skipped: number
  }
}
let A: Autofill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Autofill }).SaafAutofill })

describe('what it refuses, which is the important half', () => {
  it.each([
    'Expected CTC', 'Current Salary', 'Desired Pay', 'Expected Salary (per annum)', 'Remuneration',
  ])('refuses money: %s', (label) => {
    const v = A.classify(label)
    expect(v?.refused).toBe(true)
    expect(v?.reason).toMatch(/salary/)
  })

  it.each([
    'Gender', 'Race / Ethnicity', 'Veteran status', 'Disability status', 'Caste', 'Religion',
    'Marital status', 'Date of Birth', 'Sexual orientation', 'Are you pregnant',
  ])('refuses the protected question: %s', (label) => {
    const v = A.classify(label)
    expect(v?.refused).toBe(true)
    expect(v?.reason).toMatch(/demographic/)
  })

  it.each([
    'Why do you want to work here?', 'Cover letter', 'Tell us about yourself',
    'Describe a time you led a team', 'In your own words, what interests you',
  ])('refuses free text the employer asked them: %s', (label) => {
    expect(A.classify(label)?.refused).toBe(true)
  })

  it.each(['Password', 'Aadhaar number', 'PAN', 'Bank account number', 'IFSC'])(
    'refuses the credential or identity number: %s', (label) => {
      expect(A.classify(label)?.refused).toBe(true)
    })

  it('lets a refusal beat a field match when a label triggers both', () => {
    // "current company salary band" matches currentEmployer AND the money rule.
    // Not filling has to win; this is the ordering the classifier depends on.
    const v = A.classify('Current company salary band')
    expect(v?.refused).toBe(true)
  })
})

describe('what it fills', () => {
  it.each([
    ['First Name', 'firstName'], ['Surname', 'lastName'], ['Full Name', 'fullName'],
    ['Email Address', 'email'], ['Mobile Number', 'phone'], ['LinkedIn', 'linkedin'],
    ['Portfolio / Website', 'portfolio'], ['Current Job Title', 'currentTitle'],
    ['Current Employer', 'currentEmployer'], ['Total Experience (years)', 'yearsExperience'],
    ['Notice Period', 'noticePeriod'], ['Current Location', 'city'],
    ['Are you legally authorized to work', 'workAuth'],
  ])('%s → %s', (label, key) => {
    expect(A.classify(label)?.key).toBe(key)
  })

  it('prefers the more specific name field', () => {
    // If "Name" won over "First Name" everyone is called by their full name in
    // the first-name box, on every form.
    expect(A.classify('First Name')?.key).toBe('firstName')
    expect(A.classify('Last Name')?.key).toBe('lastName')
  })

  it('splits a full name for first and last boxes', () => {
    const p = { fullName: 'Priya Iyer Raman' }
    expect(A.valueFor('firstName', p)).toBe('Priya')
    expect(A.valueFor('lastName', p)).toBe('Iyer Raman')
    expect(A.valueFor('fullName', p)).toBe('Priya Iyer Raman')
  })

  it('does not over-refuse an ordinary field', () => {
    // The refusal list runs first and its patterns are broad, so the risk runs
    // both ways: a stem like `age` or `sex` that is too loose starts refusing
    // "Manager" or "Years of experience" and the filler quietly does nothing.
    for (const label of [
      'First Name', 'Last Name', 'Full Name', 'Email Address', 'Mobile Number',
      'Current Employer', 'Current Job Title', 'Total Experience (years)',
      'Notice Period', 'Current Location', 'LinkedIn', 'Portfolio / Website',
      'Are you legally authorized to work',
    ]) {
      const v = A.classify(label)
      expect(v?.refused, `${label} was refused`).toBeUndefined()
      expect(v?.key, `${label} matched nothing`).toBeTruthy()
    }
  })

  it('classifies nothing it does not recognise', () => {
    expect(A.classify('Favourite biscuit')).toBeNull()
    expect(A.classify('')).toBeNull()
  })
})

describe('what it will not write into', () => {
  const el = (attrs: Record<string, unknown>) => ({ tagName: 'INPUT', type: 'text', ...attrs })
  it('never a password, file, checkbox or radio', () => {
    for (const type of ['password', 'file', 'checkbox', 'radio', 'hidden', 'submit']) {
      expect(A.isFillable(el({ type }))).toBe(false)
    }
  })
  it('never a disabled or readonly input', () => {
    expect(A.isFillable(el({ disabled: true }))).toBe(false)
    expect(A.isFillable(el({ readOnly: true }))).toBe(false)
  })
  it('never a select — a wrong choice there is invisible to the candidate', () => {
    expect(A.isFillable({ tagName: 'SELECT' })).toBe(false)
  })
  it('does fill an ordinary text, email, tel or url input', () => {
    for (const type of ['text', 'email', 'tel', 'url', 'number']) {
      expect(A.isFillable(el({ type }))).toBe(true)
    }
  })
})

/**
 * fillForm against a hand-rolled DOM.
 *
 * A fake document rather than jsdom: the suite runs in the `node` environment
 * and adding a DOM for one file is a dependency and a config branch. What is
 * being tested is which inputs get written and which are left alone, and that
 * needs querySelectorAll, .value and an event spy — not a browser.
 */
type FakeEl = {
  tagName: string; type?: string; id?: string; value: string
  disabled?: boolean; readOnly?: boolean
  attrs: Record<string, string>
  events: string[]
  getAttribute(n: string): string | null
  closest(): null
  dispatchEvent(e: { type: string }): boolean
}

const input = (attrs: Record<string, string>, opts: Partial<FakeEl> = {}): FakeEl => ({
  tagName: 'INPUT', type: 'text', value: '', attrs, events: [],
  getAttribute(n) { return this.attrs[n] ?? null },
  closest() { return null },
  dispatchEvent(e) { this.events.push(e.type); return true },
  ...opts,
})

const docOf = (els: FakeEl[]) => ({
  querySelectorAll: () => els,
  querySelector: () => null,
}) as unknown as Document

const PROFILE = {
  fullName: 'Priya Iyer', email: 'priya@example.com', phone: '+91 98765 43210',
  city: 'Bengaluru', currentTitle: 'Product Manager', currentEmployer: 'Paytm',
  yearsExperience: '4', noticePeriod: '30 days',
  linkedin: 'linkedin.com/in/priyaiyer', portfolio: 'github.com/priyaiyer',
}

describe('fillForm, against a form', () => {
  it('fills what it recognises and fires the events a React form listens for', () => {
    const name = input({ name: 'full_name' })
    const email = input({ name: 'email' }, { type: 'email' })
    const res = A.fillForm(PROFILE, docOf([name, email]))

    expect(name.value).toBe('Priya Iyer')
    expect(email.value).toBe('priya@example.com')
    expect(res.filled.map((f) => f.key).sort()).toEqual(['email', 'fullName'])
    // ⚠️ Most ATS front ends read React state, not el.value. A silent
    // assignment looks filled on screen and submits empty.
    expect(name.events).toEqual(['input', 'change'])
  })

  it('never overwrites something the candidate already typed', () => {
    const el = input({ name: 'email' }, { value: 'their.own@address.com' })
    const res = A.fillForm(PROFILE, docOf([el]))
    expect(el.value).toBe('their.own@address.com')
    expect(res.filled).toHaveLength(0)
  })

  it('leaves every refused field untouched and reports why', () => {
    const salary = input({ name: 'expected_ctc' })
    const gender = input({ name: 'gender' })
    const why = input({ name: 'why_do_you_want_to_work_here' })
    const res = A.fillForm(PROFILE, docOf([salary, gender, why]))

    expect(salary.value).toBe('')
    expect(gender.value).toBe('')
    expect(why.value).toBe('')
    expect(res.filled).toHaveLength(0)
    expect(res.refused).toHaveLength(3)
    expect(res.refused.map((r) => r.reason).join(' ')).toMatch(/salary/)
  })

  it('does not touch a disabled, readonly or password input', () => {
    const off = input({ name: 'email' }, { disabled: true })
    const ro = input({ name: 'phone' }, { readOnly: true })
    const pw = input({ name: 'password' }, { type: 'password' })
    A.fillForm(PROFILE, docOf([off, ro, pw]))
    expect([off.value, ro.value, pw.value]).toEqual(['', '', ''])
  })

  it('fills a first/last pair from one stored full name', () => {
    const first = input({ name: 'first_name' })
    const last = input({ name: 'last_name' })
    A.fillForm(PROFILE, docOf([first, last]))
    expect(first.value).toBe('Priya')
    expect(last.value).toBe('Iyer')
  })

  it('skips a field the profile has no value for rather than writing empty', () => {
    const el = input({ name: 'portfolio' })
    const res = A.fillForm({ ...PROFILE, portfolio: '' }, docOf([el]))
    expect(el.value).toBe('')
    expect(res.filled).toHaveLength(0)
  })
})
