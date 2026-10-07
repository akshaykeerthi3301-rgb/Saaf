/**
 * The daily ingest. Runs in GitHub Actions under the service role.
 *
 * Stages: sync the registry → fetch every active board → normalise per provider
 * → filter to India → upsert roles → extract typed requirements → prune roles
 * unseen for 30 days → recompute gates for every confirmed profile → write
 * today's audit row.
 *
 * A failing board records last_error and does not halt the run. Registry
 * entries rot: Razorpay was live on 2026-09-02 and 404s a day later.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { ADAPTERS, USER_AGENT, adapterFor, type NormalisedRole, type FetchResult } from './providers'
import { extractAll, mentionsUnreadExperience, resolveInIndia } from '../src/gates/extract'
import { classifyFunction, isCorporateRole, isJunkPosting, normaliseTitle } from './classify'
import { pool } from './pool'
import { closureChanges, collapseRepeats, repostHistory, repostKeyOf } from './dedupe'
import { chunk, pageAll } from './paging'

const PRUNE_DAYS = 30
const BATCH = 500

/**
 * Longest job description stored, in characters.
 *
 * `roles.description` is the heavy column by a wide margin — measured over the
 * live index it is 2.5 MB of the table on its own, averaging 3.2 KB a role with
 * a tail to 12 KB. Supabase's free tier is 500 MB total, so it is the column
 * that decides how large the registry can get before the product costs money.
 *
 * 6,000 is set from the actual distribution rather than a round number: the
 * 95th percentile is 6,805, so nineteen roles in twenty are stored untouched
 * and the worst case halves. Only two things read this column — skillsFit's
 * substring matching and requirement extraction — and both are looking for
 * material that appears in the requirements and responsibilities near the top,
 * not in the equal-opportunity boilerplate at the bottom.
 *
 * The trade accepted: a skill named only in the last 20% of an unusually long
 * posting stops being matched. That is a worse outcome than storing everything,
 * and a better one than the index hitting the storage ceiling at 120k roles.
 */
const DESCRIPTION_MAX = 6000

/** Board fetch attempts before the board is recorded as failed for the day. */
const FETCH_ATTEMPTS = 3

/**
 * Boards fetched at once.
 *
 * The run was strictly sequential with a 150ms courtesy sleep between boards:
 * ~1.7s per board, ~34s at 20 boards, and a hard ceiling around 30 because
 * Vercel Hobby kills a function at 60s. Since the registry compounding is the
 * whole moat, that ceiling capped the product's supply.
 *
 * Board fetching is almost entirely network wait, so a small pool removes the
 * ceiling without new infrastructure or a rupee of spend. Kept modest, and the
 * courtesy delay is kept per board, because six third-party ATS providers are
 * doing us a favour by publishing these endpoints at all.
 */
const CONCURRENCY = 6

/** Per-posting detail fetches, for providers whose list endpoint omits the body. */
const DETAIL_CONCURRENCY = 6

/**
 * Stop STARTING new boards after this. The run must degrade into rotation
 * rather than a hard timeout — boards are ordered least-recently-ingested
 * first, so whatever is skipped today is picked up first tomorrow.
 * Leaves room in the 60s budget for recompute, audit and digests.
 *
 * Overridable per invocation because the work is now split across separate
 * cron entries: the ingest route owns nearly the whole 60s window, while the
 * CLI has no ceiling at all and should sweep the entire registry.
 */
const INGEST_BUDGET_MS = Number(process.env.INGEST_BUDGET_MS) || 38_000

/** Re-exported so the pool has one definition and callers that do not need a
 *  database do not have to import this module to get it. See ingest/pool.ts —
 *  scripts/discover-workday.ts used to carry its own copy of the same lines. */
export { pool } from './pool'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * A 404 is an answer; a 503 is a blip.
 *
 * Retrying a permanent failure spends the run's budget proving something we
 * already know, and at 2,000 boards that is the difference between rotating
 * through the registry and not. So only transport faults, timeouts, rate
 * limits and 5xx are retried.
 */
