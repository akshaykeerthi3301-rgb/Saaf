// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: unknown }) => createElement('a', { href }, children as never) }))
vi.mock('@/app/actions/assistant', () => ({ askSaaf: async () => ({ ok: true, answer: { intent: 'help', cards: [] } }) }))
const { AskSaaf } = await import('../ask-saaf')
const { PROMPTS } = await import('@/lib/assistant')

describe('AskSaaf', () => {
  const html = renderToStaticMarkup(createElement(AskSaaf))
  it('says what it is and what it will not do', () => {
    expect(html).toContain('answered from your own data')
    expect(html).toContain('does not guess at anything else')
  })
  it('offers every question it can answer as a button', () => {
    for (const p of PROMPTS) expect(html).toContain(p.label)
  })
  it('draws no microphone on the server — the capability is read once mounted', () => {
    expect(html).not.toContain('Ask by voice')
  })
  it('has a labelled question box', () => {
    expect(html).toContain('aria-label="Ask a question about your shortlist"')
  })
})
