import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sentryTunnelTarget } from '@/lib/sentry-tunnel'

/**
 * The Sentry tunnel (TASK-216): browser error reports come here, on Saaf's own origin, so content
 * blockers that drop requests to sentry.io do not hide the errors candidates actually hit.
 *
 * Arrives without a session (a visitor's browser reporting a crash), so it lives under api/ with the
 * other session-less routes. It forwards ONLY envelopes addressed to Saaf's own Sentry project
 * (src/lib/sentry-tunnel.ts), caps the size, and brakes a loop. The caller is hashed at once — this
 * route never holds an address, same as the public tools.
 */
export const dynamic = 'force-dynamic'

/** An error envelope is a few KB; a stack with breadcrumbs is well under this. */
const MAX_BYTES = 200 * 1024
const LIMIT = { scope: 'sentry-tunnel', limit: 120, windowMs: 60_000 }

export async function POST(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip')?.trim() || 'unknown'
  const caller = createHash('sha256').update(ip).digest('hex').slice(0, 16)
  if (!checkRateLimit(caller, LIMIT).ok) return new NextResponse(null, { status: 429 })

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES) return new NextResponse(null, { status: 413 })
  const body = await req.text()
  if (body.length > MAX_BYTES) return new NextResponse(null, { status: 413 })

  const target = sentryTunnelTarget(body, process.env.NEXT_PUBLIC_SENTRY_DSN)
  if (!target) return new NextResponse(null, { status: 400 })

  try {
    const up = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope' }, body })
    // The browser only needs ok / not ok; the real answer rides in a header so a curl shows why Sentry said no
    // (2026-10-08: 403 "rejected with_reason: ProjectId" — the configured DSN's key and project do not belong together).
    return new NextResponse(null, { status: up.ok ? 200 : 502, headers: { 'X-Upstream-Status': String(up.status) } })
  } catch {
    // Sentry unreachable: the browser has nothing useful to do with the reason.
    return new NextResponse(null, { status: 502 })
  }
}
