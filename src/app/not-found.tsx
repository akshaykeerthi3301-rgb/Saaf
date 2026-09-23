import Link from 'next/link'
import type { Metadata } from 'next'
import { StatusScreen, STATUS_LINK } from '@/components/features/status-screen'

export const metadata: Metadata = { title: 'Page not found — Saaf' }

export default function NotFound() {
  return (
    <StatusScreen
      title="We could not find that page"
      actions={
        <>
          <Link href="/" className={STATUS_LINK}>Go to the home page</Link>
          <Link href="/tools/ats-checker" className={STATUS_LINK}>Check your résumé — free</Link>
        </>
      }
    >
      The link may be old, or mistyped. Nothing you saved is affected.
    </StatusScreen>
  )
}
