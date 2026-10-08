import { createClient } from '@/lib/supabase/server'
import { cleanHost } from '@/lib/site-request'

/**
 * File the sites a candidate asked the extension to support (migration 0047). The caller's
 * client — the owner-only policy is the security. Returns the hosts that are now on file (or
 * are not worth filing) so the extension can drop them; on a missing table nothing is
 * returned, so the extension keeps them for next time.
 */
export async function fileSiteRequests(userId: string, hosts: string[]): Promise<{ handled: string[]; filed: number }> {
  const clean = [...new Set(hosts.map((h) => cleanHost(h)).filter((h): h is string => h !== null))].slice(0, 20)
  const dropped = hosts.filter((h) => cleanHost(h) === null)
  if (!clean.length) return { handled: dropped, filed: 0 }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_requests')
    .upsert(clean.map((host) => ({ user_id: userId, host })), { onConflict: 'user_id,host', ignoreDuplicates: true })
    .select('host')
  if (error) return { handled: [], filed: 0 }
  return { handled: [...clean, ...dropped], filed: data?.length ?? 0 }
}
