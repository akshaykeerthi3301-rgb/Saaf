/**
 * Sentry's browser SDK is 140 KB gzipped — the single largest thing this app
 * could ship. An error in the first second of a session is worth less than a
 * landing page that paints fast on mobile data, which is the surface that
 * decides whether anyone becomes a user at all.
 *
 * ⚠️ ON FIRST INTERACTION OR FIVE SECONDS AFTER LOAD — NO LONGER ON FIRST IDLE.
 * Measured 2026-09-23 on a local production build of `/`, Lighthouse mobile:
 * with Sentry and PostHog both loaded on idle, 471 KB of script and 150–190 ms
 * of blocking time; with both removed, 298 KB and 50 ms — and LCP unchanged
 * (2.6–2.9 s), so neither delays the hero. First idle arrives ~1 s after load,
 * squarely inside the window a phone is still busy with the page. Waiting for
 * the candidate to touch the page (or 5 s) keeps every error from anyone who
 * actually uses it. PostHog is untouched: deferring it would drop pageviews of
 * visitors who leave quickly, which is a measurement decision, not a speed one
 * (docs/QA-AUDIT.md QA-23, TASK-104).
 */
function whenSettled(cb: () => void) {
  if (typeof window === 'undefined') return
  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
  let fired = false
  const go = () => {
    if (fired) return
    fired = true
    for (const e of events) window.removeEventListener(e, go, true)
    cb()
  }
  for (const e of events) window.addEventListener(e, go, { capture: true, passive: true, once: true })
  const arm = () => window.setTimeout(go, 5000)
  if (document.readyState === 'complete') arm()
  else window.addEventListener('load', arm, { once: true })
}

whenSettled(() => { void import('../sentry.client.config') })
