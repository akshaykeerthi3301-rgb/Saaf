import { describe, it, expect } from 'vitest'
import { isPrivateAddress, parseJobHtml, refusedHost } from '../job-link'

describe('parseJobHtml', () => {
  it('reads a schema.org JobPosting first', () => {
    const html = `<title>Careers</title><meta property="og:title" content="Wrong">
      <script type="application/ld+json">{"@type":"JobPosting","title":"Growth Lead","hiringOrganization":{"name":"Acme &amp; Co"}}</script>`
    expect(parseJobHtml(html)).toEqual({ title: 'Growth Lead', company: 'Acme & Co' })
  })

  it('finds it inside an @graph, past a broken block', () => {
    const html = `<script type="application/ld+json">{ bad json, }</script>
      <script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["JobPosting"],"title":"PM","hiringOrganization":"Zeta"}]}</script>`
    expect(parseJobHtml(html)).toEqual({ title: 'PM', company: 'Zeta' })
  })

  it('falls back to Open Graph, then <title>, and leaves the company blank rather than guessing', () => {
    expect(parseJobHtml(`<meta property="og:title" content="Data Analyst"><meta property="og:site_name" content="Razorpay">`))
      .toEqual({ title: 'Data Analyst', company: 'Razorpay' })
    expect(parseJobHtml(`<title>  Senior Engineer\n </title>`)).toEqual({ title: 'Senior Engineer', company: '' })
  })

  it('returns empty strings for a page that says nothing', () => {
    expect(parseJobHtml('<p>hello</p>')).toEqual({ title: '', company: '' })
  })
})

describe('isPrivateAddress — what a server fetch must never reach', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    'blocks %s', (ip) => { expect(isPrivateAddress(ip)).toBe(true) })
  it.each(['8.8.8.8', '172.32.0.1', '104.18.2.3', '2606:4700::1111'])(
    'allows %s', (ip) => { expect(isPrivateAddress(ip)).toBe(false) })
})

describe('refusedHost', () => {
  it.each(['www.linkedin.com', 'in.linkedin.com', 'www.naukri.com', 'in.indeed.com', 'www.glassdoor.co.in', 'www.foundit.in'])(
    'refuses %s', (h) => { expect(refusedHost(h)).toBe(true) })
  it.each(['job-boards.greenhouse.io', 'jobs.lever.co', 'careers.razorpay.com', 'notlinkedin.com.evil.io'])(
    'allows %s', (h) => { expect(refusedHost(h)).toBe(false) })
})
