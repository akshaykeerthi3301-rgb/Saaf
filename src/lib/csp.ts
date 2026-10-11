/**
 * The Content-Security-Policy, in REPORT-ONLY mode.
 *
 * Added 2026-09-23 (docs/QA-AUDIT.md QA-24): vercel.json already sets HSTS,
 * X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy, but there
 * was no CSP. Report-only first, deliberately: a browser that sees a violation
 * logs it and sends a report — it blocks nothing — so it cannot break Google
 * sign-in, PostHog or Sentry while the list is proved against real traffic.
 * Enforce it (rename the header) only once the reports come back clean.
 *
 * Built here rather than in vercel.json because the hosts come from the
 * environment: the Sentry DSN supplies the report endpoint, which a static
 * file cannot read.
 *
 * `'unsafe-inline'` for scripts is required by Next's inline RSC payload
 * without per-request nonces, and nonces would force every page dynamic —
 * including the static landing page this policy is meant to protect.
 */
export function cspReportOnly(env: { sentryDsn?: string; posthogHost?: string }): string {
  const connect = ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://accounts.google.com/gsi/']
  let reportUri: string | undefined

  if (env.posthogHost) {
    try {
      const host = new URL(env.posthogHost).host
      // PostHog serves its lazy bundles from a sibling "-assets" host.
      connect.push(`https://${host}`, `https://${host.replace(/^([a-z]+)\./, '$1-assets.')}`)
    } catch {
      // A malformed host leaves PostHog off the list; report-only means that
      // shows up as reports, not as broken analytics.
    }
  }

  if (env.sentryDsn) {
    try {
      const dsn = new URL(env.sentryDsn)
      const project = dsn.pathname.replace(/^\//, '')
      connect.push(`https://${dsn.host}`)
      if (dsn.username && project) {
        reportUri = `https://${dsn.host}/api/${project}/security/?sentry_key=${dsn.username}`
      }
    } catch {
      // No report endpoint; violations still appear in the browser console.
    }
  }

  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    "frame-src https://accounts.google.com/gsi/",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ]
  if (reportUri) directives.push(`report-uri ${reportUri}`)
  return directives.join('; ')
}
