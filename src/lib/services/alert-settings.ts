import { createClient } from '@/lib/supabase/server'
import { sanitizeAlertSettings, type AlertSettings } from '@/lib/alert-settings'

/**
 * The candidate's own alert settings (migration 0042). The caller's client: the
 * owner-only profiles policy is the security. A read error means "not stored yet",
 * so the screen can say the update is missing.
 */
export async function readAlertSettings(userId: string): Promise<{ settings: AlertSettings; stored: boolean }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('alert_settings').eq('id', userId).maybeSingle()
  if (error) return { settings: sanitizeAlertSettings(null), stored: false }
  return { settings: sanitizeAlertSettings((data as { alert_settings?: unknown } | null)?.alert_settings), stored: true }
}

export async function writeAlertSettings(userId: string, settings: AlertSettings): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ alert_settings: sanitizeAlertSettings(settings) }).eq('id', userId)
  return { ok: !error }
}
