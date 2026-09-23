import { extractSkillPhrases, skillDispersion } from '@/lib/taxonomy/skills'
import type { ScoreBreakdown } from '@/match/score'

/**
 * The right-hand panel's Match Analysis, computed from what we already hold:
 * the candidate's confirmed skills, the posting's text, and the breakdown the
 * scorer stored. No model runs here, so every line can be traced to a source.
 *
 * ⚠️ THE MISSING-KEYWORD LIST IS RANKED BY HOW MANY EMPLOYERS NAME THE TERM,
 * not by order of appearance. A candidate told "missing: Kafka" cannot judge
 * whether it matters; the dispersion from src/lib/taxonomy/skills.ts is the
 * figure that lets the list lead with what the market actually asks for.
 */

export type FitFactor = { key: string; label: string; share: number; note: string }

export type FitAnalysis = {
  matched: string[]
  missing: { term: string; employers?: number }[]
  whyFit: string[]
  gaps: string[]
  factors: FitFactor[]
  /** Factors scoring at least 70% of their weight, out of all scored factors. */
  strongFactors: number
  totalFactors: number
}

export type RequirementFact = { kind: string; minYears: number | null; sourceQuote: string }

const STRONG = 0.7
const WEAK = 0.5

export function analyseFit(input: {
  skills: string[]
  description: string
  title: string
  yearsExperience: number | null
  breakdown: ScoreBreakdown | null
  requirements: RequirementFact[]
}): FitAnalysis {
  const { skills, description, title, yearsExperience, breakdown, requirements } = input
  const hay = `${title} ${description}`.toLowerCase()
  const held = new Map(skills.map((s) => [s.trim().toLowerCase(), s.trim()]))

  const named = extractSkillPhrases(`${title}\n${description}`)
  const matchedMap = new Map<string, string>()
  for (const t of named) if (held.has(t.toLowerCase())) matchedMap.set(t.toLowerCase(), held.get(t.toLowerCase())!)
  // A profile skill written out in full in the posting counts even when it is
  // outside the mined vocabulary ("Financial modelling", "Stakeholder management").
  for (const [k, s] of held) if (k.length > 2 && hay.includes(k)) matchedMap.set(k, s)
  const matched = [...matchedMap.values()]

  const missing = named
    .filter((t) => !matchedMap.has(t.toLowerCase()))
    // A short all-lowercase hit ("acc", "ops") is a word fragment far more often
    // than a skill; the vocabulary's measured noise lives mostly here.
    .filter((t) => t.length >= 4 || /[A-Z]/.test(t))
    .map((term) => ({ term, employers: skillDispersion(term) }))
    .sort((a, b) => (b.employers ?? 0) - (a.employers ?? 0))
    .slice(0, 12)

  const factors: FitFactor[] = (breakdown?.components ?? [])
    .filter((c) => c.key !== 'cap' && c.max > 0)
    .map((c) => ({ key: c.key, label: c.label, share: Math.max(0, Math.min(1, c.points / c.max)), note: c.note }))

  const whyFit = factors.filter((f) => f.share >= STRONG).map((f) => f.note)
  const gaps = factors.filter((f) => f.share < WEAK).map((f) => f.note)

  // One denominator for the whole panel: the skills shown as matched plus the
  // ones shown as missing. Counting only the mined vocabulary here once read
  // "You hold 0 of 1" beside a "Matched skills · 1" badge.
  const askedFor = matched.length + missing.length
  if (askedFor) {
    whyFit.unshift(`You hold ${matched.length} of the ${askedFor} skills this posting names.`)
  }
  if (missing.length) {
    gaps.push(`${missing.length} skill${missing.length === 1 ? '' : 's'} named in the posting ${missing.length === 1 ? 'is' : 'are'} not on your profile — ${missing.slice(0, 3).map((m) => m.term).join(', ')}${missing.length > 3 ? '…' : ''}.`)
  }

  const bar = requirements
    .filter((r) => r.kind === 'experience_years' && r.minYears !== null)
    .sort((a, b) => (b.minYears ?? 0) - (a.minYears ?? 0))[0]
  if (bar && yearsExperience !== null && (bar.minYears ?? 0) > yearsExperience) {
    gaps.push(`Asks for ${bar.minYears} years; your profile shows ${yearsExperience}. The posting says: “${bar.sourceQuote}”`)
  }

  const cap = breakdown?.components.find((c) => c.key === 'cap')
  if (cap) gaps.push(cap.note)

  return {
    matched,
    missing,
    whyFit: [...new Set(whyFit)],
    gaps: [...new Set(gaps)],
    factors,
    strongFactors: factors.filter((f) => f.share >= STRONG).length,
    totalFactors: factors.length,
  }
}

/**
 * The one-line highlight on a card, from the breakdown alone (no description
 * read, so it costs the feed nothing). Counts scoring factors, not skills —
 * which is what it says.
 */
export function factorHighlight(breakdown: ScoreBreakdown | null | undefined): string | null {
  const factors = (breakdown?.components ?? []).filter((c) => c.key !== 'cap' && c.max > 0)
  if (!factors.length) return null
  const strong = factors.filter((c) => c.points / c.max >= STRONG).length
  const lead = strong === factors.length ? 'Top match' : strong >= factors.length - 1 ? 'Strong match' : 'Partial match'
  return `${lead}: strong on ${strong} of ${factors.length} score factors`
}
