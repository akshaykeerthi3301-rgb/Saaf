/**
 * TASK-011 — seed a role fixture from the seven boards verified on 2026-09-02.
 *
 * Real data, not synthetic: requirement extraction has to survive real job-
 * description prose, and synthetic descriptions would flatter the parser.
 *
 * Writes ingest/fixtures/seed-roles.json.
 */
import { writeFileSync, mkdirSync } from 'node:fs'

type Provider = 'greenhouse' | 'lever' | 'ashby'

const BOARDS: { provider: Provider; token: string; company: string }[] = [
  { provider: 'greenhouse', token: 'razorpay', company: 'Razorpay' },
  { provider: 'greenhouse', token: 'postman', company: 'Postman' },
  { provider: 'greenhouse', token: 'slice', company: 'slice' },
  { provider: 'greenhouse', token: 'groww', company: 'Groww' },
  { provider: 'lever', token: 'meesho', company: 'Meesho' },
  { provider: 'ashby', token: 'sarvam', company: 'Sarvam AI' },
  { provider: 'ashby', token: 'atlan', company: 'Atlan' },
]

const UA = 'saaf-job-shortlist/0.1 (+https://saaf.vercel.app) research fixture'

const url = (p: Provider, t: string) =>
  p === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`
  : p === 'lever'    ? `https://api.lever.co/v0/postings/${t}?mode=json`
  :                    `https://api.ashbyhq.com/posting-api/job-board/${t}?includeCompensation=false`

export type RawRole = {
  provider: Provider
  company: string
  externalId: string
  title: string
  locationRaw: string
  description: string
  applyUrl: string
  postedAt: string | null
}

/* Greenhouse and Lever return HTML-escaped or HTML-bodied descriptions.
   Strip to text: the description is untrusted third-party content and is only
   ever parsed for requirements, never rendered as markup. */
function toText(html: string): string {
  return html
    // Unescape FIRST. Doing it after tag-stripping turns &lt;li&gt; into a real
    // <li> that then survives into the "text", which is how HTML leaked in.
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalise(p: Provider, company: string, raw: unknown): RawRole[] {
  const d = raw as Record<string, unknown>
  if (p === 'greenhouse') {
    const jobs = (d.jobs ?? []) as Record<string, never>[]
    return jobs.map((j) => ({
      provider: p, company,
      externalId: String(j['id']),
      title: String(j['title'] ?? ''),
      locationRaw: String((j['location'] as { name?: string } | undefined)?.name ?? ''),
      description: toText(String(j['content'] ?? '')),
      applyUrl: String(j['absolute_url'] ?? ''),
      postedAt: (j['updated_at'] as string) ?? null,
    }))
  }
  if (p === 'lever') {
    const jobs = (Array.isArray(raw) ? raw : []) as Record<string, never>[]
    return jobs.map((j) => ({
      provider: p, company,
      externalId: String(j['id']),
      title: String(j['text'] ?? ''),
      locationRaw: String((j['categories'] as { location?: string } | undefined)?.location ?? ''),
      description: toText(String(j['descriptionPlain'] ?? j['description'] ?? '')),
      applyUrl: String(j['hostedUrl'] ?? ''),
      postedAt: j['createdAt'] ? new Date(Number(j['createdAt'])).toISOString() : null,
    }))
  }
  const jobs = (d.jobs ?? []) as Record<string, never>[]
  return jobs.map((j) => ({
    provider: p, company,
    externalId: String(j['id']),
    title: String(j['title'] ?? ''),
    locationRaw: String(j['location'] ?? ''),
    description: toText(String(j['descriptionPlain'] ?? j['descriptionHtml'] ?? '')),
    applyUrl: String(j['jobUrl'] ?? j['applyUrl'] ?? ''),
    postedAt: (j['publishedAt'] as string) ?? null,
  }))
}

async function main() {
  const all: RawRole[] = []
  for (const b of BOARDS) {
    try {
      const res = await fetch(url(b.provider, b.token), { headers: { 'User-Agent': UA } })
      if (!res.ok) { console.log(`  ✗ ${b.company.padEnd(12)} HTTP ${res.status}`); continue }
      const roles = normalise(b.provider, b.company, await res.json())
      all.push(...roles)
      console.log(`  ✓ ${b.company.padEnd(12)} ${String(roles.length).padStart(3)} roles  (${b.provider})`)
    } catch (e) {
      console.log(`  ✗ ${b.company.padEnd(12)} ${(e as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 400)) // be a good citizen
  }
  mkdirSync('ingest/fixtures', { recursive: true })
  writeFileSync('ingest/fixtures/seed-roles.json', JSON.stringify(all, null, 2))
  console.log(`\n  total: ${all.length} roles → ingest/fixtures/seed-roles.json`)
  const withDesc = all.filter((r) => r.description.length > 200).length
  console.log(`  with a usable description (>200 chars): ${withDesc}`)
}

main()
