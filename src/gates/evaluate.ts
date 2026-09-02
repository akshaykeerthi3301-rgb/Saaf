import {
  CONFIDENCE_THRESHOLD,
  MAX_STRETCH_YEARS,
  type CandidateProfile,
  type GateResult,
  type TypedRequirement,
} from './types'
import { refusalReason, stretchReason, clearedReason } from './reasons'

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
    const remote = /remote|anywhere|work from home/i.test(loc)
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
  const yearReqs = confident.filter((r) => r.kind === 'experience_years' && r.minYears !== undefined)
  if (yearReqs.length > 0) {
    // A single description can state several minimums ("10+ years ... with 5+
    // years leading"). Gate on the strictest reading — refusing on the higher
    // number is the safer error.
    const required = Math.max(...yearReqs.map((r) => r.minYears!))
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
        refusedOn: 'experience_years',
        reason: refusalReason('experience_years', { requiredYears: required, heldYears: held }),
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
