import { describe, it, expect } from 'vitest'
import { jobGist, GIST_MAX } from '../job-gist'
import { plain } from '../job-sections'

const G2 = "About G2 - The Company G2 is the world's largest and most trusted software marketplace. We cheer for each other's successes and learn from our mistakes together as one team. ABOUT THE ROLE G2 is looking for a Customer Success Manager who is responsible for driving adoption, retention, and customer satisfaction across a high-volume portfolio of accounts. The CSM will partner closely with Sales and Product. YOU WILL BE RESPONSIBLE FOR Customer Engagement & Portfolio Management - Manage a portfolio of 300+ accounts through a hybrid model."

describe('jobGist — the posting\'s own words about the job, never invented', () => {
  it('takes the role-specific part, not the company pitch that opens the posting', () => {
    const g = jobGist(G2, 'Customer Success Manager')!
    expect(g).toMatch(/Customer Success Manager/)
    expect(g).not.toMatch(/world's largest/)
  })
  it('with no title it still avoids the pitch when the posting has an "about the role" part', () => {
    const d = 'Acme builds payment rails for small shops across India and has grown fast since 2019. ABOUT THE ROLE You will own onboarding for new merchants, from first call to first transaction, across three cities. WHAT YOU WILL DO Run weekly merchant reviews and fix what blocks go-live.'
    expect(jobGist(d)).toMatch(/own onboarding/)
  })
  it('is always an exact span of the posting (so the card cannot say what the employer did not)', () => {
    for (const d of [G2, 'We are hiring a Data Analyst to build dashboards for the finance team. You will work with SQL and Tableau every day.']) {
      const g = jobGist(d)!
      expect(plain(d).includes(g)).toBe(true)
    }
  })
  it('adds a second sentence only when the first is short', () => {
    const d = 'Senior Backend Engineer. We are hiring a backend engineer to own our payments service end to end. You will design APIs, review code and mentor two juniors on the team.'
    const g = jobGist(d)!
    expect(g.length).toBeLessThanOrEqual(GIST_MAX)
    expect(g).toMatch(/payments service/)
  })
  it('skips equal-opportunity and apply-now lines', () => {
    const d = 'Acme is an equal opportunity employer and welcomes all qualified applicants. We are looking for an Accountant to manage month-end close and reconciliations for three entities.'
    const g = jobGist(d)!
    expect(g).toMatch(/Accountant/)
    expect(g).not.toMatch(/equal opportunity/i)
  })
  it('never exceeds the limit, and a very long sentence is cut at a word, still an exact span', () => {
    const long = `We need ${'a very capable and enthusiastic person who can deliver across many different kinds of work '.repeat(12)}to join us.`
    const g = jobGist(long)!
    expect(g.length).toBeLessThanOrEqual(GIST_MAX)
    expect(plain(long).includes(g)).toBe(true)
    expect(g.endsWith(' ')).toBe(false)
  })
  it('decodes the stored entities, like the rest of the posting reader', () => {
    expect(jobGist('We&#39;re hiring a Product Analyst to turn usage data into decisions for the growth team at Acme.')).toMatch(/We're hiring/)
  })
  it('drops a leading heading label or bullet, and what is left is still an exact span', () => {
    const d = 'About the Role We are looking for a skilled Finacle Test Engineer with 6+ years of experience to join our banking technology team. You will own regression.'
    const g = jobGist(d, 'Finacle Test Engineer')!
    expect(g.startsWith('We are looking')).toBe(true)
    expect(plain(d).includes(g)).toBe(true)
    const b = '· Visiting 5-6 clients daily to pitch them hiring products · Generate prospects and share data with your manager every single week.'
    expect(jobGist(b)!.startsWith('Visiting')).toBe(true)
  })
  it('matches the role noun and ignores seniority words — a "Staff Engineer" posting often says only "engineer"', () => {
    const d = 'Netskope is a leader in modern security and networking for the cloud and AI era, trusted worldwide. As an engineer you will build the agent that stops data loss on endpoints across every platform.'
    expect(jobGist(d, 'Staff Engineer, Endpoint DLP')).toMatch(/As an engineer you will build/)
  })
  it('never shows a fragment that opens mid-thought', () => {
    const d = 'What You Will Do and what comes next is a long list of duties for the whole year ahead. Acme needs a Packing Operator to set up and run the blister packing line on night shift.'
    const g = jobGist(d)!
    expect(g).toMatch(/^[A-Z]/)
  })
  it('says nothing for a posting with nothing usable', () => {
    expect(jobGist(null)).toBeNull()
    expect(jobGist('')).toBeNull()
    expect(jobGist('Apply now at https://acme.example/jobs/1 — equal opportunity employer.')).toBeNull()
  })
})
