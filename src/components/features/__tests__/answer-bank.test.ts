// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/actions/answer-bank', () => ({ saveAnswerBank: async () => ({ ok: true }) }))
const { AnswerBank } = await import('../answer-bank')

const html = (initial: { q: string; a: string; auto: boolean }[], stored = true) => renderToStaticMarkup(createElement(AnswerBank, { initial, stored }))

describe('AnswerBank', () => {
  it('lists a question the extension met, blank, above the answered ones', () => {
    const h = html([{ q: 'Why us?', a: 'Because.', auto: false }, { q: 'Describe a project', a: '', auto: false }])
    expect(h.indexOf('Waiting for your answer (1)')).toBeGreaterThan(-1)
    expect(h.indexOf('Waiting for your answer')).toBeLessThan(h.indexOf('Your answers (1)'))
  })
  it('states that nothing is written for you and what is never filled', () => {
    const h = html([])
    expect(h).toContain('Jobinko never')
    expect(h).toContain('never filled from here')
    expect(h).toContain('Nothing yet')
  })
  it('without the 0046 update, offers no save and says why', () => {
    expect(html([], false)).toContain('0046')
  })
})
