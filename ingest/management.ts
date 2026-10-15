import type { RolePay } from './providers/fields'

/**
 * "Management roles above ₹12 LPA" — the admission rule for boards flagged
 * `"admit": "management"` in registry/boards.json (founder, 2026-10-15).
 *
 * Applies only to boards that opt in (bulk employers like Kotak or Hilton, and
 * career sites found after the free-plan fill); every board admitted earlier keeps
 * all its corporate roles. Postings almost never state pay, so this is an
 * INFORMED GUESS from the title, with stated pay overriding the guess.
 *
 *   1. Stated pay wins. Annualised in ₹ (year × 1, month × 12; USD × 85, EUR × 92,
 *      GBP × 105 — a rough fixed rate, this is a screen not a payroll). Kept when the
 *      top of the range reaches ₹12 LPA, dropped when it does not.
 *   2. Otherwise the title decides:
 *        director · VP/AVP/SVP · general manager/GM/DGM/AGM · chief · president · partner
 *          → kept (₹25 LPA+ in practice in India)
 *        "Senior Manager", "Manager II", "Group/Engineering Manager"
 *          → kept (₹20 LPA+)
 *        "Manager" or "Head" WITH a corporate function word (product, finance, supply
 *        chain, risk, …) → kept (₹15–30 LPA at the employers this runs on)
 *        a bare "Manager", or any Assistant / Deputy / Associate / Trainee Manager,
 *        Branch / Store / Relationship / Sales-officer / Collections roles
 *          → dropped (₹4–11 LPA; the wrong-way error is withholding a real job, so the
 *            guess is only made where the title is clear)
 *
 * ⚠️ A SENIOR-IC TITLE (Principal Engineer, Architect, Staff) IS NOT MANAGEMENT and is
 * not kept by this rule, though it also pays above ₹12 LPA. That is the founder's
 * wording, taken literally; widen it here if "senior" was meant.
 */

const FX: Record<string, number> = { INR: 1, USD: 85, EUR: 92, GBP: 105 }

/** Annual ₹ for a stated range, or null when the currency is not one we convert. */
export function annualInr(pay: RolePay | null | undefined): number | null {
  if (!pay) return null
  const top = pay.max ?? pay.min
  const fx = FX[(pay.currency || '').toUpperCase()]
  if (top == null || !fx) return null
  const perYear = pay.period === 'year' ? 1 : pay.period === 'month' ? 12 : null
  return perYear == null ? null : top * fx * perYear
}

const STRONG = /\b(director|vice president|vp|svp|evp|avp|general manager|gm|dgm|agm|chief|president|partner|managing director|cxo|ceo|cfo|cto|coo|cmo)\b/i
const OVERRIDES_LOW_CONTEXT = /\b(director|vice president|vp|svp|evp|avp|general manager|gm|dgm|agm|chief|president|partner)\b/i
const LOW_CONTEXT = /\b(branch|store|showroom|outlet|relationship|sales manager|sales officer|credit manager|acquisition|premier|loans?|channel|territory|area manager|telesales|inside sales|retail|collections?|field|telecall\w*|agency|cashier|teller|clerk|chef|nurse|kitchen|housekeeping|front office|food (and|&) beverage)\b/i
const JUNIOR_MANAGER = /\b(assistant|asst|deputy|associate|trainee|junior|jr|executive|officer|intern|supervisor)\b[\s,/-]*(manager|mgr)\b/i
const SENIOR_MANAGER = /\b(senior|sr|principal|group|engineering|lead) +manager\b|\bmanager +(ii|iii|iv)\b/i
const FUNCTION = /\b(product|program|programme|project|engineering|software|data|analytics|finance|financial|accounts?|audit|tax|treasury|marketing|brand|growth|digital|hr|talent|people|learning|strategy|operations?|supply chain|procurement|sourcing|category|risk|compliance|legal|security|quality|technical|solutions|delivery|client|customer success|content|design|research|planning|infrastructure|cloud|platform|architecture|transformation|change|vendor|contract|portfolio|pmo|it)\b/i

