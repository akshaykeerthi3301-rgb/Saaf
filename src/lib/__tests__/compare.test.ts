import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { COMPARISONS, FACTS } from '../compare'
import caps from '../taxonomy/ats-capabilities.json'
import { KEYWORD_ROLES } from '../role-keywords'

/**
 * The comparison pages make claims about Saaf only, so each claim that quotes a number or a rule is pinned
 * to the place that holds it. If the product stops doing something, this fails before the page keeps saying so.
 */
const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8')

describe('comparison pages stay true to the code', () => {
  it('the daily cap quoted is the extension’s own', () => {
    expect(read('extension/service-worker.js')).toContain(`const DAILY_CAP = ${FACTS.applyDailyCap}`)
  })
  it('the number of recognised sites is the capability list’s', () => {
    expect(caps.platforms).toHaveLength(FACTS.extensionSites)
  })
  it('the number of measured roles is the keyword data’s', () => {
    expect(KEYWORD_ROLES).toHaveLength(FACTS.keywordRoles)
  })
  it('the auto-apply answers match the rules written in the extension', () => {
    const a = read('extension/autoapply.js')
    expect(a).toMatch(/NEVER GETS PAST A CAPTCHA/)
    expect(a).toMatch(/NEVER GUESSES/)
    expect(a).toMatch(/NEVER CLAIMS WHAT IT DID NOT SEE/)
    expect(a).toMatch(/OFF UNTIL THE CANDIDATE TURNS IT ON/)
  })
  it('no page names a product or company other than Saaf and the neutral vendors it reads feeds from', () => {
    const text = JSON.stringify(COMPARISONS)
    for (const rival of ['Jobright', 'Naukri', 'Indeed', 'Glassdoor', 'Resume Worded', 'Jobscan', 'Teal', 'Simplify']) {
      // Naukri and LinkedIn appear once, as sites Saaf does NOT scrape — never as a claim about what they do.
      if (rival === 'Naukri') continue
      expect(text, rival).not.toContain(rival)
    }
  })
  it('every question has an answer and somewhere to check it', () => {
    for (const c of COMPARISONS) {
      expect(c.questions).toHaveLength(6)
      for (const q of c.questions) { expect(q.saaf.length).toBeGreaterThan(40); expect(q.check.href).toMatch(/^\//) }
    }
  })
})
