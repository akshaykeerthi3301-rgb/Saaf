'use server'

import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { readAccountExport } from '@/lib/services/account-export'

/** Three exports per ten minutes: it is a handful of reads, but nobody needs more. */
const EXPORT_LIMIT = { scope: 'account-export', limit: 3, windowMs: 10 * 60_000 }

export type ExportResult = { ok: true; filename: string; json: string } | { ok: false; error: string }

/**
 * Everything Saaf holds about the signed-in candidate, as a JSON file.
 * Re-authenticates (an exported action is its own entry point) and takes no input,
 * so there is nothing to validate and nothing a caller can aim at another account:
 * the user is the session's, never a parameter.
 */
export async function exportMyData(): Promise<ExportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const limit = checkRateLimit(user.id, EXPORT_LIMIT)
  if (!limit.ok) return { ok: false, error: 'You have downloaded your data a few times just now. Try again in a few minutes.' }

  try {
    const data = await readAccountExport(user.id, user.email ?? null)
    return { ok: true, filename: `saaf-my-data-${data.exportedAt.slice(0, 10)}.json`, json: JSON.stringify(data, null, 2) }
  } catch {
    return { ok: false, error: 'We could not put your data together just now. Nothing was changed — try again in a moment.' }
  }
}
