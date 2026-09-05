/**
 * False-clearance audit against live data.
 *
 * The one check the 85 unit tests could not make: they run against synthetic
 * strings, and every one of them passed while 5 of 26 cleared roles (19%)
 * stated more experience than the candidate held. Real postings phrase
 * requirements in ways invented examples do not — "What we're looking for:
 * 7-10 years", "5+ years ... (preferably ...)" — and that gap is what shipped
 * the defect.
 *
 * A false clearance is the original harm this product exists to fix, so this
 * exits non-zero when it finds one. Run before every deploy that touches
 * src/gates/, alongside scripts/security-audit.sh.
 *
 *   npx tsx --env-file=.env.local scripts/audit-gates.ts
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/** A year figure stated anywhere near experience vocabulary, in either order. */
const YEARS_NEAR_EXPERIENCE =
  /(\d{1,2})\s*\+?\s*(?:[-‐‑‒–—]|to)?\s*(?:\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b[^.]{0,40}?\b(?:experience|exp|background)\b/gi

/** The highest year figure the description states as an experience bar. */
function statedYears(description: string): number {
  let max = 0
  for (const m of description.matchAll(YEARS_NEAR_EXPERIENCE)) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > 0 && n <= 40) max = Math.max(max, n)
  }
  return max
}

async function main() {
  const { data: profiles, error: pErr } = await db
    .from('profiles')
    .select('id, years_experience, preferred_role')
    .not('confirmed_at', 'is', null)
  if (pErr) throw pErr

  let totalCleared = 0
  let totalFalse = 0

  for (const p of profiles ?? []) {
    const held = Number(p.years_experience ?? 0)
    const { data: rows, error } = await db
      .from('gate_results')
      .select('outcome, roles(title, description, unread_experience_mention)')
      .eq('user_id', p.id)
      .eq('outcome', 'cleared')
    if (error) throw error

    const offenders: string[] = []
    for (const r of rows ?? []) {
      const role = r.roles as unknown as
        { title: string; description: string; unread_experience_mention: boolean | null } | null
      if (!role) continue
      // A role flagged unreadable is shown with the bar stated, never as a
      // plain clearance — it is handled, not a false clearance.
      if (role.unread_experience_mention) continue
      const required = statedYears(role.description)
      if (required > held) offenders.push(`${required}y required · ${role.title}`)
    }

    totalCleared += (rows ?? []).length
    totalFalse += offenders.length
    console.log(
      `  ${String(held).padStart(2)}y · ${JSON.stringify(p.preferred_role ?? '')} — ` +
      `${(rows ?? []).length} cleared, ${offenders.length} false`
    )
    for (const o of offenders) console.log(`      ✗ ${o}`)
  }

  console.log(`\n  ${totalFalse} false clearances across ${totalCleared} cleared results.`)
  if (totalFalse > 0) {
    console.error('  FAIL — a role stating more experience than the candidate holds reached the cleared list.')
    process.exit(1)
  }
  console.log('  Gate audit passed.')
}

main().catch((e) => { console.error(e); process.exit(1) })
