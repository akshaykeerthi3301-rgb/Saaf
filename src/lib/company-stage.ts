import { normaliseCompany } from '@/lib/company-name'
import table from '@/lib/taxonomy/company-stage.json'

/**
 * "Public" and "Startup" chips from open data (TASK-175, F-106). The data is a
 * dated snapshot built by scripts/build-company-stage.ts from Wikidata (CC0),
 * keeping only employers that matched EXACTLY ONE business by name — an ambiguous
 * name is absent, never guessed (company-facts.ts explains why a wrong company is
 * worse than none).
 *
 *   Public   listed on a stock exchange per Wikidata.
 *   Startup  founded within the last 12 years AND 1,000 people or fewer, BOTH
 *            stated. A company with only one of the two is not called a startup:
 *            the word is a claim, and the tooltip shows the numbers it rests on.
 *
 * Funding rounds and investors are NOT here — no free source carries them
 * reliably; that is a licensing decision (Crunchbase) that belongs to the founder.
 */
export type StageRow = { p?: 1; f?: number; e?: number }
export type StageChip = { label: 'Public' | 'Startup'; title: string }

export const STARTUP_MAX_AGE = 12
export const STARTUP_MAX_PEOPLE = 1000

const TABLE = (table as { companies: Record<string, StageRow> }).companies

export function stageChip(company: string, year: number = new Date().getFullYear(), companies: Record<string, StageRow> = TABLE): StageChip | null {
  const row = companies[normaliseCompany(company)]
  if (!row) return null
  if (row.p) {
    return { label: 'Public', title: `Listed on a stock exchange, per Wikidata${row.f ? ` · founded ${row.f}` : ''}. Open data can be out of date.` }
  }
  if (row.f && row.e && year - row.f <= STARTUP_MAX_AGE && row.e <= STARTUP_MAX_PEOPLE) {
    return { label: 'Startup', title: `Founded ${row.f}, about ${row.e.toLocaleString('en-IN')} people, per Wikidata. Open data can be out of date.` }
  }
  return null
}

/** When the snapshot was built, for anywhere that wants to say how old it is. */
export const STAGE_SNAPSHOT = (table as { builtAt: string }).builtAt
