/**
 * Correct `roles.posted_at` for Greenhouse roles, once.
 *
 *   npm run backfill:posted-dates            # report only, changes nothing
 *   npm run backfill:posted-dates -- --write # apply
 *
 * Until 2026-09-23 the Greenhouse adapter stored `updated_at` — the last edit —
 * as the posting date. Boards bulk-edit, so the stored value was days old on
 * roles published months earlier, and the job card now says "Posted N days
 * ago" from this column. The adapter is fixed; this corrects what it already
 * wrote, rather than waiting ~8 days for ingest rotation to revisit each board
 * while every Greenhouse card overstates its freshness.
 *
 * ⚠️ RUN IT AFTER THE INGEST FIX IS DEPLOYED, NOT BEFORE. The live cron
 * rewrites `posted_at` on every board it visits; run first, and the old code
 * puts `updated_at` straight back.
 *
 * It calls the adapter's own `parse` rather than restating which field is the
 * posting date — one definition, the one ingest uses.
 *
 * Workday is not backfilled: its date needs one detail request per role
 * (10,378 on 2026-09-23). Ingest fetches that detail anyway and now keeps the
 * date, so those roles fill in as boards rotate, showing no date until then.
 */
import { createClient } from '@supabase/supabase-js'
import { adapterFor } from '../ingest/providers'
import { USER_AGENT } from '../ingest/providers/types'
import { pool } from '../ingest/pool'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).')
  process.exit(1)
}

const write = process.argv.includes('--write')
const db = createClient(url, key, { auth: { persistSession: false } })
const greenhouse = adapterFor('greenhouse')!

type Board = { id: string; token: string }
type Row = { id: string; external_id: string; posted_at: string | null }
type Change = { id: string; from: string | null; to: string | null }

async function paged<T>(query: (from: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

async function main(): Promise<void> {
  const boards = await paged<Board>((from) =>
    db.from('boards').select('id, token').eq('provider', 'greenhouse').eq('active', true).range(from, from + 999),
  )

  const changes: Change[] = []
  let checked = 0
  let unreachable = 0

  await pool(boards, 6, async (b) => {
    let dates: Map<string, string | null>
    try {
      const res = await fetch(greenhouse.url(b.token), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) { unreachable++; return }
      dates = new Map(greenhouse.parse(await res.json(), b.token).map((r) => [r.externalId, r.postedAt]))
    } catch {
      unreachable++
      return
    }

    const rows = await paged<Row>((from) =>
      db.from('roles').select('id, external_id, posted_at').eq('board_id', b.id).range(from, from + 999),
    )
    for (const r of rows) {
      // A role the board no longer lists is ingest's to prune, not ours to date.
      if (!dates.has(r.external_id)) continue
      checked++
      const to = dates.get(r.external_id) ?? null
      const same = to === null ? r.posted_at === null : r.posted_at !== null && Date.parse(to) === Date.parse(r.posted_at)
      if (!same) changes.push({ id: r.id, from: r.posted_at, to })
    }
  })

  const toNull = changes.filter((c) => c.to === null).length
  const shifts = changes
    .filter((c) => c.from && c.to)
    .map((c) => (Date.parse(c.from!) - Date.parse(c.to!)) / 86_400_000)
    .sort((a, b) => a - b)
  const median = shifts.length ? shifts[Math.floor(shifts.length / 2)].toFixed(1) : '-'

  console.log(
    `${boards.length} Greenhouse board(s), ${unreachable} unreachable. ${checked} role(s) still listed.\n` +
      `${changes.length} stored date(s) are not the posting date` +
      ` (${toNull} to be cleared: the board gives no first_published).\n` +
      `Median overstatement of freshness: ${median} days.` +
      (write ? '' : '\n(dry run — pass --write to apply)'),
  )
  if (!write || changes.length === 0) return

  let failed = 0
  await pool(changes, 10, async (c) => {
    const { error } = await db.from('roles').update({ posted_at: c.to }).eq('id', c.id)
    if (error) failed++
  })
  console.log(`Wrote ${changes.length - failed}; ${failed} failed.`)
  if (failed) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
