/**
 * Just the daily ingest — no recompute, no audit, no digest emails — with a budget you set.
 *
 *   CAREER_SITES=amazon,oraclehcm INGEST_BUDGET_MS=3000000 npm run ingest:only
 *
 * This is what the long-running runner (.gitlab-ci.yml) calls: Vercel's cron gives the ingest
 * 60 seconds, which sweeps ~2,000 boards in weeks; the same code finished all 2,006 boards
 * in ~28 minutes when run by hand on 2026-10-15. `npm run ingest` (ingest/run.ts) runs every
 * stage and would send digest emails, which is not wanted here.
 */
import { runIngest } from './run'

runIngest({ budgetMs: Number(process.env.INGEST_BUDGET_MS) || 3_000_000 })
  .then((r) => { console.log('RESULT', JSON.stringify(r)); process.exit(0) })
  .catch((e) => { console.error('FAILED', e); process.exit(1) })
