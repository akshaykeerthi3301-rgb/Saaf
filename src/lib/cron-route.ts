import { NextResponse, type NextRequest } from 'next/server'

/**
 * The shared body of every /api/cron/* route.
 *
 * Vercel signs cron requests with CRON_SECRET. Without this check each of these
 * endpoints is a public button that hammers third-party ATS providers, rescores
 * every profile, or sends everybody's email — so the check lives in one place
 * rather than being copy-pasted into four routes where one of the copies would
 * eventually drift.
 */
export function cronRoute(name: string, run: () => Promise<unknown>) {
  return async function GET(request: NextRequest) {
    const auth = request.headers.get('authorization')
    if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const started = Date.now()
    try {
      const result = await run()
      return NextResponse.json({ ok: true, stage: name, ...(result as object), ms: Date.now() - started })
    } catch (e) {
      return NextResponse.json(
        { ok: false, stage: name, error: (e as Error).message, ms: Date.now() - started },
        { status: 500 }
      )
    }
  }
}
