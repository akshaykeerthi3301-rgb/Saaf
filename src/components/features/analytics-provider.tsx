'use client'

import { useEffect } from 'react'
import { initAnalytics } from '@/lib/analytics'

/** Initialises PostHog once for the whole app. No-ops without a key. */
export function AnalyticsProvider() {
  useEffect(() => { initAnalytics() }, [])
  return null
}
