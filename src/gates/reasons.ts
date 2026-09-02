import type { RequirementKind } from './types'

/**
 * Refusal and clearance reasons are TEMPLATED from the gate that fired and the
 * requirement's stored value. They are retrieved, never generated — no language
 * model is involved anywhere in this path.
 *
 * That is what makes a refusal checkable: the candidate can open the source job
 * description and verify the sentence the reason came from.
 */

export function refusalReason(
  kind: RequirementKind,
  opts: { requiredYears?: number; heldYears?: number; credential?: string; location?: string }
): string {
  switch (kind) {
    case 'credential':
      return `Withheld — asks for a ${credentialName(opts.credential)}; your profile doesn't carry one. A credential can't be stretched.`
    case 'experience_years':
      return `Withheld — asks for ${fmtYears(opts.requiredYears)}; you have ${fmtYears(opts.heldYears)}.`
    case 'location':
      return `Withheld — this role is in ${opts.location ?? 'another location'}, outside the cities you work in.`
    case 'work_authorisation':
      return `Withheld — asks for work authorisation you haven't recorded.`
    default:
      return `Withheld — you don't meet a stated requirement for this role.`
  }
}

export function stretchReason(requiredYears: number, heldYears: number): string {
  const gap = round1(requiredYears - heldYears)
  return `The posting's ${fmtYears(requiredYears)} floor is ${fmtYears(gap)} above you. Everything else clears.`
}

export function clearedReason(matched: string[], caveat?: string): string {
  const head = matched.length ? `${matched.join(' and ')} match` : 'Your profile clears every stated requirement'
  return caveat ? `${head}; ${caveat}` : `${head}; no gaps against the stated requirements.`
}

function credentialName(c?: string): string {
  switch (c) {
    case 'CA': return 'chartered accountant'
    case 'CFA': return 'chartered financial analyst'
    case 'CS': return 'company secretary'
    default: return 'professional credential'
  }
}

function fmtYears(n?: number): string {
  if (n === undefined) return 'an unstated number of years'
  const r = round1(n)
  return `${r} year${r === 1 ? '' : 's'}`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