export function managementAbove12L(role: { title: string; pay?: RolePay | null }): boolean {
  const stated = annualInr(role.pay)
  if (stated != null) return stated >= 1_200_000

  const t = role.title
  if (STRONG.test(t)) {
    // "Regional Director, Retail" is senior whatever the sector; "Branch Head" is not.
    const seniorEnough = OVERRIDES_LOW_CONTEXT.test(t) && !/\bbranch\b/i.test(t)
    return !LOW_CONTEXT.test(t) || seniorEnough
  }
  if (JUNIOR_MANAGER.test(t)) return false
  // "Senior Manager - Sales Strategy" is a corporate role; only the places where a
  // manager is a branch-level post (branch, store, showroom, outlet) rule it out.
  if (SENIOR_MANAGER.test(t)) return !/\b(branch|store|showroom|outlet)\b/i.test(t)
  if (LOW_CONTEXT.test(t)) return false
  // Any head of something that is not a branch/floor ("Zonal Business Head", "Head - Security").
  if (/\bhead\b/i.test(t)) return true
  if (/\bmanager\b/i.test(t)) return FUNCTION.test(t)
  return false
}

/**
 * "MBA / IIM / IIT fresher" roles — the second admission rule (founder, 2026-10-15),
 * used with the management rule by boards flagged `"admit": "mba-or-management"`.
 *
 * Campus hiring at the IIMs and IITs runs through placement cells, not public boards,
 * so what a public career page offers is the year-round early-career lane: trainee and
 * graduate programmes, rotational and leadership-development schemes, summer
 * analyst/associate roles, APM, and the entry titles consultancies and banks give MBAs
 * (Associate, Associate Consultant, Business/Strategy Analyst). Titles are read first;
 * where a posting carries its description, a named school or degree (MBA, PGDM, IIM,
 * IIT, B-school) counts too, but only beside a fresher cue — "IIT preferred" on a senior
 * engineer role is not a fresher role.
 *
 * Senior and managerial titles are not fresher roles whatever else they say.
 */
const SENIORISH = /\b(senior|sr|lead|principal|manager|mgr|director|vp|avp|svp|evp|head|staff|architect|chief|partner|president|specialist ii|ii|iii|iv)\b/i
const FRESHER_TITLE = new RegExp([
  String.raw`\b(management|graduate|business|operations|technical|engineer(ing)?|sales|finance|commercial|general)\s+trainees?\b`,
  String.raw`\btrainees?\b`, String.raw`\bmt\b`, String.raw`\b(campus|early[- ]careers?|early[- ]talent|new[- ]grad|university grad\w*)\b`,
  String.raw`\bgraduate\b`, String.raw`\brotational\b`, String.raw`\bleadership (development|programme|program)\b`,
  String.raw`\bsummer\s+(analyst|associate|intern\w*)\b`, String.raw`\bapprentice\w*\b`, String.raw`\byoung professional\b`,
  String.raw`\bassociate consultant\b`,
  String.raw`\bassociate\b`, String.raw`\b(business|strategy|financial|research|investment|summer)\s+analyst\b`,
].join('|'), 'i')
const SCHOOL_CUE = /\b(mba|pgdm|iims?|iits?|b-?schools?)\b/i
const FRESHER_CUE = /\b(freshers?|0\s*(-|to)\s*[0-3]\s*years?|recent graduates?|new graduates?|campus|graduate programme?|trainee|entry[- ]level)\b/i

export function mbaFresherRole(role: { title: string; description?: string }): boolean {
  const t = role.title
  // An Associate Product Manager is the entry rung of a product career, though "manager" is in it.
  if (/\b(apm|associate product manager)\b/i.test(t)) return true
  if (SENIORISH.test(t)) return false
  if (FRESHER_TITLE.test(t)) return true
  const d = role.description ?? ''
  return SCHOOL_CUE.test(d) && FRESHER_CUE.test(d)
}

/** The rule behind `"admit": "mba-or-management"`. */
export const mbaOrManagement = (role: { title: string; description?: string; pay?: RolePay | null }): boolean =>
  managementAbove12L(role) || mbaFresherRole(role)
