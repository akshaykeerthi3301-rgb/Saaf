import { describe, it, expect } from 'vitest'
import { EMPTY_VIEW, interpretFeedQuery, parseFeedQuery, type FeedView } from '../feed-query'

/**
 * TASK-156 acceptance: 100 phrasings → filters, at least 90% exact.
 *
 * Each expectation is the reading a careful person would give the sentence, written
 * BEFORE the parser was run against it — not the parser's output copied back. "Exact"
 * means the whole view equals the expected one: every filter, the sort and the title
 * words, so a stray leftover word counts as a miss.
 *
 * ⚠️ After the first run the parser was changed to fix the misses (see PROJECT-STATE
 * Stage AL). These are therefore no longer held-out phrasings; the first-run score,
 * recorded there, is the less flattering and more honest number.
 */

const v = (o: Partial<FeedView>): FeedView => ({ ...EMPTY_VIEW, ...o })

const CASES: [string, Partial<FeedView>][] = [
  // role + city
  ['product manager in Bangalore', { q: 'product manager', city: 'Bengaluru' }],
  ['data analyst Pune', { q: 'data analyst', city: 'Pune' }],
  ['looking for marketing roles in Mumbai', { q: 'marketing', city: 'Mumbai' }],
  ['software engineer jobs hyderabad', { q: 'software engineer', city: 'Hyderabad' }],
  ['HR business partner Gurgaon', { q: 'hr business partner', city: 'Gurugram' }],
  ['customer success manager, Delhi NCR', { q: 'customer success manager', city: 'Delhi' }],
  ['finance analyst in Chennai please', { q: 'finance analyst', city: 'Chennai' }],
  ['sales executive Kolkata', { q: 'sales executive', city: 'Kolkata' }],
  ['need a consulting job in Navi Mumbai', { q: 'consulting', city: 'Navi Mumbai' }],
  ['ux designer ahmedabad', { q: 'ux designer', city: 'Ahmedabad' }],
  ['operations manager jaipur', { q: 'operations manager', city: 'Jaipur' }],
  ['backend developer Kochi', { q: 'backend developer', city: 'Kochi' }],
  ['content writer in noida', { q: 'content writer', city: 'Noida' }],
  ['accountant Trivandrum', { q: 'accountant', city: 'Thiruvananthapuram' }],
  ['devops engineer in Bombay', { q: 'devops engineer', city: 'Mumbai' }],
  // remote
  ['remote product manager', { q: 'product manager', remote: true }],
  ['fully remote data engineer', { q: 'data engineer', remote: true }],
  ['work from home customer support', { q: 'customer support', remote: true }],
  ['wfh content writer', { q: 'content writer', remote: true }],
  ['pm in Pune, remote ok', { q: 'pm', city: 'Pune' }],
  ['analyst or remote in Bengaluru', { q: 'analyst', city: 'Bengaluru' }],
  ['remote only designer jobs', { q: 'designer', remote: true }],
  ['hybrid or remote marketing', { q: 'marketing' }],
  // easy apply
  ['easy apply data analyst', { q: 'data analyst', easy: true }],
  ['quick apply jobs in Pune', { city: 'Pune', easy: true }],
  ['product manager easy to apply Bangalore', { q: 'product manager', city: 'Bengaluru', easy: true }],
  ['one page apply sales', { q: 'sales', easy: true }],
  // posted
  ['posted today product manager', { q: 'product manager', fresh: true }],
  ['jobs posted in the last 24 hours', { fresh: true }],
  ['new today data analyst Pune', { q: 'data analyst', city: 'Pune', fresh: true }],
  ['marketing roles posted this week', { q: 'marketing', posted: '7' }],
  ['past week design jobs', { q: 'design', posted: '7' }],
  ['last 7 days software engineer', { q: 'software engineer', posted: '7' }],
  ['recent roles in the last 3 days', { posted: '3' }],
  ['posted this month finance', { q: 'finance', posted: '30' }],
  ['last 30 days hr roles', { q: 'hr', posted: '30' }],
  ['within a week product designer', { q: 'product designer', posted: '7' }],
  ['past few days operations', { q: 'operations', posted: '3' }],
  ['jobs from the past month in Chennai', { city: 'Chennai', posted: '30' }],
  ['just posted sales', { q: 'sales', fresh: true }],
  ['fresh jobs Pune', { city: 'Pune', fresh: true }],
  // level
  ['entry level data analyst', { q: 'data analyst', level: 'entry' }],
  ['fresher jobs in Bangalore', { city: 'Bengaluru', level: 'entry' }],
  ['new grad software engineer', { q: 'software engineer', level: 'entry' }],
  ['mid level product manager', { q: 'product manager', level: 'mid' }],
  ['mid-level engineer Pune', { q: 'engineer', city: 'Pune', level: 'mid' }],
  ['3-5 years analyst', { q: 'analyst', level: 'mid' }],
  ['senior level marketing manager', { q: 'marketing manager', level: 'senior' }],
  ['10+ years director', { q: 'director', level: 'senior' }],
  ['senior product manager', { q: 'senior product manager' }],
  ['junior accountant', { q: 'junior accountant' }],
  // type
  ['internship in marketing', { q: 'marketing', type: 'intern' }],
  ['software engineering intern Bangalore', { q: 'software engineering', city: 'Bengaluru', type: 'intern' }],
  ['part time content writer', { q: 'content writer', type: 'parttime' }],
  ['part-time remote design', { q: 'design', remote: true, type: 'parttime' }],
  ['contract roles in finance', { q: 'finance', type: 'contract' }],
  ['freelance writer', { q: 'writer', type: 'contract' }],
  ['full time analyst jobs', { q: 'analyst', type: 'fulltime' }],
  ['permanent roles in Mumbai', { city: 'Mumbai', type: 'fulltime' }],
  ['temporary operations jobs', { q: 'operations', type: 'contract' }],
  ['internships posted this week in Pune', { city: 'Pune', posted: '7', type: 'intern' }],
  // pay
  ['product manager paying 20 lakh', { q: 'product manager', pay: 20 }],
  ['data analyst 12 LPA', { q: 'data analyst', pay: 12 }],
  ['salary above 15 lpa engineer', { q: 'engineer', pay: 15 }],
  ['at least ₹18L backend', { q: 'backend', pay: 18 }],
  ['minimum 10 lakhs sales jobs', { q: 'sales', pay: 10 }],
  ['ctc 25 lpa or more product', { q: 'product', pay: 25 }],
  ['1 crore director', { q: 'director', pay: 100 }],
  ['more than 8 lacs per annum accountant', { q: 'accountant', pay: 8 }],
  ['above 80 match remote', { remote: true, min80: true }],
  ['over 80 lakh', { pay: 80 }],
  // leave out employers
  ['product manager excluding Accenture', { q: 'product manager', skip: 'Accenture' }],
  ['analyst not at TCS or Infosys', { q: 'analyst', skip: 'TCS,Infosys' }],
  ["sales jobs except Byju's", { q: 'sales', skip: "Byju's" }],
  ['data engineer, avoid Cognizant', { q: 'data engineer', skip: 'Cognizant' }],
  ['designer in Pune excluding Wipro, Infosys and Accenture', { q: 'designer', city: 'Pune', skip: 'Wipro,Infosys,Accenture' }],
  ['product manager other than Amazon', { q: 'product manager', skip: 'Amazon' }],
  ['finance roles not from Deloitte', { q: 'finance', skip: 'Deloitte' }],
  ['marketing, exclude Randstad', { q: 'marketing', skip: 'Randstad' }],
  // sort, strong match
  ['newest product manager roles', { q: 'product manager', sort: 'new' }],
  ['latest first data jobs', { q: 'data', sort: 'new' }],
  ['sort by newest design', { q: 'design', sort: 'new' }],
  ['strong match product roles', { q: 'product', min80: true }],
  ['best fit analyst jobs', { q: 'analyst', min80: true }],
  ['80+ matches', { min80: true }],
  // combinations
  ['remote product manager posted this week easy apply', { q: 'product manager', remote: true, posted: '7', easy: true }],
  ['entry level data analyst in Pune posted this week', { q: 'data analyst', level: 'entry', posted: '7', city: 'Pune' }],
  ['senior level product manager Bangalore remote paying 40 lakh', { q: 'product manager', level: 'senior', city: 'Bengaluru', remote: true, pay: 40 }],
  ['internship marketing Mumbai posted today', { q: 'marketing', type: 'intern', fresh: true, city: 'Mumbai' }],
  ['fresher software engineer Hyderabad easy apply', { q: 'software engineer', level: 'entry', easy: true, city: 'Hyderabad' }],
  ['contract roles in Pune excluding TCS', { type: 'contract', city: 'Pune', skip: 'TCS' }],
  ['part-time remote content writer newest', { q: 'content writer', type: 'parttime', remote: true, sort: 'new' }],
  ['mid level hr roles in Delhi NCR last month', { q: 'hr', level: 'mid', city: 'Delhi', posted: '30' }],
  // nothing to read, or only title words
  ['jobs', {}],
  ['show me some jobs please', {}],
  ['I want a job in Pune', { city: 'Pune' }],
  ['PM jobs in Bangalore with easy apply and strong match', { q: 'pm', city: 'Bengaluru', easy: true, min80: true }],
  ['marketing manager', { q: 'marketing manager' }],
  ['AI engineer', { q: 'ai engineer' }],
  ['customer experience manager Chennai', { q: 'customer experience manager', city: 'Chennai' }],
]

