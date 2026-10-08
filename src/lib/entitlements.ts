import { normaliseCompany } from '@/lib/company-name'

/**
 * Who may open what (F-1003, TASK-195) — the rules, with nothing enforced because
 * nothing is for sale. Pure.
 *
 * ⚠️ TODAY EVERYTHING IS OPEN. `INTERVIEW_RULES.default` is 'all' and `userPlan` (the
 * service) answers 'free' for everyone, so no candidate is ever turned away — the locked
 * decision "never gate users out" still holds. This file is the place the rules WILL live
 * once the founder decides what a paid plan includes (TASK-170); until then it is tested
 * with hypothetical rules so that flipping `default` to 'plan' is a one-line change that
 * has already been proven to do exactly what it says.
 *
 * The three ways in, once the default is 'plan':
 *   - a plan that includes the bank;
 *   - a company the founder has opened to everyone (`openCompanies`, normalised names);
 *   - a time-boxed trial pass (`trialUntil`), after which the rule reads as no pass at all.
 */
export type Plan = 'free' | 'paid'
export type Who = { plan: Plan; trialUntil?: string | null }

export type InterviewRules = {
  /** 'all' = every signed-in candidate; 'plan' = a plan, an open company or a trial. */
  default: 'all' | 'plan'
  openCompanies: readonly string[]
}

export const INTERVIEW_RULES: InterviewRules = { default: 'all', openCompanies: [] }

export type Access = { allowed: boolean; reason: 'open' | 'plan' | 'company-open' | 'trial' | 'locked' }

export function interviewAccess(who: Who, company: string, rules: InterviewRules = INTERVIEW_RULES, now: Date = new Date()): Access {
  if (rules.default === 'all') return { allowed: true, reason: 'open' }
  if (who.plan === 'paid') return { allowed: true, reason: 'plan' }
  const key = normaliseCompany(company)
  if (key && rules.openCompanies.some((c) => normaliseCompany(c) === key)) return { allowed: true, reason: 'company-open' }
  const t = who.trialUntil ? Date.parse(who.trialUntil) : NaN
  if (Number.isFinite(t) && t > now.getTime()) return { allowed: true, reason: 'trial' }
  return { allowed: false, reason: 'locked' }
}
