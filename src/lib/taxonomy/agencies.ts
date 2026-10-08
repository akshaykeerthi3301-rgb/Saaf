import { normaliseCompany } from '@/lib/company-name'

/**
 * Staffing and recruiting agencies — employers that post jobs on BEHALF of other
 * companies (TASK-175, F-120). A candidate who wants to deal with the employer
 * directly can leave them out of the feed with one switch.
 *
 * ⚠️ CURATED, NOT INFERRED, AND SHORT ON PURPOSE. A name that merely contains
 * "talent" or "consulting" is not an agency (Bullpen Talent is; "Qube Research &
 * Technologies" is not), and wrongly hiding a direct employer is the failure that
 * matters. Every entry is an employer whose business is placing people, checked by
 * name against the live index with scripts/measure-agencies.ts. Measured
 * 2026-10-08 against the live index: 11 employers, 329 of 27,882 Indian roles (1.2%) —
 * small, which is why the switch lives in the drawer and not among the pills.
 *
 * Not on it, deliberately: job boards that post their OWN openings (ZipRecruiter,
 * Naukri, Indeed), and consultancies whose own roles are direct (Korn Ferry).
 *
 * Matching is by `normaliseCompany`, so "Randstad India Pvt Ltd" meets "Randstad".
 */
export const AGENCY_NAMES = [
  'Randstad', 'Adecco', 'ManpowerGroup', 'Manpower', 'Hudsonmanpower', 'Kelly Services', 'Hays', 'Robert Half', 'Michael Page', 'Page Personnel',
  'TeamLease', 'Quess Corp', 'Quess', 'Ciel HR', 'Cielo', 'Allegis', 'Aerotek', 'Bullpen Talent', 'Crisp Recruit', 'Cross Border Talents',
  'Remote People', 'The Global Talent Co', 'mthree', 'mthree Recruiting Portal',
  // Apna posts roles for other companies ("Senior Graphic Designer - <client>"); its board is a marketplace, not its own openings.
  'Apna',
] as const

const KEYS = new Set(AGENCY_NAMES.map((n) => normaliseCompany(n)).filter(Boolean))

/** True when the employer is on the curated list. Exact on the normalised name — never "contains". */
export function isStaffingAgency(company: string): boolean {
  const k = normaliseCompany(company)
  return k.length > 0 && KEYS.has(k)
}
