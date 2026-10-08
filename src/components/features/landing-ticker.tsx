'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * The landing page's "just now" line (F-1201). Every number and every role in it is real: the count is
 * the roles Saaf first saw in the last 24 hours (new to Saaf — some are older postings it only just found),
 * and the roles are the most recently posted ones by the employer's own date — read on the
 * server, never made up and never "someone just applied" (we have no such event to show). It is one
 * quiet line that steps through the newest few roles every few seconds, and does not move at all for
 * anyone who has asked their device for reduced motion.
 */
export type TickerData = { last24h: number; latest: { id: string; title: string; company: string; city: string | null }[] }

export function LandingTicker({ data }: { data: TickerData }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (data.latest.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % data.latest.length), 4000)
    return () => clearInterval(t)
  }, [data.latest.length])
  const r = data.latest[i % data.latest.length]
  return (
    <p className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground" data-testid="ticker">
      <span className="size-1.5 rounded-full bg-score-high" aria-hidden="true" />
      <span><span className="font-semibold text-primary">{data.last24h.toLocaleString('en-IN')}</span> roles added to Saaf in the last 24 hours</span>
      <span aria-hidden="true">·</span>
      <span aria-live="off">
        latest posting: <Link href={`/jobs/${r.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">{r.title}</Link> at {r.company}{r.city ? `, ${r.city}` : ''}
      </span>
      <Link href="/jobs" className="font-semibold text-primary underline underline-offset-4">Browse</Link>
    </p>
  )
}
