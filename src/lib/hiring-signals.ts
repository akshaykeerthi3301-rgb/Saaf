/**
 * What an employer's roles in OUR index say about its hiring — counted by us, so no
 * licence and no estimate (TASK-182, F-305). Pure.
 *
 * `rows` are the employer's Indian roles, newest first, capped by the caller at 200.
 * A cap that is hit makes the 30-day count a floor, and the screen says "at least".
 */
export const HIRING_SAMPLE = 200
const DAY = 86_400_000

const LABEL: Record<string, string> = {
  engineering: 'Engineering', finance: 'Finance', marketing: 'Marketing', consulting: 'Consulting', hr: 'HR',
  sales: 'Sales', operations: 'Operations', support: 'Support', design: 'Design', other: 'Other',
}

export function hiringSignals(
  rows: { function: string | null; first_seen_at: string }[],
  now: number = Date.now(),
  sample: number = HIRING_SAMPLE,
): { newLast30: { count: number; atLeast: boolean }; functions: { name: string; count: number }[] } {
  const cutoff = now - 30 * DAY
  const fresh = rows.filter((r) => {
    const t = Date.parse(r.first_seen_at)
    return Number.isFinite(t) && t >= cutoff
  })
  const counts = new Map<string, number>()
  for (const r of rows) if (r.function) counts.set(r.function, (counts.get(r.function) ?? 0) + 1)
  const functions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, count]) => ({ name: LABEL[k] ?? k.charAt(0).toUpperCase() + k.slice(1), count }))
  // If every one of a full sample is new, there may be more new ones we did not read.
  return { newLast30: { count: fresh.length, atLeast: rows.length >= sample && fresh.length === rows.length }, functions }
}
