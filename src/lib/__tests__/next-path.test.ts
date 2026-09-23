import { describe, it, expect } from 'vitest'
import { safeNextPath, postSignInPath } from '../next-path'

describe('safeNextPath — same-site relative paths only (QA-22)', () => {
  it('keeps a page and its query', () => {
    expect(safeNextPath('/applications')).toBe('/applications')
    expect(safeNextPath('/today?show=far&n=60')).toBe('/today?show=far&n=60')
    expect(safeNextPath(encodeURIComponent('/interview-prep?role=abc'))).toBe('/interview-prep?role=abc')
  })

  it.each([
    'https://evil.example/phish',
    '//evil.example/phish',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    '%2F%2Fevil.example',
    '/%5Cevil.example',
    '/today\r\nSet-Cookie: x=1',
    'today',
    '',
  ])('refuses %j', (raw) => {
    expect(safeNextPath(raw)).toBeNull()
  })

  it('never loops back into sign-in or out to an API route', () => {
    expect(safeNextPath('/signin')).toBeNull()
    expect(safeNextPath('/auth/callback?code=x')).toBeNull()
    expect(safeNextPath('/api/cron/ingest')).toBeNull()
    expect(safeNextPath('/signing-bonus')).toBe('/signing-bonus')
  })

  it('refuses something absurdly long', () => {
    expect(safeNextPath('/' + 'a'.repeat(600))).toBeNull()
  })
})

describe('postSignInPath', () => {
  it('finishes onboarding first, whatever was remembered', () => {
    expect(postSignInPath(false, '/applications')).toBe('/start')
  })
  it('returns a confirmed candidate where they were going', () => {
    expect(postSignInPath(true, '/applications')).toBe('/applications')
  })
  it('falls back to the shortlist for nothing, or for anything unsafe', () => {
    expect(postSignInPath(true, undefined)).toBe('/today')
    expect(postSignInPath(true, '//evil.example')).toBe('/today')
  })
})
