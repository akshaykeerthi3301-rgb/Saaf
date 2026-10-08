'use client'

import { useId, useState, useSyncExternalStore } from 'react'
import { redeemPromoCode } from '@/app/actions/credits'
import { CREDITS_SPENDABLE, REFERRAL_CREDITS, reasonLabel, signed, type LedgerRow } from '@/lib/credits'

/**
 * Credits, a promo-code box, and the candidate's invite link (F-1102..1105, F-1210).
 * ⚠️ NOTHING IS FOR SALE YET, and this says so before anything else: a balance that looks
 * spendable and is not would be the product claiming something it cannot do. When a price
 * lands in CREDIT_PRICES (TASK-170) the sentence changes with it, by itself.
 */
export function WalletAndInvites({ stored, balance, rows, code, joined, invitesStored }: {
  stored: boolean; balance: number; rows: LedgerRow[]; code: string | null; joined: number; invitesStored: boolean
}) {
  const id = useId()
  const [bal, setBal] = useState(balance)
  const [history, setHistory] = useState(rows)
  const [promo, setPromo] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string>()
  // The page's own address, read in the browser only (the server render has none to show).
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => '')
  const [copied, setCopied] = useState(false)
  const link = code ? `${origin}/r/${code}` : ''

  async function redeem(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setNote(undefined)
    const r = await redeemPromoCode(promo).catch(() => ({ ok: false as const, message: 'Check your connection and try again.' }))
    setBusy(false); setNote(r.message)
    if (r.ok) {
      const added = Number(/\d+/.exec(r.message)?.[0] ?? 0)
      setBal((b) => b + added)
      setHistory((h) => [{ id: `new-${Date.now()}`, delta: added, reason: 'promo', note: null, created_at: new Date().toISOString() }, ...h])
      setPromo('')
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* the link is on screen to select */ }
  }

  const input = 'w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/10'
  return (
    <div className="mt-8 border-t border-border pt-6" data-testid="wallet">
      <h2 className="text-lg font-semibold tracking-[-0.03em] text-primary">Credits</h2>
      {!stored ? (
        <p role="note" className="mt-2 text-xs leading-5 text-muted-foreground">Credits need a database update (0045) that has not been applied yet.</p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            You have <strong className="text-primary" data-testid="credit-balance">{bal.toLocaleString('en-IN')}</strong> credits.{' '}
            {CREDITS_SPENDABLE ? 'Some actions use them.' : 'Nothing in Jobinko costs a credit today — everything is still free. Yours are kept for when something does.'}
          </p>
          <form onSubmit={redeem} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="block flex-1 text-xs font-semibold text-primary" htmlFor={`${id}-p`}>
              Promo code
              <input id={`${id}-p`} className={`${input} mt-1 uppercase`} value={promo} onChange={(e) => setPromo(e.target.value)} autoComplete="off" maxLength={40} />
            </label>
            <button type="submit" disabled={busy || !promo.trim()} className="bg-brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? 'Checking…' : 'Redeem'}</button>
          </form>
          {note ? <p role="status" className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
          {history.length ? (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border text-sm" aria-label="Credit history">
              {history.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-primary">{reasonLabel(r.reason)}<span className="ml-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></span>
                  <span className="font-semibold tabular-nums text-primary">{signed(r.delta)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.03em] text-primary">Invite a friend</h2>
      {!invitesStored || !code ? (
        <p role="note" className="mt-2 text-xs leading-5 text-muted-foreground">Invite links need a database update (0045) that has not been applied yet.</p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            When someone new joins through your link, you both get {REFERRAL_CREDITS} credits (for up to 20 people).
            {joined ? ` ${joined} ${joined === 1 ? 'person has' : 'people have'} joined through yours.` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input readOnly aria-label="Your invite link" value={link} onFocus={(e) => e.currentTarget.select()} className={`${input} flex-1 font-mono text-xs`} />
            <button type="button" onClick={copy} disabled={!link} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </>
      )}
    </div>
  )
}
