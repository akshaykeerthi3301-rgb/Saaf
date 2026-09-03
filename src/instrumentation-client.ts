/**
 * Sentry's browser SDK is 140 KB gzipped — the single largest thing this app
 * could ship. Loaded on idle rather than eagerly: an error in the first second
 * of a session is worth less than a landing page that paints fast on mobile
 * data, which is the surface that decides whether anyone becomes a user at all.
 */
const idle = (cb: () => void) =>
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(cb)
    : setTimeout(cb, 2000)

idle(() => { void import('../sentry.client.config') })
