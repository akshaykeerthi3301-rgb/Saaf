import { describe, it, expect, vi, beforeEach } from 'vitest'

const OWN = 'https://abc123@o999.ingest.us.sentry.io/4512345'
const envelope = (dsn = OWN) => `${JSON.stringify({ dsn })}\n${JSON.stringify({ type: 'event' })}\n{}`
const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('https://saaf.test/api/monitoring', { method: 'POST', body, headers })

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', OWN)
  const { __resetRateLimits } = await import('@/lib/rate-limit')
  __resetRateLimits()
})

describe('POST /api/monitoring', () => {
  it('passes an envelope for our own project on to Sentry and says so', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', f)
    const { POST } = await import('../route')
    const res = await POST(post(envelope()))
    expect(res.status).toBe(200)
    expect(f).toHaveBeenCalledTimes(1)
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('https://o999.ingest.us.sentry.io/api/4512345/envelope/')
  })
  it('says which status Sentry gave when it refuses, so a curl shows why', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"detail":"rejected"}', { status: 403 })))
    const { POST } = await import('../route')
    const res = await POST(post(envelope()))
    expect(res.status).toBe(502)
    expect(res.headers.get('x-upstream-status')).toBe('403')
  })
  it('refuses an envelope for someone else\'s project without calling out', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { POST } = await import('../route')
    expect((await POST(post(envelope('https://k@evil.example/1')))).status).toBe(400)
    expect(f).not.toHaveBeenCalled()
  })
  it('refuses an oversized body', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const { POST } = await import('../route')
    expect((await POST(post(envelope() + 'x'.repeat(210 * 1024)))).status).toBe(413)
    expect(f).not.toHaveBeenCalled()
  })
  it('turns a Sentry outage into a quiet 502, not an exception', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    const { POST } = await import('../route')
    expect((await POST(post(envelope()))).status).toBe(502)
  })
  it('brakes a loop', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    const { POST } = await import('../route')
    let last = 200
    for (let i = 0; i < 125; i++) last = (await POST(post(envelope(), { 'x-forwarded-for': '9.9.9.9' }))).status
    expect(last).toBe(429)
  })
})
