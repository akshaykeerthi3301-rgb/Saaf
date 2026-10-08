import { createServiceClient } from '@/lib/supabase/service'

/**
 * Operator switches (migration 0039): service role only, named reads. A privileged
 * read gets a named function here, never an exported admin client.
 */
export type ApplyForMeStatus = { paused: boolean; message: string }

const DEFAULT_MESSAGE = 'Apply for me is paused by Jobinko. Nothing was submitted; your queue is kept.'

/**
 * Is "Apply for me" paused? True if the environment variable APPLY_FOR_ME_PAUSED
 * is "1" (works with no database, takes a redeploy) OR the `apply_for_me_paused`
 * row says 'true' (instant, from the table editor). A missing table or any read
 * error is "not paused" — the switch cannot be the thing that fails closed.
 */
export async function readApplyForMeStatus(): Promise<ApplyForMeStatus> {
  if (process.env.APPLY_FOR_ME_PAUSED === '1') return { paused: true, message: DEFAULT_MESSAGE }
  try {
    const { data, error } = await createServiceClient().from('service_flags').select('value, message').eq('key', 'apply_for_me_paused').maybeSingle()
    if (error || !data) return { paused: false, message: '' }
    const row = data as { value: string; message: string | null }
    return row.value.trim().toLowerCase() === 'true'
      ? { paused: true, message: (row.message || DEFAULT_MESSAGE).slice(0, 200) }
      : { paused: false, message: '' }
  } catch {
    return { paused: false, message: '' }
  }
}
