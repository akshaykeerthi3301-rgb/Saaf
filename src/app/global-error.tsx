'use client'

import { useEffect } from 'react'
import './globals.css'
import { Button } from '@/components/ui/button'
import { StatusScreen } from '@/components/features/status-screen'

/**
 * The last resort: an error in the root layout itself, where error.tsx cannot
 * render because the layout it sits inside is what failed. It replaces the
 * whole document, so it carries its own <html> and <body> and imports the
 * tokens directly. The fonts are not loaded here — the system sans stands in,
 * which is the right trade for a screen that exists because loading failed.
 */
export default function GlobalError({
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
    <html lang="en">
      <body>
        <StatusScreen
          title="Saaf could not load"
          actions={<Button type="button" onClick={reset}>Try again</Button>}
        >
          Something failed before the page could start. Trying again usually works; if it keeps
          happening, the fault is ours, not yours.
        </StatusScreen>
      </body>
    </html>
  )
}
