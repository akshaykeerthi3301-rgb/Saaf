import { NextResponse } from 'next/server'
import { readApplyForMeStatus } from '@/lib/services/service-flags'

/**
 * The extension's remote kill switch. Public and unauthenticated by design — the
 * extension holds no session — and it exposes one derived fact: whether "Apply
 * for me" is paused, with the founder's one-line message. `no-store`: a kill
 * switch that a CDN caches for a minute is a switch that is a minute late.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await readApplyForMeStatus()
  return NextResponse.json(
    { applyForMe: s.paused ? 'paused' : 'on', message: s.message },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
