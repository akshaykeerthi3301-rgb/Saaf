/**
 * Backfill `roles.function` after migration 0025 widened its CHECK constraint.
 *
 * Run once, after applying 0025 by hand:
 *   npm run reclassify:roles            # report only, changes nothing
 *   npm run reclassify:roles -- --write # apply
 *
 * ⚠️ IT CALLS `classifyFunction` RATHER THAN RESTATING IT. The alternative was
 * four UPDATE statements inside the migration with the classifier's regexes
 * transcribed into Postgres ARE syntax — the same rules in a second dialect,
 * covered by no test, drifting the first time ingest/classify.ts changes. One
 * definition of what a sales role is, or eventually two that disagree.
 *
 * ⚠️ IT WRITES ONLY THE FOUR FUNCTIONS 0025 ADDS. The first dry run found 30
 * rows stored as `other` that the CURRENT classifier calls engineering or
 * consulting — nothing to do with this change. They are rows ingested under an
 * older version of `classifyFunction` and never revisited, because the ingest
 * classifies on write and never re-reads. Writing them here would fold an
 * unrelated, unreviewed drift into a migration about sales and operations, and
 * at least one is a defect rather than an improvement: "Hindi - AI Voice Data
 * Collection Project" reaches engineering through the pattern's bare `\bai\b`.
 * They are REPORTED and left alone. Widening the engineering pattern, or
 * re-running the whole classifier over the index, is its own decision.
 *
 * Not needed after this one run — the nightly ingest classifies on write, so
 * every role added from now on is already correct.
 */
import { createClient } from '@supabase/supabase-js'
import { classifyFunction, type Fn } from '../ingest/classify'

/** Exactly what migration 0025 added. Anything else is out of scope here. */
const ADDED_BY_0025 = new Set<Fn>(['sales', 'operations', 'support', 'design'])

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).')
  process.exit(1)
}

const write = process.argv.includes('--write')
const db = createClient(url, key, { auth: { persistSession: false } })

type Row = { id: string; title: string }

async function main(): Promise<void> {
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('roles')
      .select('id, title')
      .eq('function', 'other')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }

  if (rows.length === 0) {
    console.log('Nothing classified `other`. Nothing to do.')
    return
  }

  const moves = new Map<string, Row[]>()
  const outOfScope = new Map<string, Row[]>()
  for (const r of rows) {
    const fn = classifyFunction(r.title)
    if (fn === 'other') continue
    const bucket = ADDED_BY_0025.has(fn) ? moves : outOfScope
    const list = bucket.get(fn) ?? []
    list.push(r)
    bucket.set(fn, list)
  }

  const moved = [...moves.values()].reduce((n, l) => n + l.length, 0)
  console.log(
    `${rows.length} role(s) classified \`other\`; ${moved} now match a named function.` +
      (write ? '\n' : '  (dry run — pass --write to apply)\n'),
  )

  for (const [fn, list] of [...moves].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${fn.padEnd(12)} ${String(list.length).padStart(5)}   e.g. ${list[0].title}`)
  }

  if (outOfScope.size) {
    const n = [...outOfScope.values()].reduce((a, l) => a + l.length, 0)
    console.log(
      `\nNOT WRITTEN — ${n} row(s) the current classifier calls something 0025 did not add.` +
        `\nStored \`other\` under an older classifier; unrelated drift, reported not applied:`,
    )
    for (const [fn, list] of outOfScope) {
      console.log(`  ${fn.padEnd(12)} ${String(list.length).padStart(5)}   e.g. ${list[0].title}`)
    }
  }

  if (!write) {
    console.log(`\n${rows.length - moved} stay \`other\`. Pass --write to apply.`)
    return
  }

  // Updated one function at a time rather than one row at a time: the move is
  // decided in TypeScript, so the write only has to carry a list of ids.
  for (const [fn, list] of moves) {
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200).map((r) => r.id)
      const { error } = await db.from('roles').update({ function: fn }).in('id', chunk)
      if (error) throw new Error(`${fn}: ${error.message}`)
    }
    console.log(`  wrote ${String(list.length).padStart(5)} -> ${fn}`)
  }
  console.log(`\n${moved} reclassified. ${rows.length - moved} stay \`other\`.`)
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
