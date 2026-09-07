import { describe, it, expect, afterEach } from 'vitest'
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

/**
 * The completeness contract.
 *
 * `complete` decides whether ingest/run.ts prunes a board and whether it is
 * allowed to deactivate one. An adapter that reports true after a short read
 * tells run.ts that everything it did not fetch has been withdrawn by the
 * employer — which is how a Workday company lost ~97% of its postings in a
 * single run. docs/CONFLICTS.md F2.
 *
 * These stub global.fetch rather than hitting the network: the thing under test
 * is the paging arithmetic, and a live board would make the assertions depend
 * on how many jobs a company happens to have posted today.
 */
describe('fetch completeness', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  const json = (body: unknown) => ({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }) as Response

  describe('smartrecruiters', () => {
    const a = adapterFor('smartrecruiters')!

    const posting = (id: number) => ({
      id: String(id), name: `Role ${id}`,
      location: { city: 'Bengaluru', country: 'in' },
      company: { identifier: 'ACME', name: 'Acme' },
    })

    it('pages past the hundredth posting', async () => {
      // The old adapter pinned limit=100 with no offset, so a board with 250
      // postings reported 100 and the other 150 were invisible. F9.
      const pages = [
        { totalFound: 250, content: Array.from({ length: 100 }, (_, i) => posting(i)) },
        { totalFound: 250, content: Array.from({ length: 100 }, (_, i) => posting(100 + i)) },
        { totalFound: 250, content: Array.from({ length: 50 }, (_, i) => posting(200 + i)) },
      ]
      let call = 0
      globalThis.fetch = (async () => json(pages[call++])) as typeof fetch

      const { roles, complete } = await a.fetchAll!('acme')
      expect(roles).toHaveLength(250)
      expect(complete).toBe(true)
    })

    it('stops on a short page and still calls that complete', async () => {
      globalThis.fetch = (async () =>
        json({ totalFound: 40, content: Array.from({ length: 40 }, (_, i) => posting(i)) })
      ) as typeof fetch

      const { roles, complete } = await a.fetchAll!('acme')
      expect(roles).toHaveLength(40)
      expect(complete).toBe(true)
    })
  })

  describe('workday', () => {
    const a = adapterFor('workday')!
    const token = 'acme.wd5.myworkdayjobs.com/AcmeCareers'

    const facetBody = {
      facets: [{ values: [{
        facetParameter: 'locationCountry',
        values: [{ descriptor: 'India', id: 'IN-ID', count: 300 }],
      }] }],
    }
    const postings = (n: number, from: number) =>
      Array.from({ length: n }, (_, i) => ({
        externalPath: `/job/JR${from + i}`, title: `Role ${from + i}`, locationsText: 'Bengaluru, India',
      }))

    it('reports incomplete when its page cap stops it short of the total', async () => {
      // The board has 300 India postings and WD_MAX_PAGES is 1 in this process
      // (set by scripts/qualify-boards.ts). Twenty of three hundred is not the
      // board, and saying so is what stops run.ts pruning the other 280.
      process.env.WD_MAX_PAGES = '1'
      let call = 0
      globalThis.fetch = (async () => {
        call++
        if (call === 1) return json(facetBody)
        return json({ total: 300, jobPostings: postings(20, 0) })
      }) as typeof fetch

      const mod = await import('../providers/index')
      void mod
      const { roles, complete } = await a.fetchAll!(token)
      expect(roles.length).toBeLessThan(300)
      expect(complete).toBe(false)
      delete process.env.WD_MAX_PAGES
    })

    it('reports complete, and no roles, when the tenant has no India facet', async () => {
      // One request, an honest empty answer, and run.ts is entitled to
      // deactivate the board on it — unlike a partial read.
      globalThis.fetch = (async () => json({ facets: [] })) as typeof fetch
      const { roles, complete } = await a.fetchAll!(token)
      expect(roles).toEqual([])
      expect(complete).toBe(true)
    })
  })
})

/**
 * The deadline contract.
 *
 * A board large enough to outlast the cron budget is killed before run.ts
 * upserts it, so `last_ingested_at` is never stamped, so it sorts first again
 * the next day — and the rest of the registry never gets fetched. At 31 boards
 * that could not happen; at 1,500, with Workday tenants holding thousands of
 * India postings, it is the default outcome without this.
 */
describe('paging adapters honour a deadline', () => {
  const realFetch = globalThis.fetch
  afterEach(() => { globalThis.fetch = realFetch })

  const json = (body: unknown) => ({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
  }) as Response

  it('smartrecruiters stops and reports incomplete', async () => {
    const a = adapterFor('smartrecruiters')!
    globalThis.fetch = (async () => json({
      totalFound: 5000,
      content: Array.from({ length: 100 }, (_, i) => ({
        id: String(i), name: 'Role', location: { city: 'Pune', country: 'in' },
        company: { identifier: 'ACME', name: 'Acme' },
      })),
    })) as typeof fetch

    // Already past the deadline: it must not fetch fifty pages to find out.
    const { roles, complete } = await a.fetchAll!('acme', { deadline: Date.now() - 1 })
    expect(complete).toBe(false)
    expect(roles.length).toBeLessThan(5000)
  })

  it('workday stops and reports incomplete', async () => {
    const a = adapterFor('workday')!
    let call = 0
    globalThis.fetch = (async () => {
      call++
      if (call === 1) {
        return json({ facets: [{ values: [{
          facetParameter: 'locationCountry',
          values: [{ descriptor: 'India', id: 'IN', count: 3000 }],
        }] }] })
      }
      return json({
        total: 3000,
        jobPostings: Array.from({ length: 20 }, (_, i) => ({
          externalPath: `/job/JR${call}-${i}`, title: 'Role', locationsText: 'Pune, India',
        })),
      })
    }) as typeof fetch

    const { roles, complete } = await a.fetchAll!(
      'acme.wd5.myworkdayjobs.com/AcmeCareers',
      { deadline: Date.now() - 1 },
    )
    expect(complete).toBe(false)
    expect(roles.length).toBeLessThan(3000)
  })

  it('runs to completion when the deadline is generous', async () => {
    const a = adapterFor('smartrecruiters')!
    globalThis.fetch = (async () => json({
      totalFound: 30,
      content: Array.from({ length: 30 }, (_, i) => ({
        id: String(i), name: 'Role', location: { city: 'Pune', country: 'in' },
        company: { identifier: 'ACME', name: 'Acme' },
      })),
    })) as typeof fetch

    const { roles, complete } = await a.fetchAll!('acme', { deadline: Date.now() + 60_000 })
    expect(complete).toBe(true)
    expect(roles).toHaveLength(30)
  })
})
