import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/r/[code]/route'

const hit = (code: string) => GET(new NextRequest(`https://saaf.test/r/${code}`), { params: Promise.resolve({ code }) })

describe('/r/<code>', () => {
  it('remembers a well-formed code in an httpOnly cookie and sends the visitor to sign-in', async () => {
    const res = await hit('ab12cd34')
    expect(new URL(res.headers.get('location')!).pathname).toBe('/signin')
    const cookie = res.cookies.get('saaf_ref')
    expect(cookie?.value).toBe('AB12CD34')
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i)
  })
  it('drops anything else without a cookie, and never echoes it', async () => {
    for (const bad of ['short', '<script>x', '..%2F..%2Fetc', 'ab12cd345']) {
      const res = await hit(bad)
      expect(res.cookies.get('saaf_ref')).toBeUndefined()
      expect(res.headers.get('location')).not.toContain(bad)
    }
  })
})
