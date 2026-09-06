/**
 * Saaf gate engine — types.
 *
 * This module is the open-source half of the moat. It must stay a pure,
 * extractable unit: no imports from `registry/`, `ingest/`, or the database.
 * An ESLint rule enforces that.
 */

export type RequirementKind =
  | 'experience_years'
  | 'credential'
  | 'location'
  | 'work_authorisation'
  | 'channel_budget'
  | 'institute_tier'
  | 'hr_track'
  | 'title_seniority'

export type Credential = 'CA' | 'CFA' | 'CS' | 'none'

/** A hard requirement extracted from a job description. */
export type TypedRequirement = {
  kind: RequirementKind
  minYears?: number
  /** Upper bound of a stated range: 5 for "1 - 5 years". Undefined when the
   *  posting states a floor and no ceiling ("5+ years"), which is an open-ended
   *  requirement — over-qualification is not scored against one. */
  maxYears?: number
  credential?: Credential
  valueText?: string
  /** The sentence this was extracted from. Every refusal reason is retrieved,
   *  never generated — this is what makes a refusal defensible. */
  sourceQuote: string
  /** 0..1. Below CONFIDENCE_THRESHOLD the requirement is NOT used to gate.
   *  A wrong refusal is worse than a wrong match. */
  confidence: number
}

export type CandidateProfile = {
  yearsExperience: number
  city?: string
  credential?: Credential
  workAuthorisation?: string
  /** The role the candidate asked for, in their own words. Scored against the
   *  posting's title by src/match/score.ts — the gate itself never reads it. */
  preferredRole?: string
  /** 'remote' | 'hybrid' | 'onsite' | 'no_preference'. Scored, never gated. */
  workModePreference?: string
  /** Confirmed by the candidate, read from the résumé by a model. */
  skills?: string[]
}

export type Outcome = 'cleared' | 'withheld' | 'stretch'

export type GateResult = {
  outcome: Outcome
  refusedOn?: RequirementKind
  reason: string
  /** Null when withheld — nothing is scored after a refusal. */
  score?: number
  /** Stretch tier only, capped at 2.0. */
  gapYears?: number
}

/**
 * Below this, an extracted requirement is ignored rather than gated on.
 *
 * This threshold is the single most important number in the product. A wrong
 * refusal reproduces the exact injury Saaf exists to fix, with more authority
 * than a job portal ever had — so when extraction is uncertain, the role passes
 * through and the candidate decides for themselves.
 */
export const CONFIDENCE_THRESHOLD = 0.7

/** The largest experience gap that may appear in the Stretch tier. */
export const MAX_STRETCH_YEARS = 2.0
