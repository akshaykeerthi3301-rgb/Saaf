/**
 * Links to one job. Pure, so a malformed id can never become a link.
 *
 * Two different links, on purpose: the PUBLIC page (`/jobs/<id>`, no sign-in,
 * what you paste into a chat) and the candidate's own feed view
 * (`/today?role=<id>`, opens the panel for them).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isRoleId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

export function publicJobUrl(origin: string, roleId: string): string | null {
  return isRoleId(roleId) ? `${origin.replace(/\/+$/, '')}/jobs/${roleId}` : null
}

export function feedJobPath(roleId: string): string | null {
  return isRoleId(roleId) ? `/today?role=${roleId}` : null
}

export const JOB_REPORT_KINDS = [
  { kind: 'closed', label: 'It is closed or filled' },
  { kind: 'scam', label: 'It looks like a scam or not a real job' },
  { kind: 'wrong-details', label: 'The title, place or details are wrong' },
  { kind: 'duplicate', label: 'It is a duplicate of another posting' },
  { kind: 'other', label: 'Something else' },
] as const
export type JobReportKind = (typeof JOB_REPORT_KINDS)[number]['kind']
