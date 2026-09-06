import {
  CONFIDENCE_THRESHOLD,
  MAX_STRETCH_YEARS,
  type CandidateProfile,
  type GateResult,
  type TypedRequirement,
} from './types'
import { refusalReason, stretchReason, clearedReason } from './reasons'
import { isRemoteLocation } from './extract'

/**
 * The gate engine. A pure function: same inputs, same output, no I/O.
 *
 * Deliberately NOT a model. A language model asked to judge eligibility weighs
 * when it should gate, which is exactly how "Top Applicant on a fifteen-year
 * role" is born. This is plain code, and it is the reason that failure is
 * structurally impossible here.
 */
export function evaluate(
  profile: CandidateProfile,
  requirements: TypedRequirement[]
): GateResult {
  // Requirements we are not confident enough about are ignored entirely.
  // When extraction is uncertain, the role passes through and the candidate
  // decides — a wrong refusal is worse than a wrong match.
  const confident = requirements.filter((r) => r.confidence >= CONFIDENCE_THRESHOLD)

  // --- Credential: binary, and never stretchable. -------------------------
  const credReqs = confident.filter((r) => r.kind === 'credential' && r.credential)
  const heldCred = profile.credential && profile.credential !== 'none' ? profile.credential : null
  const unmetCred = credReqs.find((r) => r.credential !== heldCred)
  if (credReqs.length > 0 && !credReqs.some((r) => r.credential === heldCred)) {
    return {
      outcome: 'withheld',
      refusedOn: 'credential',
      reason: refusalReason('credential', { credential: unmetCred?.credential }),
    }
  }

  // --- Location. ----------------------------------------------------------
  const locReq = confident.find((r) => r.kind === 'location')
  if (locReq?.valueText && profile.city) {
    const loc = locReq.valueText.toLowerCase()
    const remote = isRemoteLocation(loc)
    const matchesCity = loc.includes(profile.city.toLowerCase())
    const india = /india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata/i.test(loc)
    if (!remote && !matchesCity && !india) {
      return {
        outcome: 'withheld',
        refusedOn: 'location',
        reason: refusalReason('location', { location: locReq.valueText }),
      }
    }
  }

  // --- Experience: the only gate that can be stretched. --------------------
  // An explicit statement in the description beats the title band. The
  // description is more specific, and a posting that says "3+ years" on a
  // Senior Engineer role means it.
  const statedYears = confident.filter((r) => r.kind === 'experience_years' && r.minYears !== undefined)
  const titleYears = confident.filter((r) => r.kind === 'title_seniority' && r.minYears !== undefined)

  // A confidently framed statement ("must have 3+ years") may override the
  // TITLE BAND, because an explicit number in the description beats one
  // inferred from a job title — that is what stops a "Senior Engineer" posting
  // saying "3+ years" from manufacturing a false refusal.
  //
  // What it may NOT do is lower the floor below another stated requirement.
  // Substituting the framed subset for the whole set did exactly that: an
  // "Engagement Manager" posting stating "4-6 years of professional
  // experience" also said "At least 2 years in strategic GTM", the latter
  // scored 0.95 on its "at least" framing, and the 4-year floor was discarded
  // in favour of 2 — clearing the role for a two-year candidate. The floor is
  // now taken across every confident stated requirement, and framing decides
  // only whether the title band still participates.
  const { required: floorRequired, fromTitle } = experienceFloor(confident)
  const yearReqs =
    statedYears.filter((r) => r.confidence >= 0.9).length > 0 ? statedYears
    : [...statedYears, ...titleYears]
  if (yearReqs.length > 0) {
    // A single description can state several minimums ("10+ years ... with 5+
    // years leading"). Gate on the strictest reading — refusing on the higher
    // number is the safer error.
    const required = floorRequired
    const held = profile.yearsExperience
    if (held < required) {
      const gap = required - held
      if (gap <= MAX_STRETCH_YEARS) {
        return {
          outcome: 'stretch',
          reason: stretchReason(required, held),
          score: scoreFor(profile, confident, gap),
          gapYears: Math.round(gap * 10) / 10,
        }
      }
      return {
        outcome: 'withheld',
        refusedOn: fromTitle ? 'title_seniority' : 'experience_years',
        reason: fromTitle
          ? refusalReason('title_seniority', {
              titleLabel: yearReqs.find((r) => r.minYears === required)?.valueText,
              titleText: yearReqs.find((r) => r.minYears === required)?.sourceQuote,
            })
          : refusalReason('experience_years', { requiredYears: required, heldYears: held }),
      }
    }
  }

  return {
    outcome: 'cleared',
    reason: clearedReason([]),
    score: scoreFor(profile, confident, 0),
  }
}

/**
 * A deliberately simple score. Ranking nuance needs the full skills taxonomy,
 * which is out of MVP scope — and the magic moment rests on the refusal, not on
 * the ordering of what cleared.
 */
function scoreFor(_p: CandidateProfile, reqs: TypedRequirement[], gapYears: number): number {
  const base = 70
  const evidence = Math.min(reqs.length * 4, 20)
  const penalty = gapYears * 8
  return Math.max(40, Math.min(95, Math.round(base + evidence - penalty)))
}

/**
 * The experience floor a posting actually imposes.
 *
 * Shared by the gate and by src/match/score.ts's seniority component so the
 * two cannot drift — this codebase has already paid for that once, when
 * evaluate-user.ts and ingest/recompute.ts hand-duplicated the same pipeline
 * and silently disagreed.
 *
 * A confidently framed statement suppresses the title band, because an
 * explicit number in the description beats one inferred from a job title. It
 * may never LOWER the floor below another confident stated requirement: an
 * "Engagement Manager" posting stating "4-6 years" also said "at least 2 years
 * in strategic GTM", the latter scored higher on its framing, and substituting
 * it cleared the role for a two-year candidate.
 */
/**
 * The top of a stated experience band, when the posting drew one.
 *
 * Undefined is the common answer and it is a real answer: "5+ years" states a
 * floor and no ceiling, so there is nothing to be over-qualified against.
 *
 * Where several ranges are stated, the HIGHEST ceiling wins — the opposite of
 * experienceFloor(), which takes the strictest floor, and for the same reason.
 * The floor decides whether a candidate falls short, so the safer error is to
 * read it high. The ceiling decides whether they are too senior, so the safer
 * error is to read it generously and not push a role down over an upper bound
 * the posting only half stated.
 */
export function experienceCeiling(confident: TypedRequirement[]): number | undefined {
  const tops = confident
    .filter((r) => r.kind === 'experience_years' && r.maxYears !== undefined)
    .map((r) => r.maxYears!)
  return tops.length ? Math.max(...tops) : undefined
}

export function experienceFloor(
  confident: TypedRequirement[]
): { required: number; fromTitle: boolean } {
  const stated = confident.filter((r) => r.kind === 'experience_years' && r.minYears !== undefined)
  const titled = confident.filter((r) => r.kind === 'title_seniority' && r.minYears !== undefined)

  const statedFloor = Math.max(0, ...stated.map((r) => r.minYears!))
  const titleFloor = Math.max(0, ...titled.map((r) => r.minYears!))
  const framed = stated.some((r) => r.confidence >= 0.9)

  return {
    required: framed ? statedFloor : Math.max(statedFloor, titleFloor),
    fromTitle: !framed && titled.length > 0 && titleFloor >= statedFloor,
  }
}
