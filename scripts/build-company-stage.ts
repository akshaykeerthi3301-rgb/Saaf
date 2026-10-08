/**
 * Build src/lib/taxonomy/company-stage.json — which employers in the index are
 * publicly listed, and how old and how big open data says they are (TASK-175).
 *
 *   npx tsx --env-file=.env.local scripts/build-company-stage.ts
 *
 * For every employer name in the live index it asks Wikidata (CC0) through the same
 * strict matcher the Company tab uses — exactly one business with that name, or
 * nothing — and keeps only what it found: { p: 1 } if it is listed on a stock
 * exchange, { f: founded year }, { e: employees }. A company that did not match
 * unambiguously is simply absent, never guessed. Polite: three requests at a time.
 * Re-run after the registry grows; the file is a snapshot dated in its own header.
 */
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { normaliseCompany, readCompanyFacts } from '../src/lib/services/company-facts'
import { displayEmployer } from '../src/lib/display-names'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
/**
 * Employers whose name matched a DIFFERENT, listed company on Wikidata. Found by reading the
 * result: "Pico" (Pico Quantitative Trading, private) matched a listed Pico. A name match is
 * exact but not proof of identity, so a wrong one found later goes here and survives a re-run.
 */
const NOT_THE_SAME = new Set(['pico'])
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const counts = new Map<string, number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('roles').select('company_name').eq('in_india', true).range(from, from + 999)
    if (error) throw error
    for (const r of data ?? []) { const n = displayEmployer(r.company_name); if (n) counts.set(n, (counts.get(n) ?? 0) + 1) }
    if (!data || data.length < 1000) break
  }
  const names = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n)
  console.log(`${names.length} employers`)

  const out: Record<string, { p?: 1; f?: number; e?: number }> = {}
  let done = 0, matched = 0
  const queue = [...names]
  const worker = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      const facts = await readCompanyFacts(name).catch(() => null)
      if (facts) {
        matched++
        const key = normaliseCompany(name)
        const row: { p?: 1; f?: number; e?: number } = {}
        if (facts.publiclyListed) row.p = 1
        if (facts.founded) row.f = facts.founded
        if (facts.employees) row.e = facts.employees
        if (key && !NOT_THE_SAME.has(key) && (row.p || row.f || row.e)) out[key] = row
      }
      if (++done % 100 === 0) console.log(`  ${done}/${names.length} · matched ${matched}`)
      await sleep(120)
    }
  }
  await Promise.all([worker(), worker(), worker()])

  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
  writeFileSync('src/lib/taxonomy/company-stage.json', JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), source: 'Wikidata (CC0), exact-name unambiguous matches only', companies: sorted }))
  const pub = Object.values(sorted).filter((x) => x.p).length
  console.log(`done: ${names.length} employers · ${matched} matched on Wikidata · ${Object.keys(sorted).length} with a fact kept · ${pub} listed`)
}
main()
