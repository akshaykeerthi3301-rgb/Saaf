import { describe, it, expect } from 'vitest'
import { CREDITS_SPENDABLE, CREDIT_PRICES, cleanPromo, cleanRef, isPromoShape, isRefShape, reasonLabel, signed } from '../credits'

describe('credits', () => {
  it('nothing costs a credit while nothing is for sale — change this only with TASK-170', () => {
    expect(Object.values(CREDIT_PRICES).every((p) => p === 0)).toBe(true)
    expect(CREDITS_SPENDABLE).toBe(false)
  })
  it('promo codes: typed in any case, with spaces, but only a plausible shape is ever asked of the database', () => {
    expect(cleanPromo('  welcome-10 ')).toBe('WELCOME-10')
    for (const ok of ['welcome-10', 'ABCD', 'LAUNCH2026']) expect(isPromoShape(ok)).toBe(true)
    for (const bad of ['', 'ab', '-ABC', 'has space', 'semi;colon', "x' or '1'='1", 'A'.repeat(41), '<script>']) expect(isPromoShape(bad)).toBe(false)
  })
  it('referral codes are exactly eight letters or digits', () => {
    expect(cleanRef(' ab12cd34 ')).toBe('AB12CD34')
    expect(isRefShape('ab12cd34')).toBe(true)
    for (const bad of ['', 'abc', 'ab12cd345', 'ab12-d34', '../../etc']) expect(isRefShape(bad)).toBe(false)
  })
  it('writes ledger lines readably', () => {
    expect(signed(10)).toBe('+10')
    expect(signed(-3)).toBe('−3')
    expect(reasonLabel('promo')).toBe('Promo code')
    expect(reasonLabel('something-new')).toBe('Credit')
  })
})
