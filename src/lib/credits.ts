/**
 * Credits, their price table, and the shape of the codes around them (F-1102 .. F-1106,
 * TASK-197/198). Pure.
 *
 * ⚠️ NOTHING COSTS A CREDIT TODAY. Jobinko is free (PROJECT-STATE Stage AK allows a paid plan
 * but none exists, and the public copy says "free" until one does). `CREDIT_PRICES` is the
 * table the first paid action will be added to; every price in it is 0 on purpose, the
 * wallet says plainly that credits cannot be spent, and a test fails if a price is ever
 * set without someone reading this comment.
 */
export const CREDIT_PRICES: Record<string, number> = {
  // 'ats-api-apply': the first thing likely to cost one (TASK-193, needs an employer key).
}

/** Whether any action costs a credit — the wallet's honesty line reads this. */
export const CREDITS_SPENDABLE = Object.values(CREDIT_PRICES).some((p) => p > 0)

/** Mirrors `v_reward` in migration 0045's claim_referral(); both sides get this many. */
export const REFERRAL_CREDITS = 10

/** A promo code as people type it: letters, digits, dashes; 4 to 40 long. Uppercased before it is asked of the database. */
export const PROMO_SHAPE = /^[A-Z0-9][A-Z0-9-]{3,39}$/
export const cleanPromo = (raw: string) => raw.trim().toUpperCase()
export const isPromoShape = (raw: string) => PROMO_SHAPE.test(cleanPromo(raw))

/** Set by /r/<code>, read when a brand-new account signs in. httpOnly, a week: the claim itself only accepts accounts under two days old. */
export const REF_COOKIE = 'saaf_ref'
export const REF_COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/** The 8-character referral code my_referral_code() makes. */
export const REF_SHAPE = /^[A-Z0-9]{8}$/
export const cleanRef = (raw: string) => raw.trim().toUpperCase()
export const isRefShape = (raw: string) => REF_SHAPE.test(cleanRef(raw))

export type LedgerRow = { id: string; delta: number; reason: string; note: string | null; created_at: string }

const REASON: Record<string, string> = {
  promo: 'Promo code', referral: 'A friend joined', 'referral-welcome': 'Joined through an invite', grant: 'Credit from Jobinko', spend: 'Spent', refund: 'Refund',
}
export const reasonLabel = (r: string) => REASON[r] ?? 'Credit'

/** "+10" / "−3". A real minus sign, so a screen reader and a column both read it as one. */
export const signed = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('en-IN')}`
