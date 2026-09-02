import type { CandidateProfile, GateResult, TypedRequirement } from './types'
import { evaluate } from './evaluate'

/**
 * Finance gates on a CREDENTIAL, not on years — CA, CFA or company secretary.
 *
 * This is the cleanest demonstration of gates-not-weights in the product: a
 * credential is genuinely binary, and one you do not hold can never be
 * stretched, however well everything else scores.
 *
 * The care is in extraction, not evaluation. Real postings say things like
 * "CA/FRM/CFA/MBA is a plus" — optional, and gating on it would be a false
 * refusal. src/gates/extract.ts scores those below the confidence threshold so
 * they never reach this function as hard requirements.
 */
export function evaluateFinance(
  profile: CandidateProfile,
  requirements: TypedRequirement[]
): GateResult {
  return evaluate(profile, requirements)
}
