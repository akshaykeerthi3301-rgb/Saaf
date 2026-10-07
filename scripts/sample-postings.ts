/**
 * A stable, board-blind sample of live postings for measuring a parser by hand.
 *
 *   npx tsx --env-file=.env.local scripts/sample-postings.ts 100 /path/to/out.json [offset]
 *
 * `offset` skips the first N of that ordering, so a second, untouched sample can be
 * taken after a parser has been tuned on the first (the tuned numbers are optimistic).
 *
 * Ordered by md5(id), so the same sample comes back until the index changes and
 * nothing about a board, a date or a score decides who is in it. The descriptions
 * are third-party text: write them somewhere untracked (the scratchpad), never to
 * the repo. Used for TASK-179 (job sections) and, later, TASK-176 / TASK-210.
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [, , nArg, outPath, offArg] = process.argv
if (!outPath) { console.error('usage: sample-postings.ts <n> <outfile.json> [offset]'); process.exit(1) }

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const md5 = (s: string) => createHash('md5').update(s).digest('hex')

async function main() {
  const rows: { id: string; title: string; company_name: string | null; description: string; apply_url: string }[] = []
  for (let from = 0; from < 6000; from += 1000) {
    const { data, error } = await db.from('roles').select('id, title, company_name, description, apply_url').eq('in_india', true).range(from, from + 999)
    if (error) throw error
    rows.push(...(data ?? []).filter((r) => r.description && r.description.length > 400))
    if (!data || data.length < 1000) break
  }
  rows.sort((a, b) => md5(a.id).localeCompare(md5(b.id)))
  const start = Number(offArg) || 0
  const out = rows.slice(start, start + (Number(nArg) || 100))
  writeFileSync(outPath, JSON.stringify(out))
  console.log(`${rows.length} eligible; ${out.length} written to ${outPath}`)
}
main()
