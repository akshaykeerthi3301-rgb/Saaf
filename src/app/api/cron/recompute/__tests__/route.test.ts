import { describe, it, expect, vi, beforeEach } from 'vitest'

const recomputeAll = vi.fn()
vi.mock('../../../../../../ingest/recompute', () => ({ recomputeAll }))
// `after` only exists inside a real request; run its callback straight away so the test can see the follow-up.
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: (fn: () => unknown) => { void fn() } }))

const SECRET = 'test-secret'
const req = (qs = '') => new Request(`https://jobinko.in/api/cron/recompute${qs}`, { headers: { authorization: `Bearer ${SECRET}` } }) as unknown as import('next/server').NextRequest

describe('recompute route — chaining when the time budget runs out', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
    recomputeAll.mockReset()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
  })

  it('a complete run answers with its result and starts nothing else', async () => {
    recomputeAll.mockResolvedValue({ rescored: 9, skipped: 0, failed: 0, total: 9, nextFrom: 9, day: 20000 })
    const { GET } = await import('../route')
    const body = await (await GET(req())).json()
    expect(body).toMatchObject({ ok: true, rescored: 9, skipped: 0 })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('a run that stops at its budget asks the same route to continue from where it stopped, with the same day', async () => {
    recomputeAll.mockResolvedValue({ rescored: 12, skipped: 8, failed: 0, total: 20, nextFrom: 12, day: 20000 })
    const { GET } = await import('../route')
    await GET(req())
    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
    expect(url.pathname).toBe('/api/cron/recompute')
    expect(url.searchParams.get('from')).toBe('12')
    expect(url.searchParams.get('hop')).toBe('1')
    expect(url.searchParams.get('day')).toBe('20000')
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ headers: { authorization: `Bearer ${SECRET}` } })
  })

  it('a follow-up answers at once and passes its position to the scorer', async () => {
    recomputeAll.mockResolvedValue({ rescored: 8, skipped: 0, failed: 0, total: 20, nextFrom: 20, day: 20000 })
    const { GET } = await import('../route')
    const body = await (await GET(req('?from=12&hop=1&day=20000'))).json()
    expect(body).toMatchObject({ ok: true, accepted: true, from: 12, hop: 1 })
    await Promise.resolve()
    expect(recomputeAll).toHaveBeenCalledWith(expect.objectContaining({ from: 12, day: 20000 }))
  })

  it('stops chaining after the hop cap instead of looping forever', async () => {
    recomputeAll.mockResolvedValue({ rescored: 1, skipped: 5, failed: 0, total: 20, nextFrom: 15, day: 20000 })
    const { GET } = await import('../route')
    await GET(req('?from=14&hop=6&day=20000'))
    await new Promise((r) => setTimeout(r, 0))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('refuses a caller without the secret', async () => {
    const { GET } = await import('../route')
    const res = await GET(new Request('https://jobinko.in/api/cron/recompute') as unknown as import('next/server').NextRequest)
    expect(res.status).toBe(401)
    expect(recomputeAll).not.toHaveBeenCalled()
  })
})
