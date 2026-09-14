import { NextResponse, type NextRequest } from 'next/server'

/**
 * The shared body of every /api/cron/* route.
 *
 * Vercel signs cron requests with CRON_SECRET. Without this check each of these
 * endpoints is a public button that hammers third-party ATS providers, rescores
 * every profile, or sends everybody's email — so the check lives in one place
 * rather than being copy-pasted into four routes where one of the copies would
 * eventually drift.
 *
 * ⚠️ IT FAILS CLOSED, AND IT USED TO FAIL OPEN. The guard was
 * `if (process.env.CRON_SECRET && auth !== ...)`, so an unset or empty
 * CRON_SECRET made the condition false and every one of these four routes
 * became a public, unauthenticated button — the exact outcome the paragraph
 * above says the check exists to prevent. A missing secret is the one
 * circumstance in which the guard is most needed and it was the circumstance
 * that disabled it.
 *
 * A missing secret is now a 503 rather than a 401: the caller is not
 * unauthorised, the server is misconfigured, and saying so is what gets it
 * fixed instead of looking like a bad token. There is no development
 * exemption — `npm run ingest` calls ingest/run.ts directly and never touches
 * this route, so nothing legitimate needs the hole.
 */
export function cronRoute(name: string, run: () => Promise<unknown>) {
  return async function GET(request: NextRequest) {
    const secret = process.env.CRON_SECRET
    if (!secret) {
      return NextResponse.json(
        { ok: false, stage: name, error: 'CRON_SECRET is not set; refusing to run.' },
        { status: 503 }
      )
    }
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
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
