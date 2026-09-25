// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import '../extension/extractor.js'

/**
 * The posting reader. Structured data (schema.org JobPosting) first, the DOM
 * second — see the header of extractor.js for why.
 */
type Job = {
  title: string; company: string; location: string; salary: string
  description: string; atsPlatform: string | null; pageUrl: string; source: string
}
type Extract = { extractJob: (d: Document, l: { hostname: string; href: string }) => Job; detectAts: (h: string) => string | null }
let X: Extract
beforeAll(() => { X = (globalThis as unknown as { SaafExtract: Extract }).SaafExtract })
afterEach(() => { document.head.innerHTML = ''; document.body.innerHTML = '' })

const LONG = 'You will own the payments roadmap for our lending products. '.repeat(4)
const ld = (obj: unknown) => {
  const s = document.createElement('script')
  s.type = 'application/ld+json'
  s.textContent = JSON.stringify(obj)
  document.head.appendChild(s)
}
const at = { hostname: 'job-boards.greenhouse.io', href: 'https://job-boards.greenhouse.io/acme/jobs/1' }

describe('JSON-LD first', () => {
  it('reads title, company, location, pay and description from a JobPosting', () => {
    ld({
      '@context': 'https://schema.org', '@type': 'JobPosting',
      title: 'Senior Product Manager', hiringOrganization: { '@type': 'Organization', name: 'Acme' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'Bengaluru', addressRegion: 'KA', addressCountry: 'IN' } },
      baseSalary: { currency: 'INR', value: { minValue: 2500000, maxValue: 3500000, unitText: 'YEAR' } },
      description: `<p>${LONG}</p><ul><li>SQL</li><li>Stakeholder management</li></ul>`,
    })
    document.body.innerHTML = '<h1>Something else entirely</h1>'
    const j = X.extractJob(document, at)
    expect(j).toMatchObject({
      title: 'Senior Product Manager', company: 'Acme', location: 'Bengaluru, KA, IN',
      salary: 'INR 2500000–3500000 per year', atsPlatform: 'Greenhouse', source: 'json-ld',
      pageUrl: at.href,
    })
    expect(j.description).toContain('payments roadmap')
    expect(j.description).toContain('SQL')
    expect(j.description).not.toContain('<li>')
  })

  it('finds a JobPosting nested in an @graph, past a malformed block', () => {
    const bad = document.createElement('script')
    bad.type = 'application/ld+json'
    bad.textContent = '{ "broken": true, }'
    document.head.appendChild(bad)
    ld({ '@graph': [{ '@type': 'WebPage' }, { '@type': 'JobPosting', title: 'Data Analyst', hiringOrganization: 'Zeta', description: LONG }] })
    const j = X.extractJob(document, at)
    expect([j.title, j.company, j.source]).toEqual(['Data Analyst', 'Zeta', 'json-ld'])
  })

  it('never invents pay the posting does not state', () => {
    ld({ '@type': 'JobPosting', title: 'Analyst', description: LONG })
    expect(X.extractJob(document, at).salary).toBe('')
  })

  it('says Remote for a telecommute posting with no address', () => {
    ld({ '@type': 'JobPosting', title: 'Analyst', description: LONG, jobLocationType: 'TELECOMMUTE' })
    expect(X.extractJob(document, at).location).toBe('Remote')
  })

  it('does not load images from the description while reading it', () => {
    ld({ '@type': 'JobPosting', title: 'Analyst', description: `<img src="https://tracker.example/px.gif">${LONG}` })
    X.extractJob(document, at)
    expect(document.querySelectorAll('img').length).toBe(0)
  })
})

describe('the DOM fallback', () => {
  it('uses the page when there is no JobPosting', () => {
    document.body.innerHTML = `<h1>Growth Lead</h1><div class="job-description">${LONG}</div>`
    const j = X.extractJob(document, { hostname: 'jobs.lever.co', href: 'https://jobs.lever.co/x/1' })
    expect([j.title, j.source, j.atsPlatform]).toEqual(['Growth Lead', 'dom', 'Lever'])
    expect(j.description).toContain('payments roadmap')
  })

  it('prefers the page when the JSON-LD description is a one-line stub', () => {
    ld({ '@type': 'JobPosting', title: 'Growth Lead', description: 'Join us!' })
    document.body.innerHTML = `<main>${LONG}</main>`
    const j = X.extractJob(document, at)
    expect(j.title).toBe('Growth Lead')
    expect(j.source).toBe('dom')
  })
})

describe('ATS detection', () => {
  it.each([
    ['acme.wd3.myworkdayjobs.com', 'Workday'], ['jobs.ashbyhq.com', 'Ashby'],
    ['careers-acme.icims.com', 'iCIMS'], ['acme.darwinbox.in', 'Darwinbox'],
    ['www.naukri.com', null], ['www.linkedin.com', null],
  ])('%s → %s', (host, name) => {
    expect(X.detectAts(host)).toBe(name)
  })
})
