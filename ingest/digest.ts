import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { pageAll } from './paging'
import { DEFAULT_ALERTS, lookbackHours, sanitizeAlertSettings, shouldSendToday } from '../src/lib/alert-settings'

/**
 * Where a digest link should point.
 *
 * These links were hardcoded to http://localhost:3000, which shipped in every
 * production digest — a dead link in the one message that has to earn a return
 * visit. The chain is ordered so the fix survives the domain purchase without
 * another code change: SITE_URL wins once a real domain exists,
 * VERCEL_PROJECT_PRODUCTION_URL is the stable production hostname (never the
 * per-deployment VERCEL_URL, which would rot the moment the next deploy lands),
 * and localhost is the local-development fallback.
 */
function siteUrl(): string {
  const explicit = process.env.SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

/**
 * The daily digest.
 *
 * It sends on empty days too, and says so. Every other product in this category
 * goes quiet when it has nothing — which leaves the candidate wondering whether
 * the market rejected them or the tool broke. Saying "nothing new matched today"
 * costs nothing to keep and is the whole differentiator.
 */
export async function sendDigests(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) { console.log('  digest: no RESEND_API_KEY, skipping'); return }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const resend = new Resend(apiKey)

  // email_verified excludes instant sign-in (src/lib/instant-signin.ts) — it
  // never confirms the candidate owns the address they typed, so mailing it
  // daily would mean mailing a stranger who never asked for it.
  // Paged, for the same reason recompute is: past a thousand verified profiles
  // the unbounded select would silently stop, and the people it stopped at
  // would simply never receive a digest again — with no error anywhere.
  const profiles = await pageAll<{ id: string; city: string | null; function: string | null }>(
    (from, to) =>
      db.from('profiles').select('id, city, function')
        .not('confirmed_at', 'is', null).eq('email_verified', true)
        .order('id').range(from, to)
  )
  if (!profiles.length) { console.log('  digest: no verified confirmed profiles'); return }

  const { data: audit } = await db
    .from('audit_daily').select('roles_indexed').order('day', { ascending: false }).limit(1).maybeSingle()

  const runAt = new Date()

  for (const p of profiles) {
    const { data: user } = await db.auth.admin.getUserById(p.id)
    const email = user?.user?.email
    if (!email || email.endsWith('.local')) continue // skip test fixtures

    // The candidate's own alert settings (migration 0042), in a read of their own: the
    // column may not exist yet, and a digest must not stop sending for that. No settings
    // = the old behaviour exactly (daily, 75 and above, five roles).
    const alertRes = await db.from('profiles').select('alert_settings').eq('id', p.id).maybeSingle()
    const alerts = alertRes.error ? DEFAULT_ALERTS : sanitizeAlertSettings((alertRes.data as { alert_settings?: unknown } | null)?.alert_settings)
    if (!shouldSendToday(alerts, runAt)) continue
    const since = new Date(runAt.getTime() - lookbackHours(alerts) * 3600_000).toISOString()

    const { data: allRows } = await db
      .from('gate_results')
      .select('role_id, outcome, reason, score, roles(title, company_name, city)')
      .eq('user_id', p.id)
      .gte('computed_at', since)

    // Jobs the candidate hid (migration 0030) stay out of the email too. A
    // separate read, and its failure is ignored: before 0030 is applied the
    // column does not exist, and a digest must not stop sending for that.
    const { data: prefs } = await db.from('profiles').select('hidden_role_ids').eq('id', p.id).maybeSingle()
    const hidden = new Set(((prefs as { hidden_role_ids?: string[] | null } | null)?.hidden_role_ids) ?? [])
    const rows = (allRows ?? []).filter((r) => !hidden.has((r as { role_id: string }).role_id))

    // Nothing is withheld any more — the digest leads with the best-scoring
    // new roles instead of a cleared/withheld split. A strong match is 75+,
    // the same threshold the shortlist uses for its own arithmetic.
    const ranked = [...(rows ?? [])].filter((r) => (r.score ?? 0) >= alerts.minScore).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const strong = ranked.filter((r) => (r.score ?? 0) >= 75)

    const lines = ranked.slice(0, alerts.maxJobs).map((r) => {
      const role = r.roles as unknown as { title: string; company_name: string | null; city: string | null } | null
      return `• ${role?.title ?? ''} — ${role?.company_name ?? ''}${role?.city ? `, ${role.city}` : ''}\n  ${r.score ?? ''} — ${r.reason}`
    })

    const body = ranked.length
      ? `${audit?.roles_indexed ?? 0} roles indexed · ${ranked.length} new ${alerts.frequency === 'weekly' ? 'this week' : 'since yesterday'} · ${strong.length} scoring 75 or above.\n\n${lines.join('\n\n')}\n\nSee the full ranked list, with the working behind every score:\n${siteUrl()}/today`
      : `${audit?.roles_indexed ?? 0} roles indexed · nothing new matched your role today.\n\nThat's a thin day for our coverage, not a verdict on you. We'd rather tell you than stay quiet.\n\n${siteUrl()}/today`

    // The SDK RETURNS its errors, it does not throw them. A try/catch alone
    // logged "digest sent" for a mail Resend had rejected with a 403 — observed
    // on 2026-09-07, when the daily run reported success while delivering
    // nothing. A send that cannot be confirmed must not be reported as one.
    try {
      const { error } = await resend.emails.send({
        from: 'Saaf <onboarding@resend.dev>',
        to: email,
        subject: ranked.length
          ? `${ranked.length} new role${ranked.length === 1 ? '' : 's'} matched today`
          : 'Nothing new matched today',
        text: body,
      })
      if (error) {
        console.error(`  digest NOT sent to ${email}: ${error.message}`)
      } else {
        console.log(`  digest sent to ${email}: ${ranked.length} new, ${strong.length} strong`)
      }
    } catch (e) {
      console.error(`  digest NOT sent to ${email}: ${(e as Error).message}`)
    }
  }
}
