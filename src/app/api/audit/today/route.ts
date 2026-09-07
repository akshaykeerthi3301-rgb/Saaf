import { NextResponse } from 'next/server'
import { istDay } from '@/lib/day'
import { getLatestAudit } from '@/lib/services/audit'

/**
 * The public gate audit. Unauthenticated by design — the landing page renders
 * this before signup, and it is the page's only proof.
 *
 * If today's row is absent because the cron has not run, this returns the most
 * recent day WITH ITS DATE rather than zeros. A zero here would read as a
 * result rather than as missing data.
 *
 * `rolesWithheld` was dropped on 2026-09-05. Nothing is withheld since the
 * pivot, so `ingest/audit.ts` hard-wrote it as 0 and this endpoint published a
 * permanent zero under a name that still asserted the old product.
 */
export const revalidate = 3600

export async function GET() {
  const audit = await getLatestAudit()

  // getLatestAudit() returns null for BOTH no-rows and query-failed, which is
  // the same 503 this returned before — a reader cannot act differently on
  // "the table is empty" than on "we could not read it", and either way the
  // honest answer is that there is no figure to publish yet.
  if (!audit) {
    return NextResponse.json({ error: 'No audit data yet' }, { status: 503 })
  }

  const today = istDay()
  return NextResponse.json(
    {
      day: audit.day,
      stale: audit.day !== today,
      rolesIndexed: audit.rolesIndexed,
      boardsActive: audit.boardsActive,
      byReason: audit.byReason,
    },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
  )
}
