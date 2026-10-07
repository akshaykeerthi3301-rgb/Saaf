/**
 * Prints how src/lib/job-sections.ts reads a sample made by sample-postings.ts, for
 * a hand check: one line per posting, then one line per section (heading → key and
 * the first words of its body). `--summary` prints only the totals.
 *
 *   npx tsx scripts/measure-job-sections.ts /path/to/sample.json [--summary]
 */
import { readFileSync } from 'node:fs'
import { structureJob } from '../src/lib/job-sections'

const [, , file, flag] = process.argv
const rows = JSON.parse(readFileSync(file, 'utf8')) as { id: string; title: string; company_name: string | null; description: string }[]
let structured = 0
const byKey: Record<string, number> = {}
for (const r of rows) {
  const s = structureJob(r.description)
  if (s.structured) structured++
  for (const x of s.sections) byKey[x.key] = (byKey[x.key] ?? 0) + 1
  if (flag === '--summary') continue
  console.log(`\n#${rows.indexOf(r) + 1} ${r.title} · ${r.company_name} — ${s.structured ? s.sections.length + ' sections' : 'NOT structured'}`)
  for (const x of s.sections) console.log(`   [${x.key}] "${x.heading || '(intro)'}" → ${x.text.slice(0, 70).replace(/\s+/g, ' ')}… (${x.text.length} chars)`)
}
console.log(`\n${structured} of ${rows.length} postings structured; sections by kind: ${JSON.stringify(byKey)}`)
