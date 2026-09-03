import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // The résumé parser deliberately omits exceptions because they can carry
    // fragments of the file. Strip request bodies here as a second line.
    if (event.request?.data) delete event.request.data
    return event
  },
})
