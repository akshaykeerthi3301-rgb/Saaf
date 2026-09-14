/**
 * The MATCH scorer's benchmark. Run: `npm run bench:match`
 *
 * ⚠️ WHY THIS EXISTS. `src/lib/ats-check.ts` got a bench on 2026-09-12 after six
 * rebuilds had failed to notice the parser was returning nothing. The MATCH
 * scorer — the one that actually decides the shortlist — had no equivalent, and
 * a teardown on 2026-09-14 found the same class of defect hiding in it: three of
 * its six components were paying out at 95-100% on average, so 45 of 100 points
 * were a constant and the ranking barely ranked. A per-component average is the
 * one number that makes that visible, and nothing printed it.
 *
 * It reports two things per profile:
 *   SPREAD    — can the score tell roles apart at all? A standard deviation
 *               near zero means every role looks the same to the candidate.
 *   COMPONENT — the average award per component, as a share of its max. Any
 *               component above ~90% is not discriminating; it is a constant
 *               wearing a weight.
 *
 * Reads the live index, so it needs .env.local. Changes nothing.
 */
import { createServiceClient } from '../src/lib/supabase/service'
import { scoreAgainstIndex } from '../src/lib/score-candidate'
import type { CandidateProfile } from '../src/gates/types'

/** Deliberately spans the functions the index serves well and badly. */
const PROFILES: { label: string; profile: CandidateProfile }[] = [
  ['Backend Engineer', 'Bengaluru', 3],
  ['Data Analyst', 'Bengaluru', 3],
  ['Product Analyst', 'Bengaluru', 2],
  ['Marketing Manager', 'Mumbai', 5],
  ['HR Business Partner', 'Bengaluru', 4],
].map(([role, city, years]) => ({
  label: role as string,
  profile: {
    yearsExperience: years as number,
    currentTitle: role as string,
    preferredRole: role as string,
    city: city as string,
    skills: ['Excel', 'SQL', 'Python', 'stakeholder management'],
  } as CandidateProfile,
}))

const pad = (s: string | number, n: number) => String(s).padEnd(n)
const rpad = (s: string | number, n: number) => String(s).padStart(n)

async function main(): Promise<void> {
  const db = createServiceClient()
  const componentTotals = new Map<string, { earned: number; max: number; n: number }>()

  console.log('\nPROFILE'.padEnd(24) + 'ROLES  MIN  MED  MAX   SD   STRONG')
  console.log('-'.repeat(58))

  for (const { label, profile } of PROFILES) {
    const scored = await scoreAgainstIndex(db, profile, { openToAdjacent: false, limit: 150 })
    if (scored.length === 0) {
      console.log(pad(label, 24) + rpad(0, 5) + '    — no roles scoped —')
      continue
    }
    const totals = scored.map((r) => r.score).sort((a, b) => a - b)
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length
    const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length)
    const median = totals[Math.floor(totals.length / 2)]

    console.log(
      pad(label, 24) +
        rpad(scored.length, 5) +
        rpad(totals[0], 5) +
        rpad(median, 5) +
        rpad(totals.at(-1)!, 5) +
        rpad(sd.toFixed(1), 5) +
        rpad(totals.filter((t) => t >= 50).length, 9),
    )

    for (const role of scored) {
      for (const c of role.breakdown?.components ?? []) {
        if (c.key === 'cap') continue
        const prev = componentTotals.get(c.key) ?? { earned: 0, max: 0, n: 0 }
        componentTotals.set(c.key, { earned: prev.earned + c.points, max: prev.max + c.max, n: prev.n + 1 })
      }
    }
  }

  console.log('\nCOMPONENT AVERAGE AWARD — across every role scored above')
  console.log('-'.repeat(58))
  const rows = [...componentTotals.entries()]
    .map(([key, v]) => ({ key, pct: v.max === 0 ? 0 : Math.round((v.earned / v.max) * 100), n: v.n }))
    .sort((a, b) => b.pct - a.pct)
  for (const r of rows) {
    const flag = r.pct >= 90 ? '  ← constant, not a component' : ''
    console.log(pad(r.key, 16) + rpad(r.pct + '%', 5) + rpad('scored on ' + r.n, 18) + flag)
  }
  const dead = rows.filter((r) => r.pct >= 90)
  console.log(
    `\n${rows.length} components · ${dead.length} paying out at 90%+${dead.length ? ' — ' + dead.map((d) => d.key).join(', ') : ''}\n`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
