// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'

/**
 * The "Questions for you" list. It must offer exactly the questions the PERSON can answer — a required free-text box, a required
 * yes/no, a required dropdown — and never the ones that stay theirs: gender, caste, disability, files, passwords, consent boxes.
 * And an answer given once is used the next time the same question appears.
 */
type Q = { key: string; question: string; kind: 'text' | 'choice'; options: string[]; el: HTMLElement; els?: HTMLInputElement[] }
type Fill = { fillForm: (p: Record<string, unknown>, d: Document, o?: Record<string, unknown>) => Promise<{ filled: { key: string; value: string; how: string }[] }>; questions: (d: Document) => Q[]; answerQuestion: (q: Q, v: string) => boolean; questionKey: (s: string) => string }
let A: Fill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Fill }).SaafAutofill })
afterEach(() => { document.body.innerHTML = '' })
const page = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }
const PROFILE = { fullName: 'Priya Iyer', email: 'priya@example.com' }

const FORM = `
  <label for="why">Why do you want to work here? *</label><textarea id="why" required></textarea>
  <fieldset><legend>Do you now or in the future require visa sponsorship? *</legend>
    <label><input type="radio" name="spons" value="y" required> Yes</label><label><input type="radio" name="spons" value="n"> No</label></fieldset>
  <label for="hear">How did you hear about us? *</label><select id="hear" required><option value="">Select…</option><option>LinkedIn</option><option>Referral</option></select>
  <fieldset><legend>What is your gender? *</legend><label><input type="radio" name="g" value="m" required> Male</label><label><input type="radio" name="g" value="f"> Female</label></fieldset>
  <label for="cv">Resume/CV *</label><input id="cv" type="file" required>
  <label><input type="checkbox" required> I agree to the privacy policy *</label>`

describe('questions', () => {
  it('lists the text, yes/no and dropdown questions — and never gender, files or consent boxes', () => {
    const qs = A.questions(page(FORM))
    expect(qs.map((q) => [q.kind, q.question])).toEqual([
      ['text', 'Why do you want to work here?'],
      ['choice', 'Do you now or in the future require visa sponsorship?'],
      ['choice', 'How did you hear about us?'],
    ])
    expect(qs[1].options).toEqual(['Yes', 'No'])
    expect(qs[2].options).toEqual(['LinkedIn', 'Referral'])
  })

  it('does not list a question that is already answered, or one that is not required', () => {
    page(FORM)
    ;(document.querySelector('#why') as HTMLTextAreaElement).value = 'Because.'
    expect(A.questions(document).map((q) => q.question)).not.toContain('Why do you want to work here?')
    expect(A.questions(page('<label for="x">Anything else?</label><input id="x">'))).toEqual([])
  })
})

describe('answerQuestion', () => {
  it('writes a typed answer, picks a radio and picks a dropdown option', () => {
    const qs = A.questions(page(FORM))
    expect(A.answerQuestion(qs[0], 'I like the product.')).toBe(true)
    expect(A.answerQuestion(qs[1], 'No')).toBe(true)
    expect(A.answerQuestion(qs[2], 'Referral')).toBe(true)
    expect((document.querySelector('#why') as HTMLTextAreaElement).value).toBe('I like the product.')
    expect((document.querySelector('input[value="n"][name="spons"]') as HTMLInputElement).checked).toBe(true)
    expect((document.querySelector('#hear') as HTMLSelectElement).value).toBe('Referral')
  })
  it('refuses a choice the page does not offer, and a blank answer', () => {
    const qs = A.questions(page(FORM))
    expect(A.answerQuestion(qs[1], 'Maybe')).toBe(false)
    expect(A.answerQuestion(qs[2], 'Twitter')).toBe(false)
    expect(A.answerQuestion(qs[0], '   ')).toBe(false)
  })
})

describe('an answer given once is used next time', () => {
  it('fills the same yes/no and dropdown from the saved answers — and still never the demographic one', async () => {
    const bank = {
      [A.questionKey('Do you now or in the future require visa sponsorship?')]: { a: 'No', auto: false },
      [A.questionKey('How did you hear about us?')]: { a: 'Referral', auto: false },
      [A.questionKey('What is your gender?')]: { a: 'Male', auto: false }, // even if it were saved, the bank is never consulted for it
    }
    page(FORM)
    const res = await A.fillForm({ ...PROFILE, answerBank: bank }, document, { mode: 'manual' })
    expect((document.querySelector('input[value="n"][name="spons"]') as HTMLInputElement).checked).toBe(true)
    expect((document.querySelector('#hear') as HTMLSelectElement).value).toBe('Referral')
    expect((document.querySelector('input[name="g"][value="m"]') as HTMLInputElement).checked).toBe(false)
    expect(res.filled.filter((f) => f.key === 'answer').map((f) => f.value).sort()).toEqual(['No', 'Referral'])
    // what is left to ask: only the free-text question
    expect(A.questions(document).map((q) => q.question)).toEqual(['Why do you want to work here?'])
  })
  it('Apply for me uses only the answers marked for it', async () => {
    const bank = { [A.questionKey('How did you hear about us?')]: { a: 'Referral', auto: false } }
    page(FORM)
    await A.fillForm({ ...PROFILE, answerBank: bank }, document, { mode: 'auto' })
    expect((document.querySelector('#hear') as HTMLSelectElement).value).toBe('')
  })
})
