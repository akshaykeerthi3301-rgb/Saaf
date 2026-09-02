'use client'
import { useEffect } from 'react'
import { initAnalytics, track } from '@/lib/analytics'

/** Fires `shortlist_viewed` — the funnel endpoint for success criterion 1. */
export function ShortlistViewed({ cleared, withheld }: { cleared: number; withheld: number }) {
  useEffect(() => {
    initAnalytics()
    track('shortlist_viewed', { cleared, withheld })
  }, [cleared, withheld])
  return null
}
