'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { FREQUENCIES, MAX_JOBS, MIN_SCORES } from '@/lib/alert-settings'
import { writeAlertSettings } from '@/lib/services/alert-settings'

/** Save the candidate's alert settings. Re-authenticates; the user comes from the session. */
const schema = z.object({
  frequency: z.enum(FREQUENCIES),
  weekday: z.number().int().min(0).max(6),
  minScore: z.number().refine((n) => (MIN_SCORES as readonly number[]).includes(n)),
  maxJobs: z.number().refine((n) => (MAX_JOBS as readonly number[]).includes(n)),
})

export async function saveAlertSettings(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Those settings could not be read.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const res = await writeAlertSettings(user.id, parsed.data)
  return res.ok ? { ok: true as const } : { ok: false as const, error: 'This needs a database update (0042) that has not been applied yet.' }
}
