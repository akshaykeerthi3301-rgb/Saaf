/**
 * Load the Phase 1 fixture into Supabase so Phase 2 has real roles to render.
 *
 * A stopgap by design: Phase 3 (TASK-031..037) replaces this with the automated
 * daily ingest. The point of loading real postings now is that the shortlist —
 * and the magic moment — get built against genuine prose rather than seed data
 * that flatters the gate.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { extractAll, resolveInIndia } from '../src/gates/extract'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

type Raw = {
  provider: string; company: string; externalId: string; title: string
  locationRaw: string; description: string; applyUrl: string; postedAt: string | null
}

const FN = [
  { fn: 'engineering', re: /\b(engineer|developer|sde|backend|frontend|full.?stack|devops|architect|infrastructure|platform|data scientist|ml )\b/i },
  { fn: 'finance',     re: /\b(finance|financial|account|audit|controller|fp&a|treasury|tax|equity research)\b/i },
  { fn: 'marketing',   re: /\b(marketing|growth|brand|seo|content|communications)\b/i },
  { fn: 'consulting',  re: /\b(consultant|strategy|business analyst|program manager|chief of staff)\b/i },
  { fn: 'hr',          re: /\b(recruit|talent|people|human resources|hrbp)\b/i },
] as const

const fnFor = (title: string) => FN.find((f) => f.re.test(title))?.fn ?? 'other'

async function main() {
  const raw: Raw[] = JSON.parse(readFileSync('ingest/fixtures/seed-roles.json', 'utf8'))

  // 1. boards
  const companies = [...new Map(raw.map((r) => [`${r.provider}:${r.company}`, r])).values()]
  const { data: boards, error: bErr } = await db
    .from('boards')
    .upsert(
      companies.map((c) => ({
        provider: c.provider,
        token: c.company.toLowerCase().replace(/\s+/g, '-'),
        company_name: c.company,
        last_ingested_at: new Date().toISOString(),
      })),
      { onConflict: 'provider,token' }
    )
    .select('id, company_name')
  if (bErr) throw bErr
  const boardId = new Map(boards!.map((b) => [b.company_name, b.id]))
  console.log(`  boards: ${boards!.length}`)

  // 2. roles — India only, filtered at ingest exactly as the pipeline will
  const india = raw.filter((r) => resolveInIndia(r.locationRaw))
  const { data: roles, error: rErr } = await db
    .from('roles')
    .upsert(
      india.map((r) => ({
        board_id: boardId.get(r.company)!,
        external_id: r.externalId,
        title: r.title,
        // Denormalised: boards is service-role only (the registry is the moat),
        // so a join would return nothing for a signed-in user.
        company_name: r.company,
        location_raw: r.locationRaw,
        in_india: true,
        city: r.locationRaw.split(',')[0]?.trim() ?? null,
        function: fnFor(r.title),
        description: r.description,
        apply_url: r.applyUrl,
        posted_at: r.postedAt,
        last_seen_at: new Date().toISOString(),
      })),
      { onConflict: 'board_id,external_id' }
    )
    .select('id, external_id')
  if (rErr) throw rErr
  const roleId = new Map(roles!.map((r) => [r.external_id, r.id]))
  console.log(`  roles:  ${roles!.length} (of ${raw.length} indexed; ${raw.length - india.length} outside India)`)

  // 3. typed requirements, with their source quotes and confidence
  const reqs = india.flatMap((r) =>
    extractAll(r.description, r.locationRaw, r.title).map((q) => ({
      role_id: roleId.get(r.externalId)!,
      kind: q.kind,
      min_years: q.minYears ?? null,
      credential: q.credential ?? null,
      value_text: q.valueText ?? null,
      source_quote: q.sourceQuote.slice(0, 500),
      confidence: q.confidence,
    }))
  )
  await db.from('role_requirements').delete().in('role_id', [...roleId.values()])
  for (let i = 0; i < reqs.length; i += 500) {
    const { error } = await db.from('role_requirements').insert(reqs.slice(i, i + 500))
    if (error) throw error
  }
  console.log(`  requirements: ${reqs.length}`)
  const gating = reqs.filter((r) => r.confidence >= 0.7).length
  console.log(`  of which confident enough to gate: ${gating}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
