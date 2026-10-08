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

describe('the agent’s queue card (TASK-191)', () => {
  it('lists the proposed roles with their scores, links to tailor first, and says nothing is submitted by adding them', async () => {
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { QueueCard } = await import('../ask-saaf')
    const html = renderToStaticMarkup(createElement(QueueCard, {
      card: { type: 'queue', title: '2 Easy-apply roles scoring 75+, not yet tracked', note: 'Adding them only queues them. Nothing is submitted until you press Start.', items: [
        { roleId: 'r1', title: 'Product Manager', company: 'Acme', score: 91, url: 'https://boards.greenhouse.io/a/jobs/1' },
        { roleId: 'r2', title: 'Growth Lead', company: 'Beta', score: 82, url: 'https://jobs.lever.co/b/2' },
      ] },
    }))
    expect(html).toContain('Product Manager')
    expect(html).toContain('>91<')
    expect(html).toContain('/resume/tailor?role=r1')
    expect(html).toContain('Add 2 to my Apply-for-me queue')
    expect(html).toContain('Nothing is submitted')
  })
})
