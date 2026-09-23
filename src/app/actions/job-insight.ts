'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { readJobInsight, type JobInsight } from '@/lib/services/job-insight'

const schema = z.object({ roleId: z.string().uuid() })

export type JobInsightResult = { ok: true; insight: JobInsight } | { ok: false; error: string }

/**
 * The job panel's read. A server action rather than a route so there is no
 * hand-written URL to guess (CLAUDE.md invariant 2); it re-authenticates
 * because an exported action is its own entry point. No model runs, so no
 * rate limit is charged.
 */
export async function getJobInsight(input: z.input<typeof schema>): Promise<JobInsightResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That role could not be found.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const insight = await readJobInsight(user.id, parsed.data.roleId)
  return insight ? { ok: true, insight } : { ok: false, error: 'That role is no longer in the index.' }
}
