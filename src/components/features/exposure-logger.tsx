'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics'

/**
 * Says, once, that this person was SHOWN a variant — render it next to the thing the
 * variant changes. Logging at assignment instead would count people who never saw it
 * and blur every result.
 */
export function ExposureLogger({ experiment, variant }: { experiment: string; variant: string }) {
  useEffect(() => { track('experiment_exposed', { experiment, variant }) }, [experiment, variant])
  return null
}
