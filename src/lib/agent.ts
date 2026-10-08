/**
 * The agent's settings, and the two things it decides (F-706, F-707, F-708; TASK-191). Pure.
 *
 * ⚠️ THE AGENT ADDS TO A QUEUE; IT NEVER SUBMITS. Whatever the mode, an application goes out only when the
 * candidate has switched "Apply for me" on in the extension AND pressed Start there, and then only by the
 * rules in extension/autoapply.js — never past a CAPTCHA, never a guessed answer, applied only on the
 * employer's confirmation. The modes differ in who puts a role on the queue, nothing else:
 *   off      Saaf proposes nothing.
 *   suggest  (default) Saaf proposes roles — in "Ask Saaf" — and the candidate confirms each batch.
 *   queue    Saaf adds roles to the queue itself, when the candidate has Saaf open, up to the weekly target.
 * Only roles that are Easy apply (a one-page form, no account) and at or above the candidate's own minimum
 * score are ever proposed, and never one already tracked, hidden, or queued before.
 */
export type AgentMode = 'off' | 'suggest' | 'queue'
export const MODES: { value: AgentMode; label: string; help: string }[] = [
  { value: 'off', label: 'Off', help: 'Saaf proposes nothing.' },
  { value: 'suggest', label: 'Suggest', help: 'Ask Saaf proposes roles to queue; you confirm each batch.' },
  { value: 'queue', label: 'Auto-queue', help: 'Saaf adds roles to your Apply-for-me queue when you have Saaf open. Nothing is submitted until you press Start in the extension, and you can remove any from its queue.' },
]
export const TARGETS = [0, 3, 5, 10, 15, 20] as const
export const MIN_SCORES = [60, 70, 75, 80, 85] as const
const MAX_QUEUED = 150

export type QueuedMark = { id: string; at: string }
export type AgentSettings = { mode: AgentMode; weeklyTarget: number; minScore: number; queued: QueuedMark[] }
export const DEFAULT_AGENT: AgentSettings = { mode: 'suggest', weeklyTarget: 5, minScore: 75, queued: [] }

/** Rebuild whatever was stored or submitted through the whitelist; anything unrecognised becomes the default. */
export function sanitizeAgentSettings(raw: unknown): AgentSettings {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const queued = (Array.isArray(r.queued) ? r.queued : [])
    .filter((q): q is QueuedMark => !!q && typeof (q as QueuedMark).id === 'string' && /^[0-9a-f-]{36}$/i.test((q as QueuedMark).id) && typeof (q as QueuedMark).at === 'string' && !Number.isNaN(Date.parse((q as QueuedMark).at)))
    .map((q) => ({ id: q.id, at: q.at }))
    .slice(-MAX_QUEUED)
  return {
    mode: r.mode === 'off' || r.mode === 'suggest' || r.mode === 'queue' ? r.mode : DEFAULT_AGENT.mode,
    weeklyTarget: (TARGETS as readonly number[]).includes(r.weeklyTarget as number) ? (r.weeklyTarget as number) : DEFAULT_AGENT.weeklyTarget,
    minScore: (MIN_SCORES as readonly number[]).includes(r.minScore as number) ? (r.minScore as number) : DEFAULT_AGENT.minScore,
    queued,
  }
}

/** The start of this week in India (Monday 00:00 IST) as an instant, for counting what was queued "this week". */
export function weekStart(now: Date): Date {
  const ist = new Date(now.getTime() + 5.5 * 3_600_000)
  const dow = (ist.getUTCDay() + 6) % 7 // Monday = 0
  const monday = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - dow)
  return new Date(monday - 5.5 * 3_600_000)
}

export type Candidate = { roleId: string; title: string; company: string; score: number; applyUrl: string; easy: boolean; tracked: boolean; hidden: boolean }

/**
 * Which roles to propose or queue now. `appliedThisWeek` is the tracker's own count; roles queued since Monday
 * also use up the week's room, so opening Saaf ten times does not queue ten batches.
 */
export function proposeQueue(c: Candidate[], s: AgentSettings, o: { appliedThisWeek: number; now?: Date; max?: number }): Candidate[] {
  if (s.mode === 'off') return []
  const since = weekStart(o.now ?? new Date()).getTime()
  const queuedThisWeek = s.queued.filter((q) => Date.parse(q.at) >= since).length
  const room = s.weeklyTarget > 0 ? Math.max(0, s.weeklyTarget - o.appliedThisWeek - queuedThisWeek) : (o.max ?? 5)
  const never = new Set(s.queued.map((q) => q.id))
  return c
    .filter((r) => r.easy && !r.tracked && !r.hidden && r.score >= s.minScore && !never.has(r.roleId) && /^https?:\/\//i.test(r.applyUrl))
    .sort((a, b) => b.score - a.score || a.roleId.localeCompare(b.roleId))
    .slice(0, Math.min(room, o.max ?? 5))
}

/** "3 of 10 this week" — or the plain sentence when there is no target. */
export function weeklyLine(done: number, target: number): string {
  if (target <= 0) return `${done} application${done === 1 ? '' : 's'} in the last 7 days. You have not set a weekly target.`
  if (done >= target) return `${done} of ${target} this week — target met.`
  return `${done} of ${target} this week — ${target - done} to go.`
}
