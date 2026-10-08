import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The Permissions-Policy header lives in vercel.json, which local dev never sends — so a header that
 * contradicts a feature passes every local check and only fails on the live site. That is exactly how
 * voice input (src/lib/voice-input.ts) shipped blocked on 2026-10-08: `microphone=()` denied the mic to
 * the page itself (MEASURED in Chrome: allowsFeature('microphone') false, recognizer error not-allowed).
 */
describe('vercel.json Permissions-Policy', () => {
  const cfg = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] }
  const policy = cfg.headers.flatMap((h) => h.headers).find((h) => h.key === 'Permissions-Policy')?.value ?? ''

  it('lets Saaf\'s own pages use the microphone (voice input needs it) and nobody else', () => {
    expect(policy).toContain('microphone=(self)')
  })
  it('still keeps the camera and location off for everyone', () => {
    expect(policy).toContain('camera=()')
    expect(policy).toContain('geolocation=()')
  })
})
