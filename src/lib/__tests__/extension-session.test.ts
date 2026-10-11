import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.hoisted(() => ({ user: null as { id: string; email: string } | null }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
}))

const { EXTENSION_ID, EXTENSION_ORIGIN, requireExtensionUser } = await import('../extension-session')
const { __resetRateLimits } = await import('../rate-limit')

/** Chrome derives an extension's id from its public key: sha256 of the DER key, first 16 bytes, each nibble as a–p. */
function idFromKey(key: string): string {
  const hash = createHash('sha256').update(Buffer.from(key, 'base64')).digest().subarray(0, 16)
  return [...hash].map((b) => 'abcdefghijklmnop'[b >> 4] + 'abcdefghijklmnop'[b & 15]).join('')
}

const req = (headers: Record<string, string>) => new NextRequest('https://jobinko.in/api/extension/me', { headers })
const good = { origin: EXTENSION_ORIGIN, 'x-jobinko-extension': '1' }

beforeEach(() => { auth.user = null; __resetRateLimits() })

describe('the extension id', () => {
  it('is the id Chrome derives from the manifest key, so the Origin we trust is the real extension', () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'extension', 'manifest.json'), 'utf8')) as { key: string }
    expect(EXTENSION_ID).toBe(idFromKey(manifest.key))
  })
})

describe('requireExtensionUser', () => {
  it('refuses a web page: wrong or missing Origin, or no extension header — even with a signed-in cookie', async () => {
    auth.user = { id: 'u1', email: 'a@b.c' }
    const refused = [
      {}, { 'x-jobinko-extension': '1' }, { origin: EXTENSION_ORIGIN },
      { origin: 'https://evil.example', 'x-jobinko-extension': '1' },
      { origin: 'chrome-extension://someotherextensionidxxxxxxxxxxxx', 'x-jobinko-extension': '1' },
      // A page's own requests say so: never 'none'.
      { 'sec-fetch-site': 'cross-site', 'x-jobinko-extension': '1' }, { 'sec-fetch-site': 'same-site', 'x-jobinko-extension': '1' },
      // 'none' is not enough when an Origin says otherwise.
      { origin: 'https://evil.example', 'sec-fetch-site': 'none', 'x-jobinko-extension': '1' },
      // 'none' without the header (a typed URL) is not the extension.
      { 'sec-fetch-site': 'none' },
    ]
    for (const h of refused) {
      const r = await requireExtensionUser(req(h), { scope: 't' })
      expect('response' in r && r.response.status).toBe(403)
    }
  })

  it('accepts the extension\'s GET (no Origin, Sec-Fetch-Site none) as well as its POST (Origin)', async () => {
    auth.user = { id: 'u1', email: 'a@b.c' }
    const get = await requireExtensionUser(req({ 'sec-fetch-site': 'none', 'x-jobinko-extension': '1' }), { scope: 't' })
    expect('user' in get).toBe(true)
    const post = await requireExtensionUser(req(good), { scope: 't2' })
    expect('user' in post).toBe(true)
  })

  it('answers 401 signed-out when the extension is right but nobody is signed in', async () => {
    const r = await requireExtensionUser(req(good), { scope: 't' })
    expect('response' in r).toBe(true)
    if ('response' in r) {
      expect(r.response.status).toBe(401)
      expect(await r.response.json()).toEqual({ ok: false, error: 'signed-out' })
    }
  })

  it('returns the user for the real extension with a session, and rate-limits per user and scope', async () => {
    auth.user = { id: 'u1', email: 'a@b.c' }
    const r = await requireExtensionUser(req(good), { scope: 't', limit: 2 })
    expect('user' in r && r.user).toEqual({ userId: 'u1', email: 'a@b.c' })
    await requireExtensionUser(req(good), { scope: 't', limit: 2 })
    const third = await requireExtensionUser(req(good), { scope: 't', limit: 2 })
    expect('response' in third && third.response.status).toBe(429)
    // Another endpoint's allowance is separate.
    const other = await requireExtensionUser(req(good), { scope: 'other', limit: 2 })
    expect('user' in other).toBe(true)
  })
})
