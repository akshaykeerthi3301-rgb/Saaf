import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await db
    .from('audit_daily')
    .select('day, roles_indexed, boards_active, by_reason')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'No audit data yet' }, { status: 503 })
  }

  const today = new Date().toISOString().slice(0, 10)
  return NextResponse.json(
    {
      day: data.day,
      stale: data.day !== today,
      rolesIndexed: data.roles_indexed,
      boardsActive: data.boards_active,
      byReason: data.by_reason,
    },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
  )
}
