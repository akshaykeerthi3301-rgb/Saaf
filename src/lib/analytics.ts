'use client'

import posthog from 'posthog-js'

/** The activation funnel. Typed so event names cannot drift. */
export type SaafEvent =
  | 'onboarding_started'
  | 'resume_uploaded'
  | 'profile_confirmed'
  | 'shortlist_viewed'
  | 'withheld_section_engaged'
  | 'refusal_reported'

let ready = false

export function initAnalytics() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key || ready || typeof window === 'undefined') return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    person_profiles: 'identified_only',
  })
  ready = true
}

/** No-ops without a key, so local development works with none configured. */
export function track(event: SaafEvent, props?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || typeof window === 'undefined') return
  posthog.capture(event, props)
}
