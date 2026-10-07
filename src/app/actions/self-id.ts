'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSelfId } from '@/lib/self-id'
import { writeSelfId } from '@/lib/services/self-id'

/**
 * Save the answers a candidate typed for themselves. Re-authenticates (an
 * exported action is its own entry point); the user id comes from the session.
 * The whole set is replaced, so clearing a box removes the answer.
 */
const schema = z.record(z.string().max(40), z.string().max(200)).refine((o) => Object.keys(o).length <= 20)

export async function saveSelfId(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Those answers could not be read.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await writeSelfId(user.id, sanitizeSelfId(parsed.data))
  return res.ok
    ? { ok: true as const }
    : { ok: false as const, error: 'This needs a database update (0038) that has not been applied yet.' }
}
