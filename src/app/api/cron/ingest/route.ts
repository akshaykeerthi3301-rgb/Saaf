import { NextResponse, type NextRequest } from 'next/server'

/**
 * Daily ingest, triggered by Vercel Cron.
 *
 * GitHub Actions was the original scheduler (PRD §2, TASK-037). Actions turned
 * out to be disabled on this GitHub account — push and repo work, Actions do
 * not — so the trigger moved here. The ingest code itself is unchanged.
 *
 * ⚠️ CEILING: Vercel Hobby caps a function at 60 seconds, and Hobby cron fires
 * once per day so the work cannot be chunked across invocations. The run takes
 * ~34s at 20 boards, so roughly 1.7s per board. **Past about 30 boards this will
 * time out.** Since the registry compounding is the moat, that is a when and not
 * an if — migrate to a Supabase Edge Function on pg_cron (150s, no Vercel
 * ceiling) before the registry passes 30. The adapters and gate code are
 * runtime-agnostic; only the trigger and the Supabase client import move.
 */
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Vercel signs cron requests with CRON_SECRET. Without this check the
  // endpoint is a public button that hammers six third-party ATS providers.
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  try {
    const { runAll } = await import('../../../../../ingest/run')
    const result = await runAll()
    return NextResponse.json({ ok: true, ...result, ms: Date.now() - started })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, ms: Date.now() - started },
      { status: 500 }
    )
  }
}
