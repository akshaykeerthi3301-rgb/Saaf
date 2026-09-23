import { describe, it, expect } from 'vitest'
import nextConfig from '../../../../next.config'
import { MAX_RESUME_BYTES, MAX_RESUME_MB, TOO_LARGE_MESSAGE } from '../constants'

/** Vercel's hard cap on a function request body. Not configurable on any plan. */
const HOST_BODY_CAP = 4.5 * 1024 * 1024

/** Multipart boundary, headers and the server action's own fields. */
const ENVELOPE = 256 * 1024

const bytes = (limit: string) => {
  const m = /^([\d.]+)mb$/i.exec(limit)
  if (!m) throw new Error(`unparsed bodySizeLimit ${limit}`)
  return Number(m[1]) * 1024 * 1024
}

describe('the résumé upload limit', () => {
  it('leaves the multipart envelope room under the host cap', () => {
    // Was 5 MB until 2026-09-23: a 4.7 MB file got a 413 from the platform
    // and crashed the live ATS checker (docs/QA-AUDIT.md QA-01).
    expect(MAX_RESUME_BYTES + ENVELOPE).toBeLessThanOrEqual(HOST_BODY_CAP)
  })

  it('is the number the message states', () => {
    expect(MAX_RESUME_BYTES).toBe(MAX_RESUME_MB * 1024 * 1024)
    expect(TOO_LARGE_MESSAGE).toContain(`${MAX_RESUME_MB} MB`)
  })

  it('matches the framework limit to the host, so local dev fails like production', () => {
    const limit = String(nextConfig.experimental?.serverActions?.bodySizeLimit)
    expect(bytes(limit)).toBeLessThanOrEqual(HOST_BODY_CAP)
    expect(bytes(limit)).toBeGreaterThanOrEqual(MAX_RESUME_BYTES + ENVELOPE)
  })
})
