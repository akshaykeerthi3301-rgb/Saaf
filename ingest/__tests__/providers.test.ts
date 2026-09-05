import { describe, it, expect } from 'vitest'
import { toText, adapterFor } from '../providers'

describe('toText', () => {
  it('unescapes before stripping, so escaped markup does not become real markup', () => {
    expect(toText('&lt;li&gt;5+ years&lt;/li&gt;')).toBe('5+ years')
  })

  it('decodes numeric entities', () => {
    // SmartRecruiters emits &#xa0; rather than &nbsp; throughout. Left encoded,
    // it survived into stored descriptions and split words the extractor reads.
    expect(toText('Experience:&#xa0;0-2 years')).toBe('Experience: 0-2 years')
    expect(toText('caf&#233; hiring')).toBe('café hiring')
  })

  it('strips tags and collapses whitespace', () => {
    expect(toText('<p>Hello</p>\n\n<p>World</p>')).toBe('Hello World')
  })
})

describe('smartrecruiters detail fetching', () => {
  const a = adapterFor('smartrecruiters')!

  it('declares a detail endpoint, because its list endpoint carries no body', () => {
    // Every one of its 91 roles sat in the index with an empty description —
    // 15% of the whole index ranked on title alone — because the adapter's
    // comment claimed ingest fetched detail separately and nothing did.
    expect(a.detailUrl).toBeTypeOf('function')
    expect(a.parseDetail).toBeTypeOf('function')
    expect(a.detailUrl!('Swiggy', '123')).toContain('/companies/Swiggy/postings/123')
  })

  it('takes the job body and qualifications, and leaves company boilerplate out', () => {
    const text = a.parseDetail!({
      jobAd: { sections: {
        companyDescription: { text: '<p>Swiggy is India&#x2019;s leading platform.</p>' },
        jobDescription: { text: '<p>Own the sales funnel.</p>' },
        qualifications: { text: '<p>0-2 years in B2B sales.</p>' },
      } },
    })
    expect(text).toContain('Own the sales funnel.')
    expect(text).toContain('0-2 years in B2B sales.')
    // Company boilerplate is exactly the prose the extractor's company-tenure
    // filter has to fight, and it buries the section carrying the requirement.
    expect(text).not.toContain('leading platform')
  })

  it('returns empty rather than throwing on an unexpected shape', () => {
    expect(a.parseDetail!({})).toBe('')
    expect(a.parseDetail!(null)).toBe('')
  })
})