function isTransient(e: unknown): boolean {
  const m = (e as Error)?.message ?? ''
  if (/HTTP (5\d\d|429|408)/.test(m)) return true
  if (/HTTP \d\d\d/.test(m)) return false
  return true // fetch failed, timeout, socket reset, non-JSON body
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (e) {
      last = e
      if (!isTransient(e) || attempt === FETCH_ATTEMPTS - 1) break
      await sleep(400 * 2 ** attempt)
    }
  }
  throw last
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type Board = { provider: string; token: string; company_name: string }

const cityFrom = (loc: string) => loc.split(',')[0]?.trim() || null

/**
 * Push registry/boards.json into the boards table.
 *
 * ⚠️ `active` IS WRITTEN ONLY FOR ROWS THAT DID NOT EXIST. The upsert used to
 * send `active: true` for every board on every run, which silently re-enabled
 * every board the previous run had disabled for having no India roles. At 31
 * boards that was a wasted request a day; at 2,000 it is thousands of dead
 * boards retried forever, eating the rotation budget that real boards need.
 * Deactivation is a fact the ingest learned, and the registry file has no
 * standing to overrule it.
 */
async function syncRegistry(): Promise<void> {
  const boards = JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]

  const existing = await pageAll<{ provider: string; token: string }>((from, to) =>
    db.from('boards').select('provider, token').order('provider').order('token').range(from, to)
  )
  const known = new Set(existing.map((b) => `${b.provider}:${b.token}`))

  const fresh = boards.filter((b) => !known.has(`${b.provider}:${b.token}`))
  const seen = boards.filter((b) => known.has(`${b.provider}:${b.token}`))

  for (const part of chunk(fresh, BATCH)) {
    const { error } = await db.from('boards').insert(
      part.map((b) => ({ provider: b.provider, token: b.token, company_name: b.company_name, active: true }))
    )
    if (error) throw error
  }

  // Company names can be corrected in the file; `active` is deliberately not
  // in this payload, so PostgREST's ON CONFLICT UPDATE leaves it alone.
  for (const part of chunk(seen, BATCH)) {
    const { error } = await db.from('boards').upsert(
      part.map((b) => ({ provider: b.provider, token: b.token, company_name: b.company_name })),
      { onConflict: 'provider,token' }
    )
    if (error) throw error
  }

  console.log(`  registry synced: ${boards.length} boards (${fresh.length} new)`)
}

