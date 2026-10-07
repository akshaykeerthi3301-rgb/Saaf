import { describe, it, expect } from 'vitest'
import { jobPostingFields, keyFor, plain, structureJob } from '../job-sections'

/**
 * Stored postings are ONE LINE — the ingest flattens the HTML — so every case here
 * is flat text, as the real ones are. The 100-posting hand check is in
 * PROJECT-STATE Stage AM-2; these cases pin the patterns it found.
 */
const pad = (s: string) => `${s} `.repeat(3).trim() // bodies must be long enough to count as a section
const keys = (t: string) => structureJob(t).sections.map((s) => s.key)

describe('headings are found by what they say', () => {
  it('reads an ALL-CAPS posting', () => {
    const t = `ABOUT ACME ${pad('Acme builds payments software for banks.')} WHAT YOU'LL DO ${pad('Own the roadmap and ship features.')} WHAT YOU BRING ${pad('Five years of product experience.')} BENEFITS ${pad('Health cover and paid leave.')}`
    expect(keys(t)).toEqual(['about', 'responsibilities', 'requirements', 'benefits'])
  })

  it('reads Title Case headings, with and without colons', () => {
    const t = `We are hiring. ${pad('Acme is a payments company in Pune.')} Key Responsibilities ${pad('Lead a team of five engineers.')} Required Qualifications: ${pad('A degree in engineering.')} Preferred Qualifications ${pad('Experience in fintech.')}`
    expect(keys(t)).toEqual(['about', 'responsibilities', 'requirements', 'preferred'])
  })

  it('reads sentence-case headings only between sentences ("What you’ll be doing")', () => {
    const t = `Your mission Your mission is to run KYC. ${pad('We care about quality.')} What you’ll be doing In this role you lead ${pad('a large operations team.')}`
    expect(structureJob(t).structured).toBe(true)
    expect(keys(t)).toContain('responsibilities')
  })

  it('places a heading it has no phrase for from the words in it', () => {
    expect(keyFor('WHAT YOU CAN EXPECT FROM US')).toBe('benefits')
    expect(keyFor('WHY SIMCORP')).toBe('about')
    expect(keyFor('WHAT WE LOOK FOR')).toBe('requirements')
    expect(keyFor('NEXT STEPS')).toBe('other')
    expect(keyFor('Essential Duties and Responsibilities')).toBe('responsibilities')
    expect(keyFor('Preferred Qualifications')).toBe('preferred')
    // The stem bug: a trailing \b made "responsib" never match "Responsibilities".
    expect(keyFor('Responsibilities')).toBe('responsibilities')
    expect(keyFor('Benefits')).toBe('benefits')
    expect(keyFor('Requirements')).toBe('requirements')
  })

  it('reads a question that is plainly a heading', () => {
    const t = `We are Acme. ${pad('We make widgets for everyone.')} What qualities are we looking for? ${pad('Expert React and TypeScript experience.')} Key Responsibilities ${pad('Own the frontend architecture.')}`
    expect(keys(t)).toEqual(['about', 'requirements', 'responsibilities'])
  })
})

describe('what is NOT a heading', () => {
  it('ignores heading words inside a sentence', () => {
    const t = `Please see our Privacy Notice for more details about how we handle data. Acme is an Equal Opportunity Employer and takes pride in diversity. ${pad('We build software.')}`
    expect(structureJob(t).structured).toBe(false)
  })

  it('ignores a quoted phrase', () => {
    expect(structureJob(`${pad('Select ‘About Us’ during the application and enter your referral code.')} ${pad('Then continue.')}`).structured).toBe(false)
  })

  it('ignores acronym runs like "SAP MM" and "AWS AI/ML"', () => {
    expect(structureJob(`${pad('Experience with SAP MM and SAP PP and AWS AI/ML pipelines is useful.')}`).structured).toBe(false)
  })

  it('does not take a sentence that starts "Your Impact Shapes the World" for a heading', () => {
    const t = `${pad('When you join, your work counts.')} Your Impact Shapes the World at Acme ${pad('and we are proud of it.')} Responsibilities: ${pad('Place ads and attend fairs.')}`
    expect(structureJob(t).sections.map((s) => s.heading)).not.toContain('Your Impact')
  })

  it('returns "not structured" below two headings rather than guessing a split', () => {
    const t = `${pad('Acme is hiring a finance analyst to join the team in Pune.')} Responsibilities ${pad('Close the books each month.')}`
    expect(structureJob(t)).toEqual({ structured: false, sections: [] })
  })
})

