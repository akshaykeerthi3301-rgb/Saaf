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
  fillForm: (p: Record<string, string>, doc: Document, opts?: Record<string, unknown>) => Promise<{
    filled: { key: string; value: string; how: string }[]
    refused: { reason: string }[]
    skipped: number
  }>
}
let A: Autofill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Autofill }).SaafAutofill })

describe('what it refuses, which is the important half', () => {
  // Money was refused outright until 2026-09-25. It is now a field filled only
  // from the candidate's own figure (see 'salary, from their own figure').
  it.each([
    ['Expected CTC', 'expectedCtc'], ['Current Salary', 'currentCtc'], ['Desired Pay', 'expectedCtc'],
    ['Expected Salary (per annum)', 'expectedCtc'], ['Remuneration', 'currentCtc'],
  ])('reads money as a salary field, never as anything else: %s', (label, key) => {
    expect(A.classify(label)?.key).toBe(key)
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

  it('lets money beat a field match when a label triggers both', () => {
    // "current company salary band" matches currentEmployer AND the money rule.
    // The employer's name is not a salary; money has to win.
    expect(A.classify('Current company salary band')?.key).toBe('currentCtc')
  })

  it('lets a refusal beat everything', () => {
    expect(A.classify('Gender pay gap salary disclosure')?.refused).toBe(true)
  })
})

describe('what it fills', () => {
  it.each([
    ['First Name', 'firstName'], ['Surname', 'lastName'], ['Full Name', 'fullName'],
    ['Email Address', 'email'], ['Mobile Number', 'phone'], ['LinkedIn', 'linkedin'],
    ['Portfolio / Website', 'portfolio'], ['Current Job Title', 'currentTitle'],
    ['Current Employer', 'currentEmployer'], ['Total Experience (years)', 'yearsExperience'],
    ['Notice Period', 'noticePeriod'], ['Current Location', 'city'],
    // Statement form fills. The INTERROGATIVE form of the same question does
    // not — see "the yes/no guard applies to work authorisation too" below.
    ['Work authorisation status', 'workAuth'],
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
      'Work authorisation status',
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
  // Radios, tick-boxes and files take their own paths in fillForm; none is a
  // box text is typed into.
  it('never types into a password, file, checkbox or radio', () => {
    for (const type of ['password', 'file', 'checkbox', 'radio', 'hidden', 'submit']) {
      expect(A.isFillable(el({ type }))).toBe(false)
    }
  })
  it('never a disabled or readonly input', () => {
    expect(A.isFillable(el({ disabled: true }))).toBe(false)
    expect(A.isFillable(el({ readOnly: true }))).toBe(false)
  })
  it('does consider a select — picked only when exactly one option matches', () => {
    expect(A.isFillable({ tagName: 'SELECT' })).toBe(true)
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

describe('fillForm, against a form', async () => {
  it('fills what it recognises and fires the events a React form listens for', async () => {
    const name = input({ name: 'full_name' })
    const email = input({ name: 'email' }, { type: 'email' })
    const res = await A.fillForm(PROFILE, docOf([name, email]))

    expect(name.value).toBe('Priya Iyer')
    expect(email.value).toBe('priya@example.com')
    expect(res.filled.map((f) => f.key).sort()).toEqual(['email', 'fullName'])
    // ⚠️ Most ATS front ends read React state, not el.value. A silent
    // assignment looks filled on screen and submits empty.
    expect(name.events).toEqual(['input', 'change', 'blur'])
  })

  it('never overwrites something the candidate already typed', async () => {
    const el = input({ name: 'email' }, { value: 'their.own@address.com' })
    const res = await A.fillForm(PROFILE, docOf([el]))
    expect(el.value).toBe('their.own@address.com')
    expect(res.filled).toHaveLength(0)
  })

  it('leaves every refused field untouched and reports why', async () => {
    const salary = input({ name: 'expected_ctc' })
    const gender = input({ name: 'gender' })
    const why = input({ name: 'why_do_you_want_to_work_here' })
    const res = await A.fillForm(PROFILE, docOf([salary, gender, why]))

    expect(salary.value).toBe('')
    expect(gender.value).toBe('')
    expect(why.value).toBe('')
    expect(res.filled).toHaveLength(0)
    expect(res.refused).toHaveLength(3)
    expect(res.refused.map((r) => r.reason).join(' ')).toMatch(/salary/)
  })

  it('does not touch a disabled, readonly or password input', async () => {
    const off = input({ name: 'email' }, { disabled: true })
    const ro = input({ name: 'phone' }, { readOnly: true })
    const pw = input({ name: 'password' }, { type: 'password' })
    await A.fillForm(PROFILE, docOf([off, ro, pw]))
    expect([off.value, ro.value, pw.value]).toEqual(['', '', ''])
  })

  it('fills a first/last pair from one stored full name', async () => {
    const first = input({ name: 'first_name' })
    const last = input({ name: 'last_name' })
    await A.fillForm(PROFILE, docOf([first, last]))
    expect(first.value).toBe('Priya')
    expect(last.value).toBe('Iyer')
  })

  it('skips a field the profile has no value for rather than writing empty', async () => {
    const el = input({ name: 'portfolio' })
    const res = await A.fillForm({ ...PROFILE, portfolio: '' }, docOf([el]))
    expect(el.value).toBe('')
    expect(res.filled).toHaveLength(0)
  })
})

/**
 * Captured from a REAL Greenhouse application form on 2026-09-15 — Bluevine
 * India, "Senior Software Engineer - Platform Tools". Every case below was a
 * miss or a wrong fill on the first run against it, and none was findable on
 * the hand-written form above.
 */
describe('a real Greenhouse form, 2026-09-15', () => {
  it('reads "Total Target Cash expectation", which names no money word, as money', () => {
    // Contains neither salary, nor CTC, nor pay, nor compensation. It went
    // unmatched and therefore unreported: left blank by luck, not by rule.
    expect(A.classify('What is your Total Target Cash expectation?*')?.key).toBe('expectedCtc')
  })

  it('reads the plainly worded one beside it as current, despite the question mark', () => {
    expect(A.classify('What is your current CTC ?*')?.key).toBe('currentCtc')
  })

  it('never answers a yes/no question with a fact', () => {
    // ⚠️ THE ONE THAT ACTUALLY WENT WRONG. "Are you currently based in
    // Bengaluru ?" is a free-text box matching `city` through "based in", so
    // the first version wrote "Bengaluru" where the employer wanted "Yes".
    const v = A.classify('Are you currently based in Bengaluru ?*')
    expect(v?.key).toBeUndefined()
    expect(v?.refused).toBe(true)
    expect(v?.reason).toMatch(/yes\/no/)
  })

  it('still answers a question that asks for a value, not a judgement', () => {
    // The interrogative guard must not swallow these two, or the filler loses
    // the only two fields on an Indian form worth filling.
    expect(A.classify('How many years of total work experience do you have?*')?.key)
      .toBe('yearsExperience')
    expect(A.classify('What is your notice period ?*')?.key).toBe('noticePeriod')
  })

  it('reads "years of TOTAL WORK experience", with words in between', () => {
    expect(A.classify('How many years of total work experience do you have?')?.key)
      .toBe('yearsExperience')
    expect(A.classify('Years of experience')?.key).toBe('yearsExperience')
  })

  it('leaves the reCAPTCHA box and the file inputs alone', () => {
    expect(A.classify('g-recaptcha-response')).toBeNull()
    expect(A.isFillable({ tagName: 'INPUT', type: 'file' })).toBe(false)
  })
})

describe('the yes/no guard applies to work authorisation too', () => {
  it('answers the interrogative form only from a stored yes/no, and fills the statement form', () => {
    // We hold "Indian citizen"; the employer asked "yes or no". Writing the
    // former into the latter is the Bengaluru mistake with a different label.
    // Since 2026-09-25 the question maps to the candidate's OWN yes/no answer,
    // which is never derived from the statement.
    expect(A.classify('Are you legally authorized to work in India?')?.key).toBe('authorisedToWork')
    expect(A.valueFor('authorisedToWork', { workAuth: 'Indian citizen' })).toBeUndefined()
    expect(A.classify('Work authorisation status')?.key).toBe('workAuth')
  })
})
