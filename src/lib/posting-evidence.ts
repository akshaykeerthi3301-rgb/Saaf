import { plain } from '@/lib/fit-sections'
import { requirementLabel } from '@/lib/display-names'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'

/**
 * What the extractor read out of a posting, each with the sentence it came from —
 * the "what we read from this posting" list that used to sit under every feed
 * card's Insights disclosure and now lives in the detail panel (feed redesign
 * 2026-10-08).
 *
 * ⚠️ ONE QUOTE, SHOWN ONCE. A single sentence often yields two legitimate readings —
 * "Exp should be in between 2 - 4 years, out of which minimum 2 years in product
 * management" produces both a 2–4 band and a bare 2-year floor. Both are correct, and
 * the list displays only the quote, so they would render as the identical line twice,
 * which reads as a bug in a product that claims to show its working. The better-informed
 * reading of each quote is kept: higher confidence first, then the one that also
 * captured a floor. Nothing is lost that the candidate could act on — the discarded
 * row quotes the same sentence.
 */
export type PostingEvidence = { kind: string; label: string; quote: string; lowConfidence: boolean }

export type RequirementRow = { kind: string; minYears: number | null; confidence: number; sourceQuote: string }

export function postingEvidence(rows: RequirementRow[]): PostingEvidence[] {
  const best = new Map<string, RequirementRow>()
  for (const r of rows) {
    const quote = plain(r.sourceQuote)
    if (!quote) continue
    const key = `${r.kind}||${quote}`
    const prev = best.get(key)
    if (!prev || r.confidence > prev.confidence || (r.confidence === prev.confidence && r.minYears !== null && prev.minYears === null)) {
      best.set(key, { ...r, sourceQuote: quote })
    }
  }
  return [...best.values()].map((r) => ({
    kind: r.kind,
    label: requirementLabel(r.kind),
    quote: r.sourceQuote,
    lowConfidence: r.confidence < CONFIDENCE_THRESHOLD,
  }))
}
