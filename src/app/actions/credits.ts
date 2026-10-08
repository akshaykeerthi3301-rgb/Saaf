'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redeemPromo } from '@/lib/services/credits'

/** Redeem a promo code. Re-authenticates; the database re-checks the caller and every rule on the code. */
const schema = z.string().min(1).max(60)

export async function redeemPromoCode(code: string) {
  const parsed = schema.safeParse(code)
  if (!parsed.success) return { ok: false as const, message: 'Enter a code.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Not signed in.' }
  return redeemPromo(parsed.data)
}
