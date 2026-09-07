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
import { ADAPTERS, USER_AGENT, adapterFor, type NormalisedRole } from './providers'
import { extractAll, mentionsUnreadExperience, resolveInIndia } from '../src/gates/extract'
import { classifyFunction, isCorporateRole, isJunkPosting, normaliseTitle } from './classify'

const PRUNE_DAYS = 30
const BATCH = 500

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
 */
const INGEST_BUDGET_MS = 38_000

/** Bounded-concurrency map. No dependency; the pool is four lines. */
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) await worker(items[cursor++])
  })
  await Promise.all(runners)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type Board = { provider: string; token: string; company_name: string }

const cityFrom = (loc: string) => loc.split(',')[0]?.trim() || null

async function syncRegistry(): Promise<void> {
  const boards = JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]
  const { error } = await db.from('boards').upsert(
    boards.map((b) => ({ provider: b.provider, token: b.token, company_name: b.company_name, active: true })),
    { onConflict: 'provider,token' }
  )
  if (error) throw error
  console.log(`  registry synced: ${boards.length} boards`)
}

async function fetchBoard(b: { id: string; provider: string; token: string }): Promise<NormalisedRole[]> {
  const a = ADAPTERS.find((x) => x.provider === b.provider)
  if (!a) throw new Error(`no adapter for ${b.provider}`)

  // A provider whose listing is not one GET brings its own fetching — Workday's
  // is a POST that pages 20 at a time. See the Adapter type.
  if (a.fetchAll) return a.fetchAll(b.token)

  const res = await fetch(a.url(b.token), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('non-JSON response')
  return a.parse(await res.json(), b.token)
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
async function fillDescriptions(provider: string, token: string, roles: NormalisedRole[]) {
  const a = adapterFor(provider)
  if (!a?.detailUrl || !a.parseDetail) return

  await pool(roles, DETAIL_CONCURRENCY, async (r) => {
    try {
      const res = await fetch(a.detailUrl!(token, r.externalId), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) return
      r.description = a.parseDetail!(await res.json())
    } catch {
      // Leave the description empty; the role still ranks on its title.
    }
  })
}

export async function runIngest() {
  const started = Date.now()
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

  // Least-recently-ingested first, so a run that runs out of budget resumes
  // where it stopped instead of re-fetching the same head of the list.
  const { data: boards, error: bErr } = await db
    .from('boards').select('id, provider, token, company_name').eq('active', true)
    .order('last_ingested_at', { ascending: true, nullsFirst: true })
  if (bErr) throw bErr

  let indexed = 0
  let ok = 0
  let skipped = 0
  const seenRoleIds: string[] = []

  await pool(boards ?? [], CONCURRENCY, async (b) => {
    if (Date.now() - started > INGEST_BUDGET_MS) { skipped++; return }
    try {
      const roles = await fetchBoard(b)
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
      const india = [...new Map(kept.map((r) => [r.externalId, r])).values()]

      // Fetched only for roles we are actually keeping.
      await fillDescriptions(b.provider, b.token, india)

      if (india.length) {
        // Extracted once and reused for both the role row and its requirements
        // — the flag below needs the extraction result, and running it twice
        // per role would double the most expensive part of the daily run.
        const extracted = new Map(
          india.map((r) => [r.externalId, extractAll(r.description, r.locationRaw, r.title)])
        )

        const { data: up, error } = await db.from('roles').upsert(
          india.map((r) => ({
            board_id: b.id,
            external_id: r.externalId,
            title: r.title,
            location_raw: r.locationRaw,
            in_india: true,
            city: cityFrom(r.locationRaw),
            function: classifyFunction(r.title),
            description: r.description,
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
          })),
          { onConflict: 'board_id,external_id' }
        ).select('id, external_id')
        if (error) throw error

        // Requirements are re-extracted each run: descriptions change, and the
        // extractor itself improves.
        const idFor = new Map((up ?? []).map((r) => [r.external_id, r.id]))
        seenRoleIds.push(...(up ?? []).map((r) => r.id))
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
        await db.from('role_requirements').delete().in('role_id', [...idFor.values()])
        for (let i = 0; i < reqs.length; i += BATCH) {
          const { error: qErr } = await db.from('role_requirements').insert(reqs.slice(i, i + BATCH))
          if (qErr) throw qErr
        }
      }

      await db.from('boards').update({
        last_ingested_at: new Date().toISOString(),
        last_error: null,
        // A board with no India roles at all is the wrong company. `slice` on
        // Greenhouse is a North Macedonian firm, not the Indian fintech —
        // guessing slugs finds the wrong employer, so stop fetching it daily.
        // Checked against indiaRaw, not the corporate-filtered `india` — a
        // board that's the right company but only posted gig work on a given
        // day was being permanently deactivated by this check before the fix.
        active: indiaRaw.length > 0,
      }).eq('id', b.id)
      ok++
      console.log(`  ✓ ${b.company_name.padEnd(16)} ${String(india.length).padStart(4)} kept / ${roles.length}${droppedGig ? `  (${droppedGig} non-corporate dropped)` : ''}`)
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
  const cutoff = new Date(Date.now() - PRUNE_DAYS * 86400_000).toISOString()
  const { count: pruned } = await db
    .from('roles').delete({ count: 'exact' }).lt('last_seen_at', cutoff)
  console.log(`  pruned ${pruned ?? 0} roles unseen for ${PRUNE_DAYS} days`)

  console.log(
    `  ${ok}/${boards?.length ?? 0} boards ok · ${indexed} roles seen` +
    `${skipped ? ` · ${skipped} skipped for time, first up next run` : ''}` +
    ` · ${Math.round((Date.now() - started) / 1000)}s`
  )
  return { indexed }
}

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
