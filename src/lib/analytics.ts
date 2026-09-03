'use client'

/**
 * The activation funnel. Event names are typed so they cannot drift.
 *
 * posthog-js is loaded DYNAMICALLY and only when idle. Statically imported it
 * added 87 KB gzipped to first paint, which is a real cost for a candidate on
 * mobile data at 11pm — and analytics is never worth delaying the product for.
 * Events fired before it loads are queued and flushed, so nothing is lost.
 */
export type SaafEvent =
  | 'onboarding_started'
  | 'resume_uploaded'
  | 'profile_confirmed'
  | 'shortlist_viewed'
  | 'withheld_section_engaged'
  | 'refusal_reported'

type Posthog = {
  init: (k: string, o: Record<string, unknown>) => void
  capture: (e: string, p?: Record<string, unknown>) => void
  identify: (id: string) => void
}

let ph: Posthog | null = null
let loading = false
const queue: { event: SaafEvent; props?: Record<string, unknown> }[] = []

const enabled = () =>
  typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY

async function load() {
  if (ph || loading || !enabled()) return
  loading = true
  const mod = await import('posthog-js')
  ph = mod.default as unknown as Posthog
  ph.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    person_profiles: 'identified_only',

    // Session replay is OFF, for the same reason it is off in Sentry: the third
    // guarantee is that nothing about a candidate's search is shared, and
    // recording their screen while they read a list of employers — with their
    // current employer's name on their own profile — would contradict it.
    disable_session_recording: true,

    // Autocapture would record every click target on the page, including role
    // titles and company names. The six declared funnel events are enough to
    // answer success criteria 1 and 2; anything beyond that is collection
    // without a purpose.
    autocapture: false,
    capture_dead_clicks: false,
    disable_surveys: true,
    capture_performance: false,

    // Stops PostHog fetching its remote config, which can otherwise switch on
    // capture features — dead-click autocapture among them — from the project
    // dashboard, overriding everything above without a code change. For a
    // product whose guarantee is that nothing about a search is shared, what
    // gets collected must be decided in the repository and reviewable in a
    // diff, not toggled in a vendor UI. Costs feature flags, which are unused.
    advanced_disable_decide: true,
  })
  for (const q of queue.splice(0)) ph.capture(q.event, q.props)
}

/** Called once from the root layout. Defers to idle so it never blocks paint. */
export function initAnalytics() {
  if (!enabled()) return
  const idle = (cb: () => void) =>
    'requestIdleCallback' in window
      ? (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(cb)
      : setTimeout(cb, 1500)
  idle(() => { void load() })
}

/** Queues until PostHog is loaded. No-ops entirely without a key. */
export function track(event: SaafEvent, props?: Record<string, unknown>) {
  if (!enabled()) return
  if (ph) ph.capture(event, props)
  else { queue.push({ event, props }); void load() }
}

/** Only the auth id — never an email, never anything derived from a résumé. */
export function identify(userId: string) {
  if (!enabled()) return
  if (ph) ph.identify(userId)
  else void load().then(() => ph?.identify(userId))
}
