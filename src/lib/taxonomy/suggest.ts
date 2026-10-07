import { ALL_ROLES } from '@/lib/taxonomy/roles'

/**
 * As-you-type suggestions from the role taxonomy (TASK-173).
 *
 * Pure. The picker used to filter with `includes`, which ranks "Product
 * Management" above nothing and cannot read "PM", "sde" or "prodcut manager".
 * This ranks, in order of how sure we are what was meant:
 *
 *   1000  exactly a role
 *    900  a known abbreviation of a role ("pm", "sde", "hrbp")
 *    800  the start of a role ("product man")
 *    600  every typed word starts a word of the role, in any order ("manager product")
 *    300  every typed word is one or two typos from a word of the role ("prodcut manager")
 *  100+   some of the typed words match ("senior product manager" → Product Manager)
 *
 * There is deliberately no "typed text appears somewhere inside a role" tier: "pm" is
 * inside "development", and a ranking that offers Corporate Development for "pm"
 * is worse than one that offers nothing.
 *
 * Never a gate: a title that matches nothing returns [] and the picker offers
 * it as typed. Never turning a candidate away is a locked decision.
 */

/** What candidates type instead of the full title. Each target is a role in the taxonomy. */
export const ABBREVIATIONS: Record<string, string> = {
  pm: 'Product Manager', apm: 'Associate Product Manager', po: 'Product Owner', pmm: 'Product Marketing Manager',
  swe: 'Software Engineer', sde: 'Software Engineer', sdet: 'QA Engineer', qa: 'QA Engineer',
  ba: 'Business Analyst', da: 'Data Analyst', ds: 'Data Scientist', de: 'Data Engineer', ml: 'Machine Learning Engineer',
  em: 'Engineering Manager', csm: 'Customer Success Manager', ae: 'Account Executive', kam: 'Key Account Manager',
  hrbp: 'HR Business Partner', hr: 'HR Manager', ta: 'Talent Acquisition', ca: 'Chartered Accountant',
  ux: 'UX Designer', ui: 'UI Designer', ib: 'Investment Banking', bdm: 'Business Development Manager',
  bde: 'Business Development Executive', sem: 'Performance Marketing', seo: 'SEO Specialist', smm: 'Social Media Manager',
  cos: 'Chief of Staff', scm: 'Supply Chain Manager', rm: 'Relationship Manager',
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9&+ ]+/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Edit distance with a swap of two neighbouring letters counted as ONE edit —
 * "prodcut" is the commonest kind of typo and plain Levenshtein charges it two.
 * Capped: returns cap + 1 as soon as it cannot come in under cap.
 */
function within(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev2: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1)
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > cap) return cap + 1
    prev2 = prev
    prev = cur
  }
  return prev[b.length]
}

/** Typos allowed in a word: none for short words, one for 4–7 letters, two from 8. */
const slack = (w: string) => (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0)

export type RoleSuggestion = { role: string; score: number }

export function suggestRoles(typed: string, roles: string[] = ALL_ROLES, limit = 6): RoleSuggestion[] {
  const t = norm(typed)
  if (!t) return []
  const tokens = t.split(' ')
  const abbreviated = ABBREVIATIONS[t]?.toLowerCase()

  const scored = roles.flatMap((role) => {
    const rl = norm(role)
    const rtoks = rl.split(' ')
    const prefixOf = (w: string) => rtoks.some((r) => r.startsWith(w))
    const typoOf = (w: string) => rtoks.some((r) => within(w, r, slack(w)) <= slack(w))

    let score = 0
    if (rl === t) score = 1000
    else if (abbreviated === rl) score = 900
    else if (rl.startsWith(t)) score = 800
    else if (tokens.every(prefixOf)) score = 600 + Math.round((tokens.length / rtoks.length) * 100)
    else if (tokens.every((w) => prefixOf(w) || typoOf(w))) score = 300
    else {
      const hit = tokens.filter((w) => w.length > 2 && (prefixOf(w) || typoOf(w))).length
      if (hit / tokens.length >= 0.5) score = 100 + Math.round((hit / tokens.length) * 100)
    }
    return score > 0 ? [{ role, score }] : []
  })

  return scored.sort((a, b) => b.score - a.score || a.role.length - b.role.length || a.role.localeCompare(b.role)).slice(0, limit)
}
