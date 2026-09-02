import type { CandidateProfile, GateResult, TypedRequirement } from './types'
import { evaluate } from './evaluate'

/**
 * Engineering gates on an experience band, increasingly with a data-structures
 * screen attached. The band is the part a job description states, so it is the
 * part that can be gated on honestly.
 */
export function evaluateEngineering(
  profile: CandidateProfile,
  requirements: TypedRequirement[]
): GateResult {
  return evaluate(profile, requirements)
}
