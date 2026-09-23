'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusScreen, STATUS_LINK } from '@/components/features/status-screen'

/**
 * Any error thrown while rendering a page, or rejected out of a server action
 * inside a transition, lands here instead of on Next's unbranded default.
 *
 * ⚠️ SENTRY IS IMPORTED DYNAMICALLY, ON PURPOSE. An error boundary swallows the
 * error, so the global handler never sees it — it has to be reported from here.
 * A static import would put the 140 KB SDK into every route's bundle, which is
 * exactly what src/instrumentation-client.ts defers it to avoid.
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error))
  }, [error])

  return (
    <StatusScreen
      title="Something went wrong on our side"
      actions={
        <>
          <Button type="button" onClick={reset}>Try again</Button>
          <Link href="/" className={STATUS_LINK}>Go to the home page</Link>
        </>
      }
    >
      This page hit an error. Trying again usually works; if it keeps happening, the
      fault is ours, not yours.
      {error.digest ? (
        <span className="mt-3 block font-mono text-xs tabular-nums">Reference {error.digest}</span>
      ) : null}
    </StatusScreen>
  )
}
