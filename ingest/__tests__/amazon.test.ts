import { describe, it, expect, afterEach } from 'vitest'
import { adapterFor } from '../providers'
import { parseAmazon } from '../providers/amazon'

const sample = {
  hits: 2386,
  jobs: [{
    id_icims: '10579254', job_path: '/en/jobs/10579254/senior-applied-scientist-aires',
    title: ' Senior Applied Scientist, (AiRES) ', location: 'IN, KA, Bengaluru', normalized_location: 'Bengaluru, Karnataka, India', posted_date: 'October 14, 2026',
    job_schedule_type: 'full-time',
    description: 'Build models.<br/><br/>Key job responsibilities',
    basic_qualifications: '- 5+ years of applied research experience<br/>- PhD in ML',
    preferred_qualifications: '- Publications',
  }, { id_icims: '', job_path: '/x', title: 'no id' }],
}

describe('amazon careers feed', () => {
  afterEach(() => { delete process.env.CAREER_SITES })

  it('turns a posting into a role: dated, with the qualifications in the body', () => {
    const [r, ...rest] = parseAmazon(sample)
    expect(rest).toHaveLength(0) // a record with no id is dropped, not guessed
    expect(r.externalId).toBe('10579254')
    expect(r.title).toBe('Senior Applied Scientist, (AiRES)')
    expect(r.locationRaw).toBe('Bengaluru, Karnataka, India')
    expect(r.applyUrl).toBe('https://www.amazon.jobs/en/jobs/10579254/senior-applied-scientist-aires')
    expect(r.postedAt).toBe('2026-10-14T00:00:00.000Z')
    expect(r.employmentType).toBe('fulltime')
    expect(r.description).toContain('Basic qualifications: - 5+ years of applied research experience')
    expect(r.description).not.toMatch(/<br/)
  })

  it('is OFF unless CAREER_SITES lists it: no request, and an INCOMPLETE empty read so nothing is pruned', async () => {
    const orig = globalThis.fetch
    let called = false
    globalThis.fetch = (() => { called = true; throw new Error('network used') }) as typeof fetch
    try {
      const out = await adapterFor('amazon')!.fetchAll!('IND')
      expect(out).toEqual({ roles: [], complete: false })
      expect(called).toBe(false)
    } finally { globalThis.fetch = orig }
  })

  it('pages until a short page, and reports complete', async () => {
    process.env.CAREER_SITES = 'amazon'
    const mk = (n: number) => ({ hits: 150, jobs: Array.from({ length: n }, (_, i) => ({ id_icims: String(Math.random() + i), job_path: `/p/${i}`, title: 't', location: 'IN, KA, Bengaluru', posted_date: 'x' })) })
    const pages = [mk(100), mk(50)]
    const orig = globalThis.fetch
    globalThis.fetch = (async () => ({ ok: true, json: async () => pages.shift() })) as unknown as typeof fetch
    try {
      const out = await adapterFor('amazon')!.fetchAll!('IND')
      expect(out.roles).toHaveLength(150)
      expect(out.complete).toBe(true)
    } finally { globalThis.fetch = orig }
  })
})
