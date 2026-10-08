import { describe, it, expect } from 'vitest'
import { sentryTunnelTarget } from '../sentry-tunnel'

const OWN = 'https://abc123@o999.ingest.us.sentry.io/4512345'
const env = (dsn: string) => `${JSON.stringify({ event_id: 'x', dsn })}\n${JSON.stringify({ type: 'event' })}\n{}`

describe('sentryTunnelTarget — forwards only to Saaf\'s own Sentry project', () => {
  it('rebuilds the URL from OUR dsn when the envelope names it', () => {
    expect(sentryTunnelTarget(env(OWN), OWN)).toBe('https://o999.ingest.us.sentry.io/api/4512345/envelope/')
  })
  it('accepts the same project written with a different public key', () => {
    expect(sentryTunnelTarget(env('https://zzz@o999.ingest.us.sentry.io/4512345'), OWN)).toBe('https://o999.ingest.us.sentry.io/api/4512345/envelope/')
  })
  it('refuses another project on the same host', () => {
    expect(sentryTunnelTarget(env('https://abc123@o999.ingest.us.sentry.io/1'), OWN)).toBeNull()
  })
  it('refuses any other host — it is not an open relay', () => {
    expect(sentryTunnelTarget(env('https://abc123@evil.example/4512345'), OWN)).toBeNull()
    expect(sentryTunnelTarget(env('https://abc123@o999.ingest.us.sentry.io.evil.example/4512345'), OWN)).toBeNull()
  })
  it('refuses a body that is not an envelope', () => {
    expect(sentryTunnelTarget('not json', OWN)).toBeNull()
    expect(sentryTunnelTarget('', OWN)).toBeNull()
    expect(sentryTunnelTarget('{"no":"dsn"}\n{}', OWN)).toBeNull()
    expect(sentryTunnelTarget('{"dsn":42}\n{}', OWN)).toBeNull()
  })
  it('refuses everything when Saaf has no Sentry configured', () => {
    expect(sentryTunnelTarget(env(OWN), undefined)).toBeNull()
    expect(sentryTunnelTarget(env(OWN), 'garbage')).toBeNull()
  })
})
