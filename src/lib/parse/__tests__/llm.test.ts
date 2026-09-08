import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { stripContactDetails, normalise, cleanTitle, readResumeWithModel } from '../llm'

describe('stripContactDetails', () => {
  it('removes the contact details a skills reader has no need for', () => {
    const out = stripContactDetails(
      'Priya Iyer\npriya.iyer@gmail.com\n+91 98765 43210\nlinkedin.com/in/priya-iyer\nProduct Manager'
    )
    expect(out).not.toContain('priya.iyer@gmail.com')
    expect(out).not.toContain('98765')
    expect(out).not.toContain('priya-iyer')
    // Everything the model actually needs survives.
    expect(out).toContain('Product Manager')
    expect(out).toContain('Priya Iyer')
  })
})

describe('normalise', () => {
  it('rejects anything that is not an object', () => {
    expect(normalise(null)).toBeNull()
    expect(normalise('nope')).toBeNull()
  })

  it('keeps clean fields', () => {
    const r = normalise({
      currentTitle: 'Product Manager', employer: 'Paytm', yearsExperience: 3,
      city: 'Bengaluru', domain: 'fintech', skills: ['SQL', 'Roadmapping'],
    })!
    expect(r.currentTitle).toBe('Product Manager')
    expect(r.yearsExperience).toBe(3)
    expect(r.skills).toEqual(['SQL', 'Roadmapping'])
  })

  it('drops an implausible experience figure rather than storing it', () => {
    // A model reporting 60 years has misread something; the field is dropped
    // and the deterministic parser's value stands.
    expect(normalise({ yearsExperience: 60, skills: [] })!.yearsExperience).toBeUndefined()
    expect(normalise({ yearsExperience: -2, skills: [] })!.yearsExperience).toBeUndefined()
  })

  it('deduplicates, trims and caps the skills list', () => {
    const r = normalise({ skills: ['SQL', ' SQL ', 'x', 'a'.repeat(50), 'Figma', 42] })!
    expect(r.skills).toContain('SQL')
    expect(r.skills).toContain('Figma')
    expect(r.skills.filter((s) => s === 'SQL')).toHaveLength(1)
    expect(r.skills).not.toContain('x')                 // too short
    expect(r.skills.some((s) => s.length > 40)).toBe(false)
    expect(r.skills.every((s) => typeof s === 'string')).toBe(true)
  })

  it('survives a response missing everything but skills', () => {
    const r = normalise({ skills: [] })!
    expect(r.skills).toEqual([])
    expect(r.currentTitle).toBeUndefined()
  })
})

describe('cleanTitle', () => {
  it('strips an employer and date tail the model returned as one line', () => {
    // The exact string Groq returned for this repo's own PDF fixture, which
    // reached preferred_role and produced an empty shortlist.
    expect(cleanTitle('Systems Engineer at Infosys Jun 2024 - Present')).toBe('Systems Engineer')
  })

  it('leaves an already-clean title alone', () => {
    for (const t of ['Product Manager', 'Senior Manager, Strategy', 'VP of Engineering', 'Associate Director']) {
      expect(cleanTitle(t)).toBe(t)
    }
  })

  it('strips a bare year range', () => {
    expect(cleanTitle('Business Analyst 2019 - 2021')).toBe('Business Analyst')
    expect(cleanTitle('Consultant 2021 – Present')).toBe('Consultant')
  })

  it('strips an employer with no dates', () => {
    expect(cleanTitle('Product Manager at Paytm')).toBe('Product Manager')
  })

  it('returns undefined for nothing usable', () => {
    expect(cleanTitle(undefined)).toBeUndefined()
    expect(cleanTitle('   ')).toBeUndefined()
    expect(cleanTitle('at Infosys')).toBeUndefined()
  })

  it('is applied by normalise(), not merely exported', () => {
    const r = normalise({ currentTitle: 'Systems Engineer at Infosys Jun 2024 - Present', skills: ['SQL'] })!
    expect(r.currentTitle).toBe('Systems Engineer')
  })
})

describe('the provider fallback chain', () => {
  const KEYS = ['GROQ_API_KEY', 'GEMINI_API_KEY'] as const
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => { for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k] } })
  afterEach(() => { for (const k of KEYS) { if (saved[k]) process.env[k] = saved[k]; else delete process.env[k] } })

  it('returns null with no key at all, without calling out', async () => {
    expect(await readResumeWithModel('Priya Iyer, Product Manager at Paytm.')).toBeNull()
  })

  it('falls over to the second provider when the first throws', async () => {
    // The regression this pins: the old code picked ONE provider and returned
    // null the moment it failed, so a Groq outage silently degraded every
    // résumé read to regex-only while a working Gemini key sat unused.
    process.env.GROQ_API_KEY = 'test-groq'
    process.env.GEMINI_API_KEY = 'test-gemini'

    const calls: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      const u = String(url)
      if (u.includes('groq.com')) { calls.push('groq'); throw new TypeError('groq is down') }
      calls.push('gemini')
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ skills: ['SQL'], currentTitle: 'Product Manager' }) }] } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as typeof fetch

    try {
      const out = await readResumeWithModel('Priya Iyer, Product Manager at Paytm.')
      expect(calls).toEqual(['groq', 'gemini'])
      expect(out?.currentTitle).toBe('Product Manager')
      expect(out?.skills).toContain('SQL')
    } finally {
      globalThis.fetch = original
    }
  })

  it('returns null only after every provider has failed', async () => {
    process.env.GROQ_API_KEY = 'test-groq'
    process.env.GEMINI_API_KEY = 'test-gemini'
    const calls: string[] = []
    const original = globalThis.fetch
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url).includes('groq.com') ? 'groq' : 'gemini')
      throw new TypeError('both down')
    }) as typeof fetch
    try {
      expect(await readResumeWithModel('Priya Iyer, Product Manager at Paytm.')).toBeNull()
      expect(calls).toEqual(['groq', 'gemini'])
    } finally {
      globalThis.fetch = original
    }
  })
})
