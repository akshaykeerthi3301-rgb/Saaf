import { describe, it, expect } from 'vitest'
import manifest from '../manifest'

describe('the web app manifest', () => {
  const m = manifest()
  it('makes the site installable: name, a start page inside its scope, standalone display', () => {
    expect(m.name).toBe('Jobinko')
    expect(m.display).toBe('standalone')
    expect(m.start_url?.startsWith(m.scope ?? '/')).toBe(true)
  })
  it('carries the 192 and 512 icons an installable app needs, both served by our own route', () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
    for (const i of m.icons ?? []) expect(i.src).toMatch(/^\/icons\/(192|512)$/)
  })
  it('claims no offline mode — it describes the site and nothing more', () => {
    expect(JSON.stringify(m)).not.toMatch(/serviceworker|offline|share_target|shortcuts/i)
  })
})
