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
import { ADAPTERS, USER_AGENT, type NormalisedRole } from './providers'
import { extractAll, resolveInIndia } from '../src/gates/extract'

const PRUNE_DAYS = 30
const BATCH = 500

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type Board = { provider: string; token: string; company_name: string }

const FN: { fn: string; re: RegExp }[] = [
  { fn: 'engineering', re: /\b(engineer|developer|sde|backend|frontend|full.?stack|devops|architect|infrastructure|platform|data scientist|\bml\b|qa|sdet)\b/i },
  { fn: 'finance',     re: /\b(finance|financial|account|audit|controller|fp&a|treasury|\btax\b|equity research)\b/i },
  { fn: 'marketing',   re: /\b(marketing|growth|brand|\bseo\b|content|communications|social media)\b/i },
  { fn: 'consulting',  re: /\b(consultant|strategy|business analyst|program manager|chief of staff|operations manager)\b/i },
  { fn: 'hr',          re: /\b(recruit|talent|people|human resources|hrbp)\b/i },
]
const fnFor = (title: string) => FN.find((f) => f.re.test(title))?.fn ?? 'other'
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
  const res = await fetch(a.url(b.token), {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('non-JSON response')
  return a.parse(await res.json(), b.token)
}

export async function runIngest() {
  const started = Date.now()
  await syncRegistry()

  const { data: boards, error: bErr } = await db
    .from('boards').select('id, provider, token, company_name').eq('active', true)
  if (bErr) throw bErr

  let indexed = 0
  let ok = 0
  const seenRoleIds: string[] = []

  for (const b of boards ?? []) {
    try {
      const roles = await fetchBoard(b)
      indexed += roles.length
      // Deduplicate on external_id before upserting. Postgres rejects an
      // ON CONFLICT batch that touches the same row twice, and at least one
      // board (apna) publishes the same shortcode more than once — which
      // failed the whole board rather than one role.
      const india = [
        ...new Map(
          roles.filter((r) => resolveInIndia(r.locationRaw)).map((r) => [r.externalId, r])
        ).values(),
      ]

      if (india.length) {
        const { data: up, error } = await db.from('roles').upsert(
          india.map((r) => ({
            board_id: b.id,
            external_id: r.externalId,
            title: r.title,
            location_raw: r.locationRaw,
            in_india: true,
            city: cityFrom(r.locationRaw),
            function: fnFor(r.title),
            description: r.description,
            apply_url: r.applyUrl,
            posted_at: r.postedAt,
            company_name: b.company_name,
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
          return extractAll(r.description, r.locationRaw, r.title).map((q) => ({
            role_id: rid,
            kind: q.kind,
            min_years: q.minYears ?? null,
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
        // A board with no India roles is the wrong company. `slice` on
        // Greenhouse is a North Macedonian firm, not the Indian fintech —
        // guessing slugs finds the wrong employer, so stop fetching it daily.
        active: india.length > 0,
      }).eq('id', b.id)
      ok++
      console.log(`  ✓ ${b.company_name.padEnd(16)} ${String(india.length).padStart(4)} India / ${roles.length}`)
    } catch (e) {
      // One board failing must never halt the run — the registry compounding is
      // the moat, and a provider outage is not a reason to lose a day.
      await db.from('boards')
        .update({ last_error: (e as Error).message.slice(0, 300), last_ingested_at: new Date().toISOString() })
        .eq('id', b.id)
      console.log(`  ✗ ${b.company_name.padEnd(16)} ${(e as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  // Prune. Load-bearing for the 500 MB free tier, not housekeeping.
  const cutoff = new Date(Date.now() - PRUNE_DAYS * 86400_000).toISOString()
  const { count: pruned } = await db
    .from('roles').delete({ count: 'exact' }).lt('last_seen_at', cutoff)
  console.log(`  pruned ${pruned ?? 0} roles unseen for ${PRUNE_DAYS} days`)

  console.log(`  ${ok}/${boards?.length ?? 0} boards ok · ${indexed} roles seen · ${Math.round((Date.now() - started) / 1000)}s`)
  return { indexed }
}

export async function runAll() {
  const { indexed } = await runIngest()
  const { recomputeAll } = await import('./recompute')
  await recomputeAll()
  const { writeAudit } = await import('./audit')
  await writeAudit(indexed)
  const { sendDigests } = await import('./digest')
  await sendDigests()
  return { indexed }
}

// CLI entry point: `npm run ingest`. Skipped when imported by the cron route.
if (process.argv[1]?.includes('ingest/run')) {
  runAll().catch((e) => { console.error(e); process.exit(1) })
}
