/**
 * Score-honesty audit against live data.
 *
 * This began as a false-clearance check: 5 of 26 cleared roles (19%) stated
 * more experience than the candidate held, and the 85 unit tests all passed
 * throughout because they ran against invented strings rather than real
 * postings. That gap is what shipped the defect.
 *
 * Nothing is withheld or cleared any more — the product ranks. So the
 * invariant moves rather than disappears: a posting that asks for more years
 * than the candidate holds must never score full marks on experience. If it
 * does, the score is telling the candidate a role fits when the posting says
 * otherwise, which is the same lie in a new shape.
 *
 * Run before every deploy touching src/gates/ or src/match/, alongside
 * scripts/security-audit.sh.
 *
 *   npx tsx --env-file=.env.local scripts/audit-gates.ts
 */
import { createClient } from '@supabase/supabase-js'
import type { ScoreBreakdown } from '../src/match/score'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/** A year figure stated near experience vocabulary, in either order. */
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

  let scored = 0
  let offences = 0

  for (const p of profiles ?? []) {
    const held = Number(p.years_experience ?? 0)
    const { data: rows, error } = await db
      .from('gate_results')
      .select('score, score_breakdown, roles(title, description, unread_experience_mention)')
      .eq('user_id', p.id)
    if (error) throw error

    const bad: string[] = []
    for (const r of rows ?? []) {
      const role = r.roles as unknown as
        { title: string; description: string; unread_experience_mention: boolean | null } | null
      const breakdown = r.score_breakdown as ScoreBreakdown | null
      if (!role || !breakdown) continue

      // A posting whose bar we could not read is already shown as low
      // confidence and says so on the card — handled, not a silent claim.
      if (role.unread_experience_mention) continue

      const required = statedYears(role.description)
      if (required <= held) continue

      const seniority = breakdown.components.find((c) => c.key === 'seniority')
      if (seniority && seniority.points >= seniority.max) {
        bad.push(`${required}y required, ${held}y held, seniority ${seniority.points}/${seniority.max} · ${role.title}`)
      }
    }

    scored += (rows ?? []).length
    offences += bad.length
    console.log(
      `  ${String(held).padStart(2)}y · ${JSON.stringify(p.preferred_role ?? '')} — ` +
      `${(rows ?? []).length} scored, ${bad.length} claiming a fit the posting contradicts`
    )
    for (const b of bad) console.log(`      ✗ ${b}`)
  }

  console.log(`\n  ${offences} offences across ${scored} scored roles.`)
  if (offences > 0) {
    console.error('  FAIL — a posting asking for more years than the candidate holds scored full marks on experience.')
    process.exit(1)
  }
  console.log('  Score audit passed.')
}

main().catch((e) => { console.error(e); process.exit(1) })
