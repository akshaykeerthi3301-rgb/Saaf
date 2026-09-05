import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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
  const { data: profiles } = await db
    .from('profiles').select('id, city, function')
    .not('confirmed_at', 'is', null).eq('email_verified', true)
  if (!profiles?.length) { console.log('  digest: no verified confirmed profiles'); return }

  const { data: audit } = await db
    .from('audit_daily').select('roles_indexed').order('day', { ascending: false }).limit(1).maybeSingle()

  const since = new Date(Date.now() - 26 * 3600_000).toISOString()

  for (const p of profiles) {
    const { data: user } = await db.auth.admin.getUserById(p.id)
    const email = user?.user?.email
    if (!email || email.endsWith('.local')) continue // skip test fixtures

    const { data: rows } = await db
      .from('gate_results')
      .select('outcome, reason, score, roles(title, company_name, city)')
      .eq('user_id', p.id)
      .gte('computed_at', since)

    // Nothing is withheld any more — the digest leads with the best-scoring
    // new roles instead of a cleared/withheld split. A strong match is 75+,
    // the same threshold the shortlist uses for its own arithmetic.
    const ranked = [...(rows ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const strong = ranked.filter((r) => (r.score ?? 0) >= 75)

    const lines = ranked.slice(0, 5).map((r) => {
      const role = r.roles as unknown as { title: string; company_name: string | null; city: string | null } | null
      return `• ${role?.title ?? ''} — ${role?.company_name ?? ''}${role?.city ? `, ${role.city}` : ''}\n  ${r.score ?? ''} — ${r.reason}`
    })

    const body = ranked.length
      ? `${audit?.roles_indexed ?? 0} roles indexed · ${ranked.length} new since yesterday · ${strong.length} scoring 75 or above.\n\n${lines.join('\n\n')}\n\nSee the full ranked list, with the working behind every score:\nhttp://localhost:3000/today`
      : `${audit?.roles_indexed ?? 0} roles indexed · nothing new matched your role today.\n\nThat's a thin day for our coverage, not a verdict on you. We'd rather tell you than stay quiet.\n\nhttp://localhost:3000/today`

    try {
      await resend.emails.send({
        from: 'Saaf <onboarding@resend.dev>',
        to: email,
        subject: ranked.length
          ? `${ranked.length} new role${ranked.length === 1 ? '' : 's'} matched today`
          : 'Nothing new matched today',
        text: body,
      })
      console.log(`  digest sent: ${ranked.length} new, ${strong.length} strong`)
    } catch (e) {
      console.log(`  digest failed: ${(e as Error).message}`)
    }
  }
}
