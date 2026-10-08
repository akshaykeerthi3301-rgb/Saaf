/**
 * How many roles in the live index belong to staffing / recruiting agencies — the
 * evidence behind src/lib/taxonomy/agencies.ts (TASK-175). Read-only.
 *
 *   npx tsx --env-file=.env.local scripts/measure-agencies.ts
 *
 * Prints every employer name in the index that LOOKS like an agency (so the
 * curated list can be checked for what it misses) and, for the curated list, how
 * many Indian roles each holds and what share of the index that is.
 */
import { createClient } from '@supabase/supabase-js'
import { AGENCY_NAMES, isStaffingAgency } from '../src/lib/taxonomy/agencies'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const LOOKS = /(staff|recruit|manpower|placement|workforce|talent|headhunt|search partners|hr solutions|human capital|resourcing)/i

async function main() {
  const counts = new Map<string, number>()
  let total = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('roles').select('company_name').eq('in_india', true).range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) { counts.set(r.company_name ?? '', (counts.get(r.company_name ?? '') ?? 0) + 1); total++ }
    if (!data || data.length < 1000) break
  }
  const names = [...counts.keys()].sort()
  console.log(`${total} Indian roles over ${names.length} employers\n\nNAMES THAT LOOK LIKE AGENCIES (is it on the list?)`)
  for (const n of names.filter((n) => LOOKS.test(n))) console.log(`  ${isStaffingAgency(n) ? '✓ listed ' : '✗ NOT LISTED'}  ${String(counts.get(n)).padStart(5)}  ${n}`)
  const listed = names.filter((n) => isStaffingAgency(n))
  const roles = listed.reduce((a, n) => a + (counts.get(n) ?? 0), 0)
  console.log(`\nCURATED LIST (${AGENCY_NAMES.length} names) matches ${listed.length} employers in the index, holding ${roles} of ${total} Indian roles = ${((100 * roles) / total).toFixed(2)}%`)
  for (const n of listed) console.log(`  ${String(counts.get(n)).padStart(5)}  ${n}`)
}
main()
