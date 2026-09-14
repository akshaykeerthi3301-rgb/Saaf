/**
 * Backfill `resume_documents.score` under the v2 scoring model.
 *
 * Run once, after applying migration 0024 by hand:
 *   npm run rescore:saved            # report only, changes nothing
 *   npm run rescore:saved -- --write # apply
 *
 * ⚠️ IT RESCORES FROM STORED TEXT, NEVER FROM A FILE. `resume_documents.body`
 * holds the plain text of the résumé the candidate built here, so no upload is
 * re-read and no source document is needed — which is the only reason this
 * migration is possible at all under a product that deletes what it parses.
 *
 * ⚠️ NO LAYOUT IS PASSED, AND THAT IS CORRECT. `body` is the document as WE
 * rebuilt it — single column, standard headings, one role per line. It has no
 * page geometry because it is not a page, and claiming a column count for it
 * would invent a fact about a file that no longer exists.
 */
import { createClient } from '@supabase/supabase-js'
import { checkResume, AtsCheckError } from '../src/lib/ats-check'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).')
  process.exit(1)
}

const write = process.argv.includes('--write')
const db = createClient(url, key, { auth: { persistSession: false } })

type Row = { id: string; label: string; body: string; target_role: string | null; score: number | null }

async function main(): Promise<void> {
  const { data, error } = await db
    .from('resume_documents')
    .select('id, label, body, target_role, score')
    .eq('score_model', 'v1')
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Row[]
  if (rows.length === 0) {
    console.log('No v1 rows. Nothing to do.')
    return
  }

  console.log(`${rows.length} row(s) on the v1 model.${write ? '' : '  (dry run — pass --write to apply)'}\n`)
  let changed = 0
  let failed = 0
  for (const row of rows) {
    let next: number | null = null
    try {
      next = checkResume(row.body, row.target_role ?? undefined).readability.score
    } catch (e) {
      // A saved résumé shorter than the checker's floor is possible and is not
      // a reason to abort the run. Leave it on v1 and say so.
      failed++
      console.log(`  ${row.id}  ${row.label.slice(0, 28).padEnd(28)}  SKIPPED — ${
        e instanceof AtsCheckError ? e.message : 'unreadable'
      }`)
      continue
    }
    const delta = next - (row.score ?? 0)
    console.log(
      `  ${row.id}  ${row.label.slice(0, 28).padEnd(28)}  ${String(row.score ?? '—').padStart(3)} → ${String(next).padStart(3)}  (${delta >= 0 ? '+' : ''}${delta})`,
    )
    if (write) {
      const { error: upErr } = await db
        .from('resume_documents')
        .update({ score: next, score_model: 'v2' })
        .eq('id', row.id)
      if (upErr) throw new Error(`${row.id}: ${upErr.message}`)
    }
    changed++
  }
  console.log(`\n${changed} rescored${write ? '' : ' (dry run)'}, ${failed} skipped.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
