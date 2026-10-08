import { describe, it, expect } from 'vitest'
import { forExtension, mergeAsked, questionKey, sanitizeAnswerBank, MAX_ENTRIES } from '../answer-bank'

describe('answer bank', () => {
  it('one question, one key — however the form punctuates it', () => {
    const a = questionKey('Why do you want to work at Razorpay? *')
    expect(a).toBe('why do you want to work at razorpay')
    expect(questionKey('  WHY do you want to work at Razorpay (required) ')).toBe(a)
    expect(questionKey('Why do you want to work at Acme?')).not.toBe(a) // a different company is a different question
  })
  it('keeps only what is well-formed; the first answer per question wins; nothing is auto unless it says so', () => {
    const bank = sanitizeAnswerBank([
      { q: 'Why us?', a: '  Because. ', auto: true },
      { q: 'why us', a: 'second', auto: false },
      { q: '   ', a: 'x' }, { a: 'no question' }, 'junk', null,
      { q: 'Notice period?', a: 5 },
    ])
    expect(bank).toEqual([{ q: 'Why us?', a: 'Because.', auto: true }, { q: 'Notice period?', a: '', auto: false }])
    expect(sanitizeAnswerBank('nope')).toEqual([])
  })
  it('asked questions wait with a blank answer, never overwrite, and stop at the cap', () => {
    const start = [{ q: 'Why us?', a: 'Because.', auto: true }]
    const { bank, handled } = mergeAsked(start, [{ question: 'WHY US' }, { question: 'Describe a time you led a team' }])
    expect(bank).toEqual([start[0], { q: 'Describe a time you led a team', a: '', auto: false }])
    expect(handled).toEqual(['why us', 'describe a time you led a team'])
    const full = Array.from({ length: MAX_ENTRIES }, (_, i) => ({ q: `q${i}`, a: '', auto: false }))
    expect(mergeAsked(full, [{ question: 'one more' }])).toEqual({ bank: full, handled: [] })
  })
  it('the extension is sent answered entries only', () => {
    expect(forExtension([{ q: 'A?', a: 'yes', auto: false }, { q: 'B?', a: '', auto: true }])).toEqual([{ key: 'a', a: 'yes', auto: false }])
  })
})
