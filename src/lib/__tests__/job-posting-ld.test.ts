import { describe, it, expect } from 'vitest'
import { jobPostingLd, type JobPostingInput } from '../job-posting-ld'
import { googleEmploymentType } from '../role-facts'

const base: JobPostingInput = {
  id: '8b2a983f-9905-49f5-b249-e069683ef712', title: 'Business Development Manager', company: 'Ingram Micro', city: 'New Delhi', location: 'New Delhi, India',
  inIndia: true, postedAt: '2026-10-08T03:00:00Z', firstSeenAt: '2026-10-07T21:00:00Z', pay: null, plainDescription: 'Own the pipeline.',
  postingFields: {}, employmentType: null, workMode: null,
}
const ORIGIN = 'https://saaf-ten.vercel.app'

describe('jobPostingLd — Google JobPosting rules (developers.google.com, fetched 2026-10-08)', () => {
  it('always carries the five required fields', () => {
    const ld = jobPostingLd(base, ORIGIN)
    for (const k of ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation']) expect(ld).toHaveProperty(k)
    expect(ld.datePosted).toBe('2026-10-08')
  })
  it('adds an identifier from the role id and the employer\'s name', () => {
    expect(jobPostingLd(base, ORIGIN).identifier).toEqual({ '@type': 'PropertyValue', name: 'Ingram Micro', value: base.id })
  })
  it('states employmentType only when the employer\'s own system did, in Google\'s words', () => {
    expect(jobPostingLd(base, ORIGIN)).not.toHaveProperty('employmentType')
    expect(jobPostingLd({ ...base, employmentType: 'fulltime' }, ORIGIN).employmentType).toBe('FULL_TIME')
    expect(googleEmploymentType('contract')).toBe('CONTRACTOR')
    expect(googleEmploymentType('parttime')).toBe('PART_TIME')
    expect(googleEmploymentType('temporary')).toBe('TEMPORARY')
    expect(googleEmploymentType('intern')).toBe('INTERN')
    expect(googleEmploymentType(null)).toBeUndefined()
  })
  it('marks TELECOMMUTE only for a role the employer states is remote — hybrid and on-site are not remote', () => {
    expect(jobPostingLd({ ...base, workMode: 'remote' }, ORIGIN).jobLocationType).toBe('TELECOMMUTE')
    expect(jobPostingLd({ ...base, workMode: 'hybrid' }, ORIGIN)).not.toHaveProperty('jobLocationType')
    expect(jobPostingLd({ ...base, workMode: 'onsite' }, ORIGIN)).not.toHaveProperty('jobLocationType')
    expect(jobPostingLd(base, ORIGIN)).not.toHaveProperty('jobLocationType')
  })
  it('never invents an expiry date or an applicant-location limit — Google says leave validThrough out when unknown', () => {
    const ld = jobPostingLd({ ...base, workMode: 'remote', employmentType: 'fulltime' }, ORIGIN)
    expect(ld).not.toHaveProperty('validThrough')
    expect(ld).not.toHaveProperty('applicantLocationRequirements')
  })
  it('includes baseSalary only for pay the posting states', () => {
    expect(jobPostingLd(base, ORIGIN)).not.toHaveProperty('baseSalary')
    const ld = jobPostingLd({ ...base, pay: { text: '₹12–18 L / year', currency: 'INR', low: 1200000, high: 1800000, period: 'year' } }, ORIGIN)
    expect(ld.baseSalary).toMatchObject({ currency: 'INR', value: { minValue: 1200000, maxValue: 1800000, unitText: 'YEAR' } })
  })
  it('keeps the canonical url on the site origin', () => {
    expect(jobPostingLd(base, ORIGIN).url).toBe(`${ORIGIN}/jobs/${base.id}`)
  })
})
