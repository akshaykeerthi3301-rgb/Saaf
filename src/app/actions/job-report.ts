'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { fileJobReport } from '@/lib/services/job-reports'

const schema = z.object({
  roleId: z.string().uuid(),
  kind: z.enum(['closed', 'scam', 'wrong-details', 'duplicate', 'other']),
  note: z.string().trim().max(450).optional(),
})

/** Per user, not per IP: Indian candidates routinely share an address. */
const LIMIT = { scope: 'job-report', limit: 30, windowMs: 10 * 60 * 1000 }

/**
 * "Report a problem with this posting." Re-authenticates (an exported action is
 * its own entry point) and takes the user id from the session, never the caller.
 */
export async function reportJob(input: z.input<typeof schema>) {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'That report was not complete.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Sign in to send a report.' }

  const limit = checkRateLimit(user.id, LIMIT)
  if (!limit.ok) return { ok: false as const, error: `Too many reports in a row — try again in ${limit.retryAfterSeconds} s.` }

  const res = await fileJobReport(user.id, parsed.data.roleId, parsed.data.kind, parsed.data.note || null)
  if (res.ok) return { ok: true as const }
  return {
    ok: false as const,
    error: res.reason === 'missing-update'
      ? 'Reporting needs a database update that has not been applied yet.'
      : 'We could not record that just now. Try again in a moment.',
  }
}
