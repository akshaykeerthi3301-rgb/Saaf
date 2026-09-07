import { cronRoute } from '@/lib/cron-route'

/**
 * Write today's public index audit row, read by /audit and the landing strip.
 *
 * Scheduled after recompute so the figures it publishes describe an index that
 * has already been scored. It is the page whose entire purpose is "check our
 * work", so it must not be the stage that gets dropped when the run is slow.
 */
export const maxDuration = 60

export const GET = cronRoute('audit', async () => {
  const { writeAudit } = await import('../../../../../ingest/audit')
  await writeAudit()
  return {}
})