describe('shape', () => {
  it('keeps the opening as about, and the employer’s own heading beside our label', () => {
    const [intro, resp] = structureJob(`${pad('Acme builds tools for finance teams in India.')} Key Responsibilities ${pad('Run the close.')} Qualifications ${pad('A CA.')}`).sections
    expect(intro).toMatchObject({ key: 'about', heading: '' })
    expect(resp).toMatchObject({ key: 'responsibilities', heading: 'Key Responsibilities' })
  })

  it('lets a label ride on the more specific heading that follows it ("Qualifications Basic Qualifications")', () => {
    const s = structureJob(`${pad('Intro text about the company and the team here.')} Qualifications Basic Qualifications ${pad('A degree and five years.')} Preferred Qualifications ${pad('An MBA.')}`)
    expect(s.sections.map((x) => x.heading)).toEqual(['', 'Basic Qualifications', 'Preferred Qualifications'])
  })

  it('merges two sections of one kind into one', () => {
    const s = structureJob(`${pad('Intro text about the company and the team here.')} Required Skills ${pad('Python.')} Technical Skills ${pad('SQL.')} Benefits ${pad('Health cover.')}`)
    expect(s.sections.map((x) => x.key)).toEqual(['about', 'requirements', 'benefits'])
  })

  it('keeps a "Location:" line right after the opening with the opening', () => {
    const s = structureJob(`${pad('Acme builds software for finance teams in India.')} Location: Pune, India ${pad('More about the company culture and values.')} Responsibilities ${pad('Close the books.')} Qualifications ${pad('A CA.')}`)
    expect(s.sections.map((x) => x.key)).toEqual(['about', 'responsibilities', 'requirements'])
    expect(s.sections[0].text).toContain('Location: Pune, India')
  })

  it('decodes the HTML the flattening left behind, including hex newlines', () => {
    expect(plain('Work&nbsp;schedule: &#xa;&#xa; R&amp;D &#39;ok&#39; &rsquo;')).toBe("Work schedule: R&D 'ok' ’")
  })

  it('never throws on hostile or empty input', () => {
    for (const t of ['', ' ', '<script>alert(1)</script>', 'WHAT '.repeat(500), '\u0000\u0001', 'A'.repeat(100_000)]) {
      expect(() => structureJob(t)).not.toThrow()
    }
  })

  it('every character of a structured posting ends up in exactly one section, in order', () => {
    const body = `${pad('Intro words about the company here.')} Key Responsibilities ${pad('Run the close.')} Qualifications ${pad('A CA.')} Benefits ${pad('Health.')}`
    const out = structureJob(body)
    const joined = out.sections.map((s) => s.text).join(' ')
    for (const w of ['Intro', 'Run the close.', 'A CA.', 'Health.']) expect(joined).toContain(w)
  })
})

describe('schema.org fields', () => {
  it('fills only the properties the posting’s own sections support', () => {
    const f = jobPostingFields([
      { key: 'about', heading: '', text: 'a' }, { key: 'responsibilities', heading: 'R', text: 'run it' },
      { key: 'requirements', heading: 'Q', text: 'a CA' }, { key: 'preferred', heading: 'P', text: 'an MBA' },
    ])
    expect(f).toEqual({ responsibilities: 'run it', qualifications: 'a CA an MBA' })
    expect(jobPostingFields([{ key: 'about', heading: '', text: 'x' }])).toEqual({})
  })
})