async function fetchBoard(
  b: { id: string; provider: string; token: string },
  deadline: number,
): Promise<FetchResult> {
  const a = ADAPTERS.find((x) => x.provider === b.provider)
  if (!a) throw new Error(`no adapter for ${b.provider}`)

  // A provider whose listing is not one GET brings its own fetching — Workday's
  // is a POST that pages 20 at a time. See the Adapter type. It reports whether
  // it reached the end, because a short read must not be treated as the truth.
  if (a.fetchAll) return withRetry(() => a.fetchAll!(b.token, { deadline }))

  return withRetry(async () => {
    const res = await fetch(a.url(b.token), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('non-JSON response')
    // One GET returns the whole board, so it is complete by construction.
    return { roles: a.parse(await res.json(), b.token), complete: true }
  })
}

/**
 * Fill in descriptions for providers whose list endpoint has no job body.
 *
 * Only SmartRecruiters needs this today, and only for roles that survived the
 * India and corporate filters — so it is roughly 90 extra requests across five
 * boards, not one per posting fetched. Failures are per-role and silent by
 * design: a missing description costs that role its extracted requirements,
 * which is exactly the state it was already in, and is never worth failing a
 * whole board over.
 */
async function fillDescriptions(
  provider: string,
  token: string,
  roles: NormalisedRole[],
  deadline: number,
) {
  const a = adapterFor(provider)
  if (!a?.detailUrl || !a.parseDetail) return 0

  let skipped = 0
  await pool(roles, DETAIL_CONCURRENCY, async (r) => {
    // ⚠️ THE DEADLINE IS WHAT KEEPS ONE BIG BOARD FROM DEADLOCKING THE RUN.
    // This is one request per kept role: a Workday tenant with 800 India
    // postings is 800 requests, minutes of work, inside a 52-second function.
    // The function would be killed here — before the upsert, so nothing is
    // written and `last_ingested_at` is never stamped — and the board would
    // sort first again tomorrow, and every day after, with the rest of the
    // registry queued behind it forever.
    //
    // Abandoning descriptions is a small, already-tolerated loss: the role is
    // still indexed and still ranks on its title, exactly as it does when a
    // detail fetch fails. The board gets stamped, rotation moves on, and the
    // descriptions arrive on a later run that reaches this board earlier in
    // its budget.
    if (Date.now() > deadline) { skipped++; return }
    try {
      const res = await fetch(a.detailUrl!(token, r.externalId), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) return
      const detail: unknown = await res.json()
      r.description = a.parseDetail!(detail)
      if (a.parseDetailPostedAt) r.postedAt = a.parseDetailPostedAt(detail) ?? r.postedAt
    } catch {
      // Leave the description empty; the role still ranks on its title.
    }
  })
  return skipped
}

export async function runIngest(opts: { budgetMs?: number } = {}) {
  const started = Date.now()
  const budgetMs = opts.budgetMs ?? INGEST_BUDGET_MS
  await syncRegistry()

  // One cheap probe, once per run. max_years arrives with migration 0018, and
  // migrations here are applied by hand in the Supabase SQL editor — so there
  // is a real window where this code is deployed and the column is not there.
  // PostgREST rejects an entire insert batch for one unknown column, which
  // would stop the whole index updating, so the field is written only once the
  // column exists and the run says plainly which mode it is in.
  const hasMaxYears = !(await db.from('role_requirements').select('max_years').limit(1)).error
  if (!hasMaxYears) {
    console.warn(
      '  role_requirements.max_years is missing — run supabase/migrations/0018_requirement_max_years.sql. ' +
      'Experience ceilings are not being stored, so over-qualification is not scored.'
    )
  }

  // Same probe, same reason, for migration 0032 (repost evidence on roles).
  const hasRepost = !(await db.from('roles').select('first_posted_at, repost_count').limit(1)).error
  if (!hasRepost) {
    console.warn('  roles.first_posted_at is missing — run supabase/migrations/0032_role_reposts.sql. Reposts are not being recorded.')
  }

  // And for 0035: roles.closed_at + applications.role_closed_at (a role the board stopped listing).
  const hasClosed =
    !(await db.from('roles').select('closed_at').limit(1)).error &&
    !(await db.from('applications').select('role_closed_at').limit(1)).error
  if (!hasClosed) {
    console.warn('  roles.closed_at is missing — run supabase/migrations/0035_tracker_signals.sql. Taken-down postings are not being recorded.')
  }

  // And for 0041: what the providers themselves say about pay, work mode and contract type.
  const hasFacts = !(await db.from('roles').select('pay_min, pay_max, pay_currency, pay_period, work_mode, employment_type').limit(1)).error
  if (!hasFacts) {
    console.warn('  roles.work_mode is missing — run supabase/migrations/0041_role_provider_fields.sql. Provider-stated pay, work mode and contract type are not being stored.')
  }

  // Least-recently-ingested first, so a run that runs out of budget resumes
  // where it stopped instead of re-fetching the same head of the list. Paged,
  // because the unlimited select silently stopped at 1,000 boards — which is
  // half the registry Phase 3 builds.
  //
  // `id` breaks the tie. last_ingested_at is not unique (a run stamps dozens of
  // boards within the same millisecond), and paging an unstable order returns
  // some rows twice and others never.
  const boards = await pageAll<{ id: string; provider: string; token: string; company_name: string }>(
    (from, to) =>
      db.from('boards').select('id, provider, token, company_name').eq('active', true)
        .order('last_ingested_at', { ascending: true, nullsFirst: true })
        .order('id', { ascending: true })
        .range(from, to)
  )

  let indexed = 0
  let ok = 0
  let skipped = 0
  let partial = 0
  let undescribed = 0
  let retiredCopies = 0
  let closedPostings = 0

  /**
   * When every board must have stopped fetching.
   *
   * Distinct from `budgetMs`, which only decides whether to START a board. A
   * board already in flight has no ceiling without this, and one large enough
   * to outlast the whole function is the failure that matters: it is killed
   * before its upsert, so it is never stamped `last_ingested_at`, so it sorts
   * first again tomorrow and blocks the registry behind it permanently.
   */
  const deadline = started + Math.round(budgetMs * 1.15)

  /**
   * Boards whose full posting list we actually saw this run.
   *
   * ⚠️ THE PRUNE READS THIS AND NOTHING ELSE. A board that was skipped for
   * time, failed, or returned a short read is absent here, so its roles are
   * never eligible for deletion. The old prune was global — every role unseen
   * for 30 days went, whether or not its board had been visited — which at
   * ~80 boards meant rotation itself deleted the index. See docs/CONFLICTS.md
   * F1 and F2.
   */
  const completedBoardIds: string[] = []

  await pool(boards, CONCURRENCY, async (b) => {
    if (Date.now() - started > budgetMs) { skipped++; return }
    try {
      const { roles, complete } = await fetchBoard(b, deadline)
      indexed += roles.length
      // Deduplicate on external_id before upserting. Postgres rejects an
      // ON CONFLICT batch that touches the same row twice, and at least one
      // board (apna) publishes the same shortcode more than once — which
      // failed the whole board rather than one role.
      // Two filters, both at ingest. India, because ATS boards are global. And
      // corporate, because gig and field work is a different labour market with
      // different gates — putting it on the same list is exactly the noise the
      // candidate came here to escape.
      // indiaRaw feeds the board-health check below — a board that's the
      // right company but only posted gig work today is not "the wrong
      // company" and must not be deactivated over it.
      const indiaRaw = roles.filter((r) => resolveInIndia(r.locationRaw))
      const kept = indiaRaw
        .map((r) => ({ ...r, title: normaliseTitle(r.title) }))
        .filter((r) => isCorporateRole(r.title) && !isJunkPosting(r.title))
      const droppedGig = indiaRaw.length - kept.length

      /**
       * Two rounds of deduplication, and they catch different things.
       *
       * external_id       Postgres rejects an ON CONFLICT batch that touches the
       *                   same row twice, and at least one board (apna)
       *                   publishes the same shortcode more than once — which
       *                   failed the whole board rather than one role.
       *
       * title + location  ⚠️ THE ONE THE CANDIDATE SEES. Large employers post
       *                   the same vacancy repeatedly under fresh requisition
       *                   ids: H&M listed "Sales Advisor" 61 times, Solera
       *                   "Principal Software Engineer" 52 times. Every copy has
       *                   a distinct external_id, so the round above keeps them
       *                   all, and the shortlist shows the same card over and
       *                   over. Measured over the first full-scale ingest this
       *                   was 2,141 redundant rows.
       *
       *                   Location is part of the key on purpose. A role open in
       *                   Bengaluru AND Pune is two real choices to a candidate
       *                   — collapsing those would hide a job rather than a
       *                   duplicate, which is the opposite failure.
       */
      const byExternalId = [...new Map(kept.map((r) => [r.externalId, r])).values()]

      // See ingest/dedupe.ts — the rule and the reason it must be stable.
      const india = collapseRepeats(byExternalId)
      const droppedDupes = byExternalId.length - india.length

      // Fetched only for roles we are actually keeping.
      const noDescription = await fillDescriptions(b.provider, b.token, india, deadline)
      if (noDescription) undescribed += noDescription

      /**
       * What this board already stores, read BEFORE the upsert.
       *
       * Two things need it and both lose it to the upsert: the repost history
       * (the survivor's own first_posted_at is about to be overwritten) and the
       * stale copies to retire below (the upsert adds the survivor, so the
       * orphans are the stored rows it does not name). Read once, here. Only
       * when one of them will use it — the retirement is for complete fetches
       * with time left, exactly as before.
       */
      const mayRetire = complete && Date.now() < deadline && india.length > 0
      // ⚠️ NEVER FROM AN EMPTY LISTING. A board that answers 200 with no jobs during an
      // outage looks "complete" and would stamp every role it holds as taken down — on
      // every tracked card as well. A board that really closed its last posting waits
      // for the 30-day prune like before.
      const mayClose = hasClosed && complete && Date.now() < deadline && roles.length > 0
      type Stored = { id: string; external_id: string; title: string; location_raw: string | null; posted_at?: string | null; first_posted_at?: string | null; repost_count?: number; closed_at?: string | null }
      const stored: Stored[] = mayRetire || mayClose || (hasRepost && india.length > 0)
        ? await pageAll<Stored>((from, to) => db.from('roles')
            .select<string, Stored>(['id, external_id, title, location_raw', ...(hasRepost ? ['posted_at, first_posted_at, repost_count'] : []), ...(hasClosed ? ['closed_at'] : [])].join(', '))
            .eq('board_id', b.id).order('id').range(from, to))
        : []
      const history = hasRepost && india.length > 0
        ? repostHistory(byExternalId, stored.map((r) => ({
            externalId: r.external_id, title: r.title, locationRaw: r.location_raw ?? '',
            postedAt: r.posted_at ?? null, firstPostedAt: r.first_posted_at ?? null, repostCount: r.repost_count ?? 0,
          })))
        : null

      // Stored copies the retirement below deletes — a replaced copy is not a closed posting.
      const orphanIds = new Set<string>()

      if (india.length) {
        // Extracted once and reused for both the role row and its requirements
        // — the flag below needs the extraction result, and running it twice
        // per role would double the most expensive part of the daily run.
        const extracted = new Map(
          india.map((r) => [r.externalId, extractAll(r.description, r.locationRaw, r.title)])
        )

        // Chunked. The returned representation is capped at 1,000 rows, so a
        // single upsert of a large Workday board came back short and every role
        // past the cap silently lost its requirements.
        const idFor = new Map<string, string>()
        for (const part of chunk(india, BATCH)) {
          const { data: up, error } = await db.from('roles').upsert(
            part.map((r) => ({
              board_id: b.id,
              external_id: r.externalId,
              title: r.title,
              location_raw: r.locationRaw,
              in_india: true,
              city: cityFrom(r.locationRaw),
              function: classifyFunction(r.title),
              description: r.description.slice(0, DESCRIPTION_MAX),
              apply_url: r.applyUrl,
              posted_at: r.postedAt,
              company_name: b.company_name,
              // The posting talks about years of experience but we could not
              // read a requirement confident enough to gate on. Such a role is
              // never shown as plainly cleared — see src/app/(app)/today.
              unread_experience_mention: mentionsUnreadExperience(
                r.description,
                extracted.get(r.externalId) ?? []
              ),
              last_seen_at: new Date().toISOString(),
              // Listed today, so not closed — clears a posting that reappeared (0035).
              ...(hasClosed ? { closed_at: null } : {}),
              // What the provider itself states (0041). Every key on every row — a bulk
              // upsert writes NULL for a missing one — and null means "not stated".
              ...(hasFacts ? {
                pay_min: r.pay?.min ?? null, pay_max: r.pay?.max ?? null, pay_currency: r.pay?.currency ?? null, pay_period: r.pay?.period ?? null,
                work_mode: r.workMode ?? null, employment_type: r.employmentType ?? null,
              } : {}),
              // Only once 0032 exists — one unknown column fails the whole batch.
              // Both keys on EVERY row: a bulk upsert with differing keys writes
              // NULL for the missing one, and repost_count is NOT NULL.
              ...(history ? (() => {
                const h = history.get(repostKeyOf(r.title, r.locationRaw))
                return { first_posted_at: h?.firstPostedAt ?? null, repost_count: h?.count ?? 0 }
              })() : {}),
            })),
            { onConflict: 'board_id,external_id' }
          ).select('id, external_id')
          if (error) throw error
          for (const row of up ?? []) idFor.set(row.external_id, row.id)
        }

        // Requirements are re-extracted each run: descriptions change, and the
        // extractor itself improves.
        const reqs = india.flatMap((r) => {
          const rid = idFor.get(r.externalId)
          if (!rid) return []
          return (extracted.get(r.externalId) ?? []).map((q) => ({
            role_id: rid,
            kind: q.kind,
            min_years: q.minYears ?? null,
            // Omitted entirely until migration 0018 is applied — PostgREST
            // rejects the whole batch for one unknown column, and a broken
            // ingest is a broken supply. See hasMaxYears above.
            ...(hasMaxYears ? { max_years: q.maxYears ?? null } : {}),
            credential: q.credential ?? null,
            value_text: q.valueText ?? null,
            source_quote: q.sourceQuote.slice(0, 500),
            confidence: q.confidence,
          }))
        })
        // Chunked for the same reason every `.in()` here is: a few hundred
        // uuids in a query string is a URL length no proxy is obliged to serve.
        for (const part of chunk([...idFor.values()], 100)) {
          const { error: dErr } = await db.from('role_requirements').delete().in('role_id', part)
          if (dErr) throw dErr
        }
        for (const part of chunk(reqs, BATCH)) {
          const { error: qErr } = await db.from('role_requirements').insert(part)
          if (qErr) throw qErr
        }

        /**
         * Retire this board's stale copies of a posting we just kept.
         *
         * ⚠️ WITHOUT THIS, DEDUPLICATION NEVER CONVERGES. collapseRepeats keeps
         * one row per title+location, chosen deterministically — but only from
         * what the board publishes TODAY. When the employer adds another
         * requisition for the same vacancy tomorrow, the winner legitimately
         * changes, the upsert writes the new one, and yesterday's winner stays
         * behind as an orphan until the 30-day prune. Measured: cleaning 660
         * duplicates and re-sweeping produced 301 fresh ones. A stable sort
         * fixes which copy wins; only this fixes the copies that already lost.
         *
         * Scoped as narrowly as it can be: same board, same title and location
         * as something we just kept, different external_id. It cannot touch a
         * role the board still publishes, and it cannot touch another board.
         *
         * Complete fetches only, for the same reason the prune is — a partial
         * read is not evidence about what the employer has withdrawn.
         */
        if (mayRetire) {
          const keptIds = new Set(india.map((r) => r.externalId))
          const keptKeys = new Set(
            india.map((r) => `${r.title.toLowerCase()}||${r.locationRaw.toLowerCase()}`)
          )
          const orphans = stored
            .filter((r) =>
              !keptIds.has(r.external_id) &&
              keptKeys.has(`${r.title.toLowerCase()}||${(r.location_raw ?? '').toLowerCase()}`))
            .map((r) => r.id)
          for (const id of orphans) orphanIds.add(id)
          for (const part of chunk(orphans, 100)) {
            const { error: oErr } = await db.from('roles').delete().in('id', part)
            if (oErr) throw oErr
          }
          retiredCopies += orphans.length
        }
      }

      /**
       * Postings the employer took down (0035). A COMPLETE fetch is the whole of
       * what the board lists, so a stored role it does not name has been removed.
       * Judged against the raw list, before the India and corporate filters — a
       * role that merely stopped passing a filter is not closed — and never an
       * orphan copy the retirement above just replaced.
       *
       * Stamped on the application too: the 30-day prune deletes the role and
       * nulls applications.role_id, and a tracked card must still be able to say
       * its posting is gone. A reappearing role is cleared on both.
       */
      if (mayClose) {
        const listed = new Set(roles.map((r) => r.externalId))
        const now = new Date().toISOString()
        const { gone, reopened } = closureChanges(stored, listed, orphanIds)
        for (const part of chunk(gone, 100)) {
          await db.from('roles').update({ closed_at: now }).in('id', part)
          await db.from('applications').update({ role_closed_at: now }).in('role_id', part).is('role_closed_at', null)
        }
        for (const part of chunk(reopened, 100)) {
          await db.from('applications').update({ role_closed_at: null }).in('role_id', part)
        }
        closedPostings += gone.length
      }

      await db.from('boards').update({
        last_ingested_at: new Date().toISOString(),
        last_error: complete ? null : 'partial fetch — board not fully paged; roles kept, prune skipped',
        // A board with no India roles at all is the wrong company. `slice` on
        // Greenhouse is a North Macedonian firm, not the Indian fintech —
        // guessing slugs finds the wrong employer, so stop fetching it daily.
        // Checked against indiaRaw, not the corporate-filtered `india` — a
        // board that's the right company but only posted gig work on a given
        // day was being permanently deactivated by this check before the fix.
        //
        // ⚠️ Only on a COMPLETE read. A board that timed out on page 3 has not
        // demonstrated it has no India roles; deactivating it on a partial
        // fetch retires a real employer over a network blip.
        ...(complete ? { active: indiaRaw.length > 0 } : {}),
      }).eq('id', b.id)

      // A partial board keeps every role it already had: its unreturned
      // postings are not gone from the employer's site, we simply did not
      // reach them. Pruning on that evidence deleted ~97% of a large Workday
      // company's index in one run. See docs/CONFLICTS.md F2.
      if (complete) completedBoardIds.push(b.id)
      else partial++

      ok++
      console.log(`  ${complete ? '✓' : '~'} ${b.company_name.padEnd(16)} ${String(india.length).padStart(4)} kept / ${roles.length}${droppedGig ? `  (${droppedGig} non-corporate dropped)` : ''}${droppedDupes ? `  (${droppedDupes} repeat postings collapsed)` : ''}${complete ? '' : '  PARTIAL'}`)
    } catch (e) {
      // One board failing must never halt the run — the registry compounding is
      // the moat, and a provider outage is not a reason to lose a day.
      await db.from('boards')
        .update({ last_error: (e as Error).message.slice(0, 300), last_ingested_at: new Date().toISOString() })
        .eq('id', b.id)
      console.log(`  ✗ ${b.company_name.padEnd(16)} ${(e as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  })

  // Prune. Load-bearing for the 500 MB free tier, not housekeeping.
  //
  // Scoped to boards fully ingested THIS run. Wall-clock alone is the wrong
  // test the moment the registry is bigger than one run can sweep: rotation
  // means most boards are legitimately 30+ days unvisited, and the global
  // delete read that as "these jobs are gone".
  const cutoff = new Date(Date.now() - PRUNE_DAYS * 86400_000).toISOString()
  let pruned = 0
  for (const part of chunk(completedBoardIds, 100)) {
    const { count, error } = await db
      .from('roles').delete({ count: 'exact' }).in('board_id', part).lt('last_seen_at', cutoff)
    if (error) throw error
    pruned += count ?? 0
  }

  // Retired boards, swept separately.
  //
  // Scoping the prune to boards ingested this run fixes the deletion bug, and
  // introduces a leak in the other direction: a board deactivated for having no
  // India roles is never fetched again, so it is never in completedBoardIds, so
  // whatever roles it left behind are immortal. One board is nothing; the
  // qualification sweep produces thousands, and the 500 MB free tier is the
  // thing that pays for it.
  //
  // Safe because deactivation is not a guess. A board is only deactivated after
  // a COMPLETE fetch that returned zero India roles — so its stored roles are
  // known to be gone from the employer's site, not merely unvisited.
  //
  // ⚠️ IT CANNOT BE SCOPED TO BOARDS DEACTIVATED IN THIS RUN, which is the
  // obvious cheaper version. A board deactivated today still has roles seen
  // today; they only become prunable thirty days later, by which time the board
  // is long retired and no run would look at it again. So the whole retired set
  // has to be swept periodically.
  //
  // Budget-aware, because it is one request per hundred retired boards and the
  // retired set grows with the registry — at ten thousand dead boards that is a
  // hundred round-trips, which is a real share of a 60-second function. Skipping
  // it costs nothing but a day: these roles are already invisible to the
  // product (their board is inactive), so this is storage hygiene, not supply.
  let orphaned = 0
  let retiredSwept = 0
  if (Date.now() - started < budgetMs) {
    const retired = await pageAll<{ id: string }>((from, to) =>
      db.from('boards').select('id').eq('active', false).order('id').range(from, to)
    )
    for (const part of chunk(retired.map((b) => b.id), 100)) {
      if (Date.now() - started > budgetMs) break
      const { count, error } = await db
        .from('roles').delete({ count: 'exact' }).in('board_id', part).lt('last_seen_at', cutoff)
      if (error) throw error
      orphaned += count ?? 0
      retiredSwept += part.length
    }
  }

  console.log(
    `  pruned ${pruned} roles unseen for ${PRUNE_DAYS} days ` +
    `across ${completedBoardIds.length} fully-ingested boards` +
    `${orphaned ? ` · ${orphaned} more from ${retiredSwept} retired boards` : ''}`
  )

  console.log(
    `  ${ok}/${boards.length} boards ok · ${indexed} roles seen` +
    `${partial ? ` · ${partial} partial` : ''}` +
    `${undescribed ? ` · ${undescribed} roles left undescribed for time` : ''}` +
    `${retiredCopies ? ` · ${retiredCopies} superseded repeat postings retired` : ''}` +
    `${closedPostings ? ` · ${closedPostings} postings the employer took down` : ''}` +
    `${skipped ? ` · ${skipped} skipped for time, first up next run` : ''}` +
    ` · ${Math.round((Date.now() - started) / 1000)}s`
  )
  return { indexed, boards: boards.length, ok, partial, skipped, pruned: pruned + orphaned }
}

/**
 * Every stage, in order. This is the CLI's entry point and the local
 * verification path — `npm run ingest` runs the whole pipeline end to end.
 *
 * ⚠️ IT IS NO LONGER WHAT THE CRON CALLS. Four stages chained inside one
 * Vercel function shared a single 60-second budget, so ingest starved recompute
 * and recompute starved the digest; docs/CONFLICTS.md F4 and F5 are both that
 * one fact. Vercel Hobby allows 100 cron jobs per project (one run per day
 * each), so the stages are now four separate cron paths with a full function
 * budget apiece. See vercel.json and src/app/api/cron/.
 */
export async function runAll() {
  const { indexed } = await runIngest()
  const { recomputeAll } = await import('./recompute')
  await recomputeAll()
  const { writeAudit } = await import('./audit')
  await writeAudit()
  const { sendDigests } = await import('./digest')
  await sendDigests()
  return { indexed }
}

// CLI entry point: `npm run ingest`. Skipped when imported by the cron route.
if (process.argv[1]?.includes('ingest/run')) {
  runAll().catch((e) => { console.error(e); process.exit(1) })
}
