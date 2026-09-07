import { cronRoute } from '@/lib/cron-route'

/**
 * Send the daily digest.
 *
 * Scheduled last, and deliberately in the Indian morning rather than at 03:00
 * IST with the rest of the pipeline: it is the only stage whose timing a person
 * experiences. Everything it reports has been ingested, scored and audited by
 * the time it runs.
 */
export const maxDuration = 60

export const GET = cronRoute('digest', async () => {
  const { sendDigests } = await import('../../../../../ingest/digest')
  await sendDigests()
  return {}
})
