/**
 * Per-candidate email alert settings and the schedule they imply (F-122, TASK-180).
 * Pure: the shape, its sanitiser, who gets an email today, and how far back it looks —
 * tested apart from the cron that sends it (ingest/digest.ts imports this file).
 */
export const FREQUENCIES = ['daily', 'weekly', 'off'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export type AlertSettings = {
  frequency: Frequency
  /** 0 = Sunday … 6 = Saturday, in India time. Used only when weekly. */
  weekday: number
  /** The lowest match score worth an email. */
  minScore: number
  /** How many roles the email lists. */
  maxJobs: number
}

/** What a candidate with no saved settings gets — exactly what the digest did before settings existed. */
export const DEFAULT_ALERTS: AlertSettings = { frequency: 'daily', weekday: 1, minScore: 75, maxJobs: 5 }

export const MIN_SCORES = [0, 60, 70, 75, 80, 85] as const
export const MAX_JOBS = [3, 5, 8, 10] as const

/**
 * ⚠️ SAVING THESE DOES NOT MAKE MAIL ARRIVE. Jobinko's sending address is Resend's
 * shared test sender, which delivers only to the account owner, until a domain is
 * verified (docs/HANDOFF.md). The screen says so for as long as this is false.
 */
export const ALERT_EMAIL_LIVE = false

export function sanitizeAlertSettings(raw: unknown): AlertSettings {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const frequency = FREQUENCIES.includes(o.frequency as Frequency) ? (o.frequency as Frequency) : DEFAULT_ALERTS.frequency
  const int = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isInteger(v) ? v : fallback)
  const weekday = int(o.weekday, DEFAULT_ALERTS.weekday)
  const minScore = int(o.minScore, DEFAULT_ALERTS.minScore)
  const maxJobs = int(o.maxJobs, DEFAULT_ALERTS.maxJobs)
  return {
    frequency,
    weekday: weekday >= 0 && weekday <= 6 ? weekday : DEFAULT_ALERTS.weekday,
    minScore: (MIN_SCORES as readonly number[]).includes(minScore) ? minScore : DEFAULT_ALERTS.minScore,
    maxJobs: (MAX_JOBS as readonly number[]).includes(maxJobs) ? maxJobs : DEFAULT_ALERTS.maxJobs,
  }
}

/** The weekday (0–6) in India for an instant. The cron fires at 21:30 UTC — already tomorrow in Mumbai. */
export function istWeekday(at: Date): number {
  return new Date(at.getTime() + 5.5 * 3_600_000).getUTCDay()
}

/** Does this candidate get an email on this run? */
export function shouldSendToday(s: AlertSettings, at: Date): boolean {
  if (s.frequency === 'off') return false
  if (s.frequency === 'daily') return true
  return istWeekday(at) === s.weekday
}

/** How far back "new" reaches: a day (with slack for a late run) or a week. */
export function lookbackHours(s: AlertSettings): number {
  return s.frequency === 'weekly' ? 7 * 24 + 2 : 26
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

/** One sentence saying what these settings mean, for the screen. */
export function describeAlerts(s: AlertSettings): string {
  if (s.frequency === 'off') return 'No alert emails.'
  const when = s.frequency === 'daily' ? 'Every morning' : `Every ${WEEKDAYS[s.weekday]} morning`
  const floor = s.minScore > 0 ? `roles scoring ${s.minScore} or above` : 'every new role'
  return `${when}: up to ${s.maxJobs} new roles, ${floor}.`
}
