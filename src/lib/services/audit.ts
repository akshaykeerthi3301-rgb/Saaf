import { createClient } from '@supabase/supabase-js'

/**
 * The public index audit — one query, three readers.
 *
 * This question was previously asked in three places, each with its own
 * hand-built Supabase client: the landing strip, the /audit page and the
 * /api/audit/today handler. They had already drifted — the strip selected
 * three columns and the other two selected four — and the "never publish
 * zeros" rule was expressed three different ways. That rule is not a
 * formatting preference: a zero on this page reads as a RESULT rather than as
 * missing data, on the one page whose entire purpose is "check our work".
 *
 * ⚠️ THE CLIENT HERE IS DELIBERATELY THE PLAIN ANON CLIENT, NOT
 * @/lib/supabase/server. `audit_daily` carries no user data and its RLS policy
 * is `public read` — but the reason is mechanical rather than aesthetic: the
 * server client calls `cookies()`, and touching cookies opts a route out of
 * static generation. Both public readers of this data are prerendered with
 * `revalidate = 3600` (they build as ○, not ƒ). Routing them through the
 * cookie-bearing client would silently turn the landing page's proof and the
 * public JSON into per-request server renders.
 *
 * If a second public, session-free read ever appears, this client graduates to
 * `@/lib/supabase/public.ts`. One caller does not justify the indirection.
 */
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

/** The audit row as the product talks about it, rather than as Postgres spells it. */
export type AuditSnapshot = {
  /** YYYY-MM-DD, in IST. Compare against `istDay()`, never a UTC date. */
  day: string
  rolesIndexed: number
  boardsActive: number
  /** Requirement kind → count. Empty object when the column is null. */
  byReason: Record<string, number>
}

type AuditRow = {
  day: string
  roles_indexed: number
  boards_active: number
  by_reason: Record<string, number> | null
}

/**
 * Every column any reader needs. Deliberately one list rather than a
 * per-caller projection — the drift this function exists to end started as
 * exactly that optimisation. `by_reason` is a nine-key JSONB object, so the
 * landing strip over-fetching it is not a cost worth a second code path.
 */
const COLUMNS = 'day, roles_indexed, boards_active, by_reason'

/**
 * The most recent completed audit run, or null.
 *
 * NULL MEANS "NOTHING TO SHOW", and it covers both no-rows and query-failed on
 * purpose. Callers own what to render for it, because the honest empty state
 * differs by surface: the landing strip reserves its height and shows nothing,
 * /audit says no run has completed, and the JSON endpoint returns 503. What
 * none of them may do is render a zero.
 *
 * The row that comes back may be STALE — it is the freshest run, not
 * necessarily today's. It carries its own `day` so a caller can say so.
 */
export async function getLatestAudit(): Promise<AuditSnapshot | null> {
  const { data, error } = await publicClient()
    .from('audit_daily')
    .select(COLUMNS)
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const row = data as unknown as AuditRow
  return {
    day: row.day,
    rolesIndexed: row.roles_indexed,
    boardsActive: row.boards_active,
    byReason: row.by_reason ?? {},
  }
}
