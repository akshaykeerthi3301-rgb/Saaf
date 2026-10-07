import { describe, it, expect } from 'vitest'
import { feedJobPath, isRoleId, publicJobUrl, JOB_REPORT_KINDS } from '../job-share'

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e'

describe('job links', () => {
  it('builds the public and the feed link from a valid id', () => {
    expect(publicJobUrl('https://saaf-ten.vercel.app/', ID)).toBe(`https://saaf-ten.vercel.app/jobs/${ID}`)
    expect(feedJobPath(ID)).toBe(`/today?role=${ID}`)
  })
  it('never turns a malformed id into a link', () => {
    for (const bad of ['', 'abc', `${ID}/../x`, `${ID}?x=1`, '<script>', ID.slice(1)]) {
      expect(isRoleId(bad)).toBe(false)
      expect(publicJobUrl('https://a.b', bad)).toBeNull()
      expect(feedJobPath(bad)).toBeNull()
    }
  })
  it('offers the five report reasons the table accepts', () => {
    expect(JOB_REPORT_KINDS.map((k) => k.kind)).toEqual(['closed', 'scam', 'wrong-details', 'duplicate', 'other'])
  })
})
