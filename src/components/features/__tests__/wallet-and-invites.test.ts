// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/app/actions/credits', () => ({ redeemPromoCode: async () => ({ ok: true, message: 'Added 5 credits.' }) }))
const { WalletAndInvites } = await import('../wallet-and-invites')

const base = { stored: true, balance: 15, rows: [{ id: '1', delta: 10, reason: 'referral', note: null, created_at: '2026-10-01T00:00:00Z' }, { id: '2', delta: 5, reason: 'promo', note: null, created_at: '2026-10-02T00:00:00Z' }], code: 'AB12CD34', joined: 2, invitesStored: true }
const html = (over: Partial<typeof base> = {}) => renderToStaticMarkup(createElement(WalletAndInvites, { ...base, ...over }))

describe('WalletAndInvites', () => {
  it('shows the balance and history, and says plainly that nothing costs a credit yet', () => {
    const h = html()
    expect(h).toContain('>15<')
    expect(h).toContain('Nothing in Saaf costs a credit today')
    expect(h).toContain('A friend joined')
    expect(h).toContain('+10')
  })
  it('names the reward, the cap and how many have joined', () => {
    const h = html()
    expect(h).toContain('you both get 10 credits')
    expect(h).toContain('up to 20 people')
    expect(h).toContain('2 people have joined')
  })
  it('without the 0045 update, offers no promo box or link and says why', () => {
    const h = html({ stored: false, code: null, invitesStored: false })
    expect(h).not.toContain('Redeem')
    expect(h).not.toContain('Copy link')
    expect(h.match(/0045/g)).toHaveLength(2)
  })
})
