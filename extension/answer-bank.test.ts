// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/autofill.js'
import { questionKey } from '../src/lib/answer-bank'

/**
 * TASK-194 — a custom question is answered only with words the candidate wrote for
 * that exact question. Every case that fills has a twin that does not.
 */
type Result = { filled: { key: string; value: string; how: string }[]; refused: { reason: string }[]; skipped: number; unanswered: { key: string; question: string }[] }
type Autofill = { questionKey: (s: string) => string; fillForm: (p: Record<string, unknown>, d: Document, o?: Record<string, unknown>) => Promise<Result> }
let A: Autofill
beforeAll(() => { A = (globalThis as unknown as { SaafAutofill: Autofill }).SaafAutofill })
afterEach(() => { document.body.innerHTML = '' })

const Q = 'Why do you want to work at Razorpay?'
const bank = (a: string, auto = false) => ({ [questionKey(Q)]: { a, auto } })
const BASE = { fullName: 'Priya Iyer', email: 'priya@example.com' }
const form = (html: string) => { document.body.innerHTML = `<form>${html}</form>`; return document }
const BOX = `<label for="q1">${Q} *</label><textarea id="q1" required></textarea>`
const value = () => (document.querySelector('textarea') as HTMLTextAreaElement).value

describe('the key is the same on both sides', () => {
  it.each(['Why do you want to work at Razorpay? *', 'Notice period (required)', 'Tell us about yourself…', "What's your biggest strength?", 'कुल अनुभव (वर्षों में)'])('%s', (label) => {
    expect(A.questionKey(label)).toBe(questionKey(label))
  })
})

describe('filling a custom question', () => {
  it('fills the candidate’s own answer for the exact question', async () => {
    const res = await A.fillForm({ ...BASE, answerBank: bank('Because payments.') }, form(BOX))
    expect(value()).toBe('Because payments.')
    expect(res.filled).toContainEqual({ key: 'answer', value: 'Because payments.', how: 'typed' })
  })
  it('does not fill a different company’s question with it', async () => {
    const d = form(BOX.replace('Razorpay', 'Zepto'))
    const res = await A.fillForm({ ...BASE, answerBank: bank('Because payments.') }, d)
    expect(value()).toBe('')
    expect(res.unanswered.map((u) => u.question)).toEqual([Q.replace('Razorpay', 'Zepto') + ' *'])
  })
  it('never overwrites what the candidate already typed', async () => {
    const d = form(BOX); (d.querySelector('textarea') as HTMLTextAreaElement).value = 'mine'
    await A.fillForm({ ...BASE, answerBank: bank('Because payments.') }, d)
    expect(value()).toBe('mine')
  })
  it('Apply for me uses an answer only when it was ticked for that', async () => {
    const off = await A.fillForm({ ...BASE, answerBank: bank('Because payments.', false) }, form(BOX), { mode: 'auto' })
    expect(value()).toBe('')
    expect(off.refused.map((r) => r.reason).join()).toMatch(/not for Apply for me/)
    document.body.innerHTML = ''
    await A.fillForm({ ...BASE, answerBank: bank('Because payments.', true) }, form(BOX), { mode: 'auto' })
    expect(value()).toBe('Because payments.')
  })
  it('a required question with no saved answer is reported, not guessed; an optional one is not even reported', async () => {
    const res = await A.fillForm({ ...BASE, answerBank: {} }, form(`${BOX}<label for="q2">Describe a project you are proud of</label><textarea id="q2"></textarea>`))
    expect(value()).toBe('')
    expect(res.unanswered).toHaveLength(1)
    expect(res.unanswered[0].key).toBe(questionKey(Q))
  })
  it('a question already on file (even blank, waiting) is not reported again', async () => {
    const res = await A.fillForm({ ...BASE, answerBank: { [questionKey(Q)]: { a: '', auto: false } } }, form(BOX))
    expect(res.unanswered).toEqual([])
  })
})

describe('what the bank can never answer', () => {
  const NEVER = ['Gender', 'What is your religion?', 'Date of birth', 'Enter your bank account number', 'I agree to the terms and conditions', 'Aadhaar number']
  it.each(NEVER)('%s is left alone even if the bank holds an answer', async (label) => {
    const key = questionKey(label)
    const d = form(`<label for="x">${label}</label><textarea id="x" required></textarea>`)
    const res = await A.fillForm({ ...BASE, answerBank: { [key]: { a: 'SECRET', auto: true } } }, d, { mode: 'auto' })
    expect((d.querySelector('textarea') as HTMLTextAreaElement).value).toBe('')
    expect(res.unanswered).toEqual([])
  })
})
