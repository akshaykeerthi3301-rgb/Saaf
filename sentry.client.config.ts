import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Session replay is off: this product's third guarantee is that nothing about
  // a candidate's job search is shared, and replaying their screen while they
  // read a shortlist of employers would contradict it.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event) {
    // Never let résumé-derived text reach an error report.
    if (event.request?.data) delete event.request.data
    return event
  },
})
