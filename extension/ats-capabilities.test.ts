// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import '../extension/extractor.js'
import caps from './ats-capabilities.json'
import manifest from './manifest.json'

/**
 * TASK-192 (F-711): the per-site capability list is data, and it may not drift from the code.
 * Every platform the extension can name has a row; every row's example host is detected as
 * that platform; every host the manifest runs on belongs to a listed platform; and the only
 * "verified" tier is one that has evidence written next to it.
 */
const X = (globalThis as unknown as { SaafExtract: { detectAts: (h: string) => string | null } }).SaafExtract

describe('the capability list matches the extension', () => {
  it('each row’s example host is detected as that platform', () => {
    for (const p of caps.platforms) expect(X.detectAts(p.example), p.name).toBe(p.name)
  })
  it('every host the extension runs on belongs to a listed platform', () => {
    const names = new Set(caps.platforms.map((p) => p.name))
    const hosts = manifest.content_scripts[0].matches.map((m) => m.replace(/^https:\/\/(\*\.)?/, '').replace(/\/\*$/, ''))
    for (const h of hosts) {
      const platform = X.detectAts(`x.${h}`)
      expect(platform && names.has(platform), h).toBe(true)
    }
  })
  it('there is no duplicate row, and only known tiers and flows', () => {
    expect(new Set(caps.platforms.map((p) => p.name)).size).toBe(caps.platforms.length)
    for (const p of caps.platforms) {
      expect(Object.keys(caps.tiers)).toContain(p.tier)
      expect(Object.keys(caps.flows)).toContain(p.flow)
    }
  })
  it('a platform is "verified" only with its evidence written next to it', () => {
    for (const p of caps.platforms) expect(p.tier === 'verified').toBe('evidence' in p)
  })
})
