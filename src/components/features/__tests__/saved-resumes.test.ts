// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/actions/resume-documents', () => ({
  deleteSavedResume: async () => ({ ok: true }),
  makePrimaryResume: async () => ({ ok: true }),
}))
const { SavedResumes } = await import('../saved-resumes')

const row = (id: string, isPrimary?: boolean) =>
  ({ id, label: `Résumé ${id}`, targetRole: null, score: 80, updatedAt: '2026-10-01T00:00:00Z', ...(isPrimary === undefined ? {} : { isPrimary }) })
const html = (rows: ReturnType<typeof row>[]) => renderToStaticMarkup(createElement(SavedResumes, { resumes: rows }))

describe('SavedResumes — primary and the slot rule', () => {
  it('states the limit and the rule in the UI', () => {
    const h = html([row('a', true), row('b', false)])
    expect(h).toContain('2 of 10')
    expect(h).toContain('8 slots free')
  })

  it('marks the primary and offers "Make primary" on the others only', () => {
    const h = html([row('a', true), row('b', false)])
    expect(h).toContain('Primary')
    expect(h.match(/Make primary/g)).toHaveLength(1)
  })

  it('without the 0034 update, offers no control it cannot honour and says why', () => {
    const h = html([row('a'), row('b')])
    expect(h).not.toContain('Make primary')
    expect(h).toContain('has not been applied yet')
  })

  it('at the limit says the primary is never the one replaced', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(String(i), i === 0))
    expect(html(rows)).toContain('never your primary')
  })
})
