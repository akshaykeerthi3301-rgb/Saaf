// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EMPTY_VIEW } from '@/lib/feed-query'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
vi.mock('@/app/actions/feed-prefs', () => ({ deleteFilter: async () => ({ ok: true }), hideRole: async () => ({ ok: true }), saveFilter: async () => ({ ok: true }) }))
vi.mock('@/app/actions/search-history', () => ({
  recordSearchAction: async () => ({ ok: true }), rateSearchAction: async () => ({ ok: true }), clearSearchHistoryAction: async () => ({ ok: true }),
}))
const { SearchAnswer, FeedSearch } = await import('../feed-controls')

const entry = { id: 'a', text: 'remote jobs posted this week', view: { ...EMPTY_VIEW, remote: true, posted: '7' as const }, rating: null, at: '2026-10-08T10:00:00Z' }

describe('SearchAnswer — "Read as", with a thumb each way and a copy', () => {
  it('says what was typed and what it was read as', () => {
    const h = renderToStaticMarkup(createElement(SearchAnswer, { entry }))
    expect(h).toContain('remote jobs posted this week')
    expect(h).toContain('Remote · Last week')
  })
  it('offers both ratings and a copy, each named for a screen reader', () => {
    const h = renderToStaticMarkup(createElement(SearchAnswer, { entry }))
    for (const label of ['Read right', 'Read wrong', 'Copy a link to this search']) expect(h).toContain(`aria-label="${label}"`)
  })
  it('shows a stored rating as pressed', () => {
    const h = renderToStaticMarkup(createElement(SearchAnswer, { entry: { ...entry, rating: 'down' as const } }))
    expect(h).toMatch(/aria-pressed="true"[^>]*aria-label="Read wrong"/)
  })
})

describe('FeedSearch', () => {
  it('draws no microphone on the server — the capability is read once mounted', () => {
    const h = renderToStaticMarkup(createElement(FeedSearch, { initial: '', current: EMPTY_VIEW, history: [entry] }))
    expect(h).not.toContain('Search by voice')
    expect(h).toContain('role="search"')
  })
})
