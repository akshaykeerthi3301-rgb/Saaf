import { describe, it, expect, vi } from 'vitest'

const state = vi.hoisted(() => ({ paused: false }))
vi.mock('@/lib/services/service-flags', () => ({
  readApplyForMeStatus: async () => ({ paused: state.paused, message: state.paused ? 'Paused.' : '' }),
}))
const { GET } = await import('../route')

describe('GET /api/extension/status', () => {
  it('says on, uncached', async () => {
    const res = await GET()
    expect(await res.json()).toEqual({ applyForMe: 'on', message: '' })
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
  it('says paused with the message', async () => {
    state.paused = true
    expect(await (await GET()).json()).toEqual({ applyForMe: 'paused', message: 'Paused.' })
  })
})
