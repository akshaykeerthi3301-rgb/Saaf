import { createClient } from '@/lib/supabase/server'
import { cleanPromo, cleanRef, isPromoShape, isRefShape, type LedgerRow } from '@/lib/credits'

/**
 * Credits and referrals (migration 0045; TASK-197/198). Every call is the signed-in
 * candidate's own client: the ledger policy lets them READ their rows and nothing else,
 * and every write is a SECURITY DEFINER function in the database that re-checks the
 * caller — so a bug here cannot mint a credit, only ask the database to.
 * `stored:false` means the update is not applied yet, so the screen can say so.
 */

export type Wallet = { stored: boolean; balance: number; rows: LedgerRow[] }

export async function readWallet(): Promise<Wallet> {
  const supabase = await createClient()
  const [bal, rows] = await Promise.all([
    supabase.rpc('credit_balance'),
    supabase.from('credit_ledger').select('id, delta, reason, note, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  if (bal.error || rows.error) return { stored: false, balance: 0, rows: [] }
  return { stored: true, balance: Number(bal.data ?? 0), rows: (rows.data ?? []) as LedgerRow[] }
}

export async function redeemPromo(raw: string): Promise<{ ok: boolean; message: string }> {
  if (!isPromoShape(raw)) return { ok: false, message: 'That code is not valid.' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('redeem_promo', { p_code: cleanPromo(raw) })
  if (error) return { ok: false, message: 'Codes need a database update (0045) that has not been applied yet.' }
  const row = (Array.isArray(data) ? data[0] : data) as { ok?: boolean; message?: string } | null
  return { ok: row?.ok === true, message: row?.message ?? 'That code is not valid.' }
}

export type Invites = { stored: boolean; code: string | null; joined: number }

/** The candidate's invite code (made on first ask) and how many people joined through it. */
export async function readInvites(userId: string): Promise<Invites> {
  const supabase = await createClient()
  const code = await supabase.rpc('my_referral_code')
  if (code.error) return { stored: false, code: null, joined: 0 }
  const joined = await supabase.from('referrals').select('referred_id', { count: 'exact', head: true }).eq('referrer_id', userId)
  return { stored: true, code: (code.data as string | null) ?? null, joined: joined.count ?? 0 }
}

/**
 * Accept an invite for the account that just signed in. Never throws and never blocks
 * sign-in: the answer is only ever for a log line. The database decides — new account
 * only, never your own code, once.
 */
export async function claimReferral(raw: string | undefined): Promise<string> {
  if (!raw || !isRefShape(raw)) return 'ignored'
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('claim_referral', { p_code: cleanRef(raw) })
  return error ? 'unavailable' : String(data)
}
