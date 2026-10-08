import { cronRoute } from '@/lib/cron-route'

/**
 * Rescore every confirmed profile against the current index.
 *
 * Split out of the ingest route: it was the third of four stages sharing one
 * 60-second function, so a slow ingest meant nobody's shortlist was refreshed
 * that day — silently, because the response still said ok. It also has its own
 * ceiling (docs/CONFLICTS.md F4, ~1,000 users), which is a different curve from
 * the ingest's and needs its own window to be measurable at all.
 */
export const maxDuration = 60

export const GET = cronRoute('recompute', async () => {
  const { recomputeAll } = await import('../../../../../ingest/recompute')
  // 50 s of the 60 s ceiling: stop starting new profiles after that, and say how many were left (a run that
  // silently skipped people used to look exactly like a complete one).
  return recomputeAll({ budgetMs: 50_000 })
})
