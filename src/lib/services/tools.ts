import { getCookieContext, listScoredRoles, type CookieContext, type ScoredRoleOption } from '@/lib/services/cookie'

/**
 * The role a Co-Pilot tool page works on: the one named in `?role=`, or the
 * candidate's best-scoring role when none is named.
 *
 * ⚠️ ONLY ROLES SCORED FOR THIS CANDIDATE ARE OFFERED. A tool aimed at a role
 * we never compared them to would write about a fit nobody measured — the same
 * rule /interview-prep follows (listScoredRoles' own comment). A `?role=` that
 * is not in their list falls back to the best one rather than erroring.
 */
export type ToolRole = {
  options: ScoredRoleOption[]
  selected: ScoredRoleOption | null
  context: CookieContext | null
  error: string | null
}

export async function resolveToolRole(userId: string, roleParam: string | undefined): Promise<ToolRole> {
  const options = await listScoredRoles(userId)
  const selected = options.find((o) => o.id === roleParam) ?? options[0] ?? null
  if (!selected) return { options, selected: null, context: null, error: null }
  const ctx = await getCookieContext(userId, selected.id)
  return ctx.ok
    ? { options, selected, context: ctx.context, error: null }
    : { options, selected, context: null, error: ctx.error }
}
