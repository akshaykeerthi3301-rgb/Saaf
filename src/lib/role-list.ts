/**
 * The roles a candidate is looking for, as ONE list: the first is the main role (it decides which postings are scored
 * at all), the rest are ones they would also take.
 *
 * ⚠️ WHY ONE LIST. The profile used to offer a single-choice "main role" box and, below it, a separate "other roles"
 * box. A candidate who wanted two roles picked both in the first box — and the second pick replaced the first. A
 * customer reported exactly that ("selected two, it only showed one"). Every role is now added to the same list.
 *
 * Pure so the rules — no duplicates by case, at most five, main role first — are tested directly.
 */
export const MAX_ROLES = 5

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function addRole(list: string[], role: string): string[] {
  const r = role.trim()
  if (!r || list.some((x) => same(x, r)) || list.length >= MAX_ROLES) return list
  return [...list, r]
}

export function removeRole(list: string[], role: string): string[] {
  return list.filter((x) => !same(x, role))
}

/** Move a role to the front. Unknown roles leave the list as it was. */
export function makeMain(list: string[], role: string): string[] {
  const hit = list.find((x) => same(x, role))
  return hit ? [hit, ...list.filter((x) => !same(x, role))] : list
}

/** The stored shape: `preferred_role` is the first, `preferred_roles` leads with it and carries the rest. */
export function splitRoles(list: string[]): { primary: string; extras: string[] } {
  const [primary = '', ...extras] = list
  return { primary, extras }
}
