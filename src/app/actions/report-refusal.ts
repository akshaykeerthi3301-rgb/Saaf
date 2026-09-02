'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ gateResultId: z.string().uuid(), note: z.string().max(500).optional() })

/**
 * "This shouldn't be here."
 *
 * A wrong refusal is the failure that inverts the magic moment into the exact
 * injury this product exists to fix, so every withheld row carries this and
 * reports are triaged as defects rather than feedback.
 *
 * Idempotent: UNIQUE (user_id, gate_result_id) means a second tap is not a
 * second report. RLS enforces that the row belongs to the caller.
 */
export async function reportRefusal(input: { gateResultId: string; note?: string }) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid report.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const { error } = await supabase
    .from('refusal_reports')
    .upsert(
      { user_id: user.id, gate_result_id: parsed.data.gateResultId, note: parsed.data.note ?? null },
      { onConflict: 'user_id,gate_result_id' }
    )
  if (error) return { ok: false as const, error: 'Could not record that.' }
  return { ok: true as const }
}