describe('100 phrasings → filters (TASK-156)', () => {
  it('has exactly 100 phrasings', () => expect(CASES).toHaveLength(100))

  it.each(CASES)('%s', (phrase, expected) => {
    expect(parseFeedQuery(phrase)).toEqual(v(expected))
  })

  it('reaches the 90% bar the task asks for', () => {
    const miss = CASES.filter(([p, e]) => JSON.stringify(parseFeedQuery(p)) !== JSON.stringify(v(e)))
    expect(CASES.length - miss.length).toBeGreaterThanOrEqual(90)
  })
})

describe('interpretFeedQuery — a sentence refines, removes or replaces', () => {
  const on = v({ q: 'product manager', city: 'Pune', remote: true, easy: true, posted: '7', level: 'mid' })

  it('a plain sentence REPLACES the view: no stale preset survives it', () => {
    expect(interpretFeedQuery('data analyst Mumbai', on)).toEqual(v({ q: 'data analyst', city: 'Mumbai' }))
  })

  it('"also …" and "only …" add to what is on screen', () => {
    expect(interpretFeedQuery('also posted this week', v({ q: 'analyst' }))).toEqual(v({ q: 'analyst', posted: '7' }))
    expect(interpretFeedQuery('only senior level', v({ q: 'analyst' }))).toEqual(v({ q: 'analyst', level: 'senior' }))
    expect(interpretFeedQuery('and remote', v({ city: 'Pune' }))).toEqual(v({ city: 'Pune', remote: true }))
  })

  it('a refinement adds title words once and employers to the list', () => {
    expect(interpretFeedQuery('also product', v({ q: 'product manager' })).q).toBe('product manager')
    expect(interpretFeedQuery('also excluding Wipro', v({ skip: 'TCS' })).skip).toBe('TCS,Wipro')
  })

  it('"remove …" takes one filter off and leaves the rest', () => {
    expect(interpretFeedQuery('remove remote', on)).toEqual({ ...on, remote: false })
    expect(interpretFeedQuery('drop the city', on)).toEqual({ ...on, city: '' })
    expect(interpretFeedQuery('remove easy apply', on)).toEqual({ ...on, easy: false })
    expect(interpretFeedQuery('clear the date', on)).toEqual({ ...on, posted: '' })
    expect(interpretFeedQuery('remove experience level', on)).toEqual({ ...on, level: '' })
  })

  it('"remove everything" empties the view', () => {
    expect(interpretFeedQuery('remove everything', on)).toEqual(EMPTY_VIEW)
  })

  it('removing something that is not on changes nothing', () => {
    expect(interpretFeedQuery('remove pay', on)).toEqual(on)
  })
})
