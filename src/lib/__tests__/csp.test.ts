import { describe, it, expect } from 'vitest'
import { cspReportOnly } from '../csp'

describe('cspReportOnly', () => {
  const csp = cspReportOnly({
    sentryDsn: 'https://abc123@o999.ingest.us.sentry.io/4242',
    posthogHost: 'https://us.i.posthog.com',
  })

  it('allows the services the app actually calls', () => {
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.supabase\.co/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/us\.i\.posthog\.com/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/us-assets\.i\.posthog\.com/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/o999\.ingest\.us\.sentry\.io/)
  })

  it('reports to Sentry’s security endpoint, built from the DSN', () => {
    expect(csp).toContain('report-uri https://o999.ingest.us.sentry.io/api/4242/security/?sentry_key=abc123')
  })

  it('keeps the protections that matter', () => {
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "default-src 'self'"]) {
      expect(csp).toContain(d)
    }
  })

  it('still produces a policy with no environment at all', () => {
    const bare = cspReportOnly({})
    expect(bare).toContain("default-src 'self'")
    expect(bare).not.toContain('report-uri')
  })
})
