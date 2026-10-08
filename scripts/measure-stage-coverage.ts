/**
 * How much of the live index do the Public / Startup chips and the staffing-agency
 * switch actually touch? (TASK-175.) Read-only.
 *
 *   npx tsx --env-file=.env.local scripts/measure-stage-coverage.ts
 */
import { createClient } from '@supabase/supabase-js'
import { stageChip, STAGE_SNAPSHOT } from '../src/lib/company-stage'
import { isStaffingAgency } from '../src/lib/taxonomy/agencies'
import { displayEmployer } from '../src/lib/display-names'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  const employers = new Map<string, number>()
  let total = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('roles').select('company_name').eq('in_india', true).range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) { const n = displayEmployer(r.company_name); employers.set(n, (employers.get(n) ?? 0) + 1); total++ }
    if (!data || data.length < 1000) break
  }
  let pub = 0, start = 0, pubE = 0, startE = 0, ag = 0
  for (const [n, c] of employers) {
    const s = stageChip(n)
    if (s?.label === 'Public') { pub += c; pubE++ }
    if (s?.label === 'Startup') { start += c; startE++ }
    if (isStaffingAgency(n)) ag += c
  }
  const pct = (n: number) => `${((100 * n) / total).toFixed(1)}%`
  console.log(`snapshot ${STAGE_SNAPSHOT}; ${total} Indian roles over ${employers.size} employers`)
  console.log(`Public chip:  ${pubE} employers, ${pub} roles (${pct(pub)})`)
  console.log(`Startup chip: ${startE} employers, ${start} roles (${pct(start)})`)
  console.log(`Staffing agencies left out by the switch: ${ag} roles (${pct(ag)})`)
}
main()
