import { cronRoute } from '@/lib/cron-route'

/**
 * Daily ingest, triggered by Vercel Cron.
 *
 * GitHub Actions was the original scheduler (PRD §2, TASK-037). Actions turned
 * out to be disabled on this GitHub account — push and repo work, Actions do
 * not — so the trigger moved here. The ingest code itself is unchanged.
 *
 * THIS ROUTE NOW RUNS THE INGEST AND NOTHING ELSE. It used to call runAll(),
 * which chained ingest → recompute → audit → digests inside one 60-second
 * function; the four stages competed for one budget and the last of them
 * simply did not happen on a slow night. Recompute, audit and digest are
 * separate cron paths with their own budget — see vercel.json.
 *
 * ⚠️ THE 60-SECOND CEILING IS NOW A ROTATION, NOT A FAILURE. Boards are ordered
 * least-recently-ingested first and the run stops STARTING new ones at the
 * budget, so a registry larger than one window is swept over several days.
 * That is only safe because the prune is scoped to boards actually ingested in
 * the run — an unvisited board keeps every role it has. If that scoping is ever
 * removed, this rotation starts deleting the index. See ingest/run.ts and
 * docs/CONFLICTS.md F1.
 *
 * 52s of the 60s budget, leaving the rest for cold start and the response.
 */
export const maxDuration = 60

export const GET = cronRoute('ingest', async () => {
  const { runIngest } = await import('../../../../../ingest/run')
  return runIngest({ budgetMs: 52_000 })
})
