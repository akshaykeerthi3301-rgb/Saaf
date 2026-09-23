import { describe, it, expect } from 'vitest'
import { cultureTags, formatDescription, isEasyApply, titleSeniority } from '@/lib/job-facts'

describe('isEasyApply', () => {
  it('accepts single-page, no-account ATS hosts', () => {
    expect(isEasyApply('https://job-boards.greenhouse.io/okta/jobs/1')).toBe(true)
    expect(isEasyApply('https://jobs.lever.co/cred/abc')).toBe(true)
    expect(isEasyApply('https://jobs.ashbyhq.com/x/y')).toBe(true)
    expect(isEasyApply('https://apply.workable.com/x/j/1')).toBe(true)
  })
  it('refuses multi-step, account-first ATS hosts the extension still runs on', () => {
    expect(isEasyApply('https://acme.wd3.myworkdayjobs.com/en-US/x')).toBe(false)
    expect(isEasyApply('https://careers-acme.icims.com/jobs/1')).toBe(false)
  })
  it('refuses lookalike hosts and junk', () => {
    expect(isEasyApply('https://greenhouse.io.evil.com/x')).toBe(false)
    expect(isEasyApply('not a url')).toBe(false)
    expect(isEasyApply(null)).toBe(false)
  })
})

describe('titleSeniority', () => {
  it.each([
    ['Senior Product Manager', 'Senior'],
    ['Sr. Data Analyst', 'Senior'],
    ['Lead Engineer II', 'Lead'],
    ['Staff Software Engineer', 'Lead'],
    ['Senior Director, Finance', 'Executive'],
    ['Head of Growth', 'Executive'],
    ['Software Engineer II', 'Mid'],
    ['Associate Consultant', 'Entry'],
    ['Marketing Intern', 'Intern'],
  ])('%s → %s', (title, expected) => {
    expect(titleSeniority(title)).toBe(expected)
  })
  it('says nothing when the title says nothing', () => {
    expect(titleSeniority('Product Manager')).toBeNull()
  })
})

describe('cultureTags', () => {
  it('tags only what the posting says, with the phrase as evidence', () => {
    const tags = cultureTags('We are a fast-paced team offering ESOPs and health insurance. Hybrid in Bengaluru.')
    expect(tags.map((t) => t.tag)).toEqual(['Hybrid', 'Equity / ESOPs', 'Health cover', 'Startup pace'])
    expect(tags.find((t) => t.tag === 'Equity / ESOPs')?.evidence).toBe('ESOPs')
  })
  it('returns nothing for a posting that says nothing', () => {
    expect(cultureTags('Manage the ledger.')).toEqual([])
  })
})

describe('formatDescription', () => {
  it('strips tags, splits bullets and marks requirement lines', () => {
    const blocks = formatDescription('<p>About the role</p><ul><li>3+ years of experience in SQL</li><li>Own the roadmap</li></ul>')
    expect(blocks).toEqual([
      { kind: 'heading', text: 'About the role', requirement: false },
      { kind: 'bullet', text: '3+ years of experience in SQL', requirement: true },
      { kind: 'bullet', text: 'Own the roadmap', requirement: false },
    ])
  })
  it('splits one long run into sentences so requirements can be marked', () => {
    const long = `${'We build software for teams. '.repeat(12)}You need 3+ years of experience with Python. Join us.`
    const blocks = formatDescription(long)
    expect(blocks.length).toBeGreaterThan(5)
    expect(blocks.filter((b) => b.requirement).map((b) => b.text)).toEqual(['You need 3+ years of experience with Python.'])
  })
  it('never passes markup through', () => {
    const blocks = formatDescription('Hello <script>alert(1)</script> world')
    expect(blocks.map((b) => b.text).join(' ')).not.toMatch(/<|>/)
  })
})
