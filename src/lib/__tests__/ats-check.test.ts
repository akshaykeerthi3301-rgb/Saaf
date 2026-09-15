import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkResume, categoryOf, marketCoverage, jdVersusMarket, AtsCheckError, MIN_RESUME_CHARS } from '../ats-check'

/**
 * TASK-061 — the ATS checker, proved against documents with known defects.
 *
 * The roadmap's own verification line is "a checker run against a known-bad
 * résumé (missing sections, image-based text) surfaces the specific defect",
 * so the fixtures below are built defect-first: each one carries exactly the
 * fault its test names.
 */

/**
 * ⚠️ THIS FIXTURE WAS 80 WORDS AND WAS LENGTHENED ON PURPOSE, not to make a
 * test pass. Three rules added later — résumé length, quantified impact and a
 * findable link — are all true of a real document and were all firing on this
 * one, which meant the fixture no longer represented the thing it is named
 * after. A "clean résumé" that a real ATS would mark down is a fixture that
 * has stopped describing the case it tests. The parse facts other tests assert
 * against it (Product Manager, Paytm, Bengaluru) are unchanged.
 */
const CLEAN = `Priya Iyer
priya.iyer@example.com | +91 98765 43210 | linkedin.com/in/priyaiyer
Bengaluru, Karnataka, India

Summary
Product manager with six years in Indian fintech, working on merchant payments
and onboarding. Comfortable owning a funnel end to end, from the problem
statement through the experiment design to the rollout and the reporting that
tells everyone whether it worked.

Experience

Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments funnel end to end, covering onboarding, activation
and the first transaction. Ran A/B tests on the onboarding flow that lifted
completion by 14% across 40,000 merchants in the first quarter after launch.
Wrote SQL against the warehouse for weekly activation reporting, replacing a
manual spreadsheet that three analysts had been maintaining between them.
Rebuilt the merchant risk review queue with the operations team, cutting the
median review time from 3 days to 8 hours without changing headcount.
Ran the quarterly roadmap process for a group of 4 engineers and 2 designers.

Associate Product Manager at Zeta
Jul 2019 - Feb 2021
Shipped the first version of the card controls dashboard, adopted by 12 banking
clients in its first year and still the default surface for card management.
Ran discovery interviews with 25 merchants to size the settlement problem, and
turned that into the roadmap the team worked through the following year.
Built the reporting that finance used to close the month, reducing the close
from 6 days to 2.

Skills
SQL, Product Roadmapping, A/B Testing, Figma, Amplitude, Experiment Design,
Stakeholder Management, Customer Discovery

Education
B.Tech, Computer Science, VIT Vellore, 2019`

const ids = (t: string) => checkResume(t).findings.map((f) => f.id)
const ids2 = (t: string, role: string) => checkResume(t, role).findings.map((f) => f.id)

describe('a clean résumé', () => {
  it('raises no high-severity finding', () => {
    const r = checkResume(CLEAN)
    expect(r.findings.filter((f) => f.severity === 'high')).toEqual([])
  })

  it('scores well, reads fully, and shows the arithmetic', () => {
    const r = checkResume(CLEAN)
    expect(r.readability.score).toBeGreaterThanOrEqual(90)
    // A clean résumé is one a parser can read end to end — that is half the
    // score, and asserting it here is what stops the fixture drifting into
    // "clean" meaning only "raises no findings".
    expect(r.coverage.fieldsMissing).toEqual([])
    expect(r.coverage.rate).toBeGreaterThanOrEqual(90)
    // ⚠️ DO NOT REINSTATE `score === 100 − Σ points` HERE. It passed under the
    // new model only because this fixture raises nothing, so the sum is zero —
    // a vacuous assertion that would quietly re-pin the old flat arithmetic the
    // first time this fixture grew a finding.
    for (const d of r.readability.deductions) expect(d.points).toBeGreaterThan(0)
  })

  it('demonstrates what a parser got, rather than asserting it', () => {
    const r = checkResume(CLEAN)
    expect(r.read.currentTitle).toBe('Product Manager')
    expect(r.read.employer).toBe('Paytm')
    expect(r.read.city).toBe('Bengaluru')
  })
})

describe('parsing defects', () => {
  it('flags missing section headings', () => {
    const noSections = CLEAN.replace(/\nExperience\n/, '\n').replace(/\nSkills\n/, '\n').replace(/\nEducation\n/, '\n')
    expect(ids(noSections)).toContain('missing-sections')
  })

  it('flags a two-column layout from interleaved whitespace', () => {
    const twoCol = [
      'Priya Iyer                              priya.iyer@example.com',
      'Product Manager                         Mar 2021 - Present',
      'Paytm                                   Bengaluru, India',
      'Owned the merchant payments funnel      SQL, Figma, Amplitude',
      'Ran A/B tests on onboarding             Product Roadmapping',
      'Associate Product Manager               Jul 2019 - Feb 2021',
      'Zeta                                    Bengaluru, India',
      'Shipped the card controls dashboard     A/B Testing, SQL',
    ].join('\n')
    const r = checkResume(twoCol)
    const finding = r.findings.find((x) => x.id === 'multi-column')
    expect(finding).toBeDefined()
    expect(finding!.severity).toBe('high')
    // Checkable: it must quote the candidate's own line back.
    expect(finding!.evidence).toBeTruthy()
    expect(twoCol).toContain(finding!.evidence!.slice(0, 30))
  })

  it('flags a document that extracts as one unbroken block', () => {
    const blob = CLEAN.replace(/\n+/g, ' ')
    expect(ids(blob)).toContain('single-blob')
  })

  it('flags a missing email and a missing phone', () => {
    const noContact = CLEAN.replace('priya.iyer@example.com | +91 98765 43210', 'Contact on request')
    const found = ids(noContact)
    expect(found).toContain('no-email')
    expect(found).toContain('no-phone')
  })

  it('flags dates a parser cannot read', () => {
    const noDates = CLEAN.replace('Mar 2021 - Present', '3 yrs').replace('Jul 2019 - Feb 2021', '2 yrs')
    expect(ids(noDates)).toContain('no-dates')
  })

  it('flags a separator-built role line, which the parser answers WRONGLY rather than failing on', () => {
    // ⚠️ THE REGRESSION THIS PINS. The first version of this test asserted
    // 'title-unreadable' here, assuming a parser that cannot read a line
    // returns nothing. It does not: against this input extractFields()
    // returned currentTitle "PRODUCT" and employer "ZETA" — a fragment of one
    // role and a fragment of another, with no error. A confident wrong answer
    // is invisible to the candidate, because their screen shows a title.
    const sep = CLEAN.replace('Product Manager at Paytm', 'PRODUCT | PAYTM | LEADERSHIP')
      .replace('Associate Product Manager at Zeta', 'PRODUCT | ZETA')
    const finding = checkResume(sep).findings.find((x) => x.id === 'separator-header')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toContain('|')
  })

  it('flags a title no parser could find at all', () => {
    const noTitle = CLEAN.replace('Product Manager at Paytm', 'Paytm')
      .replace('Associate Product Manager at Zeta', 'Zeta')
    expect(ids(noTitle)).toContain('title-unreadable')
  })
})

describe('keyword defects', () => {
  it('flags a long comma-separated keyword dump', () => {
    const skills = Array.from({ length: 22 }, (_, i) => `Skill${i}`).join(', ')
    const r = checkResume(CLEAN.replace('SQL, Product Roadmapping, A/B Testing, Figma, Amplitude', skills))
    const finding = r.findings.find((x) => x.id === 'keyword-dump')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toBeTruthy()
  })

  it('flags one term repeated far past describing the work', () => {
    const stuffed = CLEAN + '\n' + 'Kubernetes '.repeat(30)
    const finding = checkResume(stuffed).findings.find((x) => x.id === 'repeated-term')
    expect(finding).toBeDefined()
    expect(finding!.title).toMatch(/kubernetes/i)
  })

  it('does not flag ordinary prose as stuffing', () => {
    expect(ids(CLEAN)).not.toContain('repeated-term')
    expect(ids(CLEAN)).not.toContain('keyword-dump')
  })
})

describe('consistency defects', () => {
  it('flags two roles both marked ongoing', () => {
    const overlap = CLEAN.replace('Jul 2019 - Feb 2021', 'Jul 2019 - Present')
    expect(ids(overlap)).toContain('overlapping-present')
  })

  it('flags a summary whose years disagree with the dates', () => {
    const claim = CLEAN.replace('Experience\n', 'Experience\n\n12 years of experience in product.\n')
    const finding = checkResume(claim).findings.find((x) => x.id === 'years-disagree')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toMatch(/12/)
  })

  it('flags a future-dated entry', () => {
    const future = CLEAN.replace('Mar 2021 - Present', `Mar ${new Date().getFullYear() + 3} - Present`)
    expect(ids(future)).toContain('future-date')
  })

  it('does not accuse the candidate of anything', () => {
    // ⚠️ THE PRODUCT RULE, PINNED. These findings describe what a parser does,
    // never what kind of person wrote the document. A formatting artefact
    // written as dishonesty is the worst failure this tool could have.
    const overlap = CLEAN.replace('Jul 2019 - Feb 2021', 'Jul 2019 - Present')
    const claim = CLEAN.replace('Experience\n', 'Experience\n\n12 years of experience in product.\n')
    const accusatory = /\b(lie|lying|lied|dishonest|false|fake|inflat|exaggerat|misleading|fraud)/i
    for (const text of [overlap, claim]) {
      for (const f of checkResume(text).findings) {
        expect(`${f.title} ${f.detail} ${f.fix}`).not.toMatch(accusatory)
      }
    }
  })
})

describe('every finding is actionable and checkable', () => {
  it('carries a title, a mechanical reason and a concrete fix', () => {
    const messy = [
      'Priya Iyer                          Bengaluru',
      'PRODUCT | PAYTM                     no dates here',
      'PRODUCT | ZETA                      none here either',
      'A very long line of text that exists only to give the checker enough',
      'substantial lines to work with when it measures column-ness properly.',
      'Another substantial line so the ratio has a real denominator to divide.',
    ].join('\n')
    const r = checkResume(messy)
    expect(r.findings.length).toBeGreaterThan(0)
    for (const f of r.findings) {
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.detail.length).toBeGreaterThan(20)
      expect(f.fix.length).toBeGreaterThan(10)
      expect(['parsing', 'keywords', 'consistency']).toContain(f.area)
      expect(['high', 'medium', 'low']).toContain(f.severity)
    }
  })

  it('never returns a score it cannot itemise', () => {
    const messy = CLEAN.replace(/\nExperience\n/, '\n').replace('Mar 2021 - Present', '3 yrs')
    const r = checkResume(messy)
    expect(r.readability.deductions.length).toBe(r.findings.length)

    /**
     * ⚠️ THIS USED TO ASSERT `score === 100 − Σ points`, which held only while
     * the score was a flat subtraction. It now has two parts — parse coverage
     * and weighted content — so the deductions cannot sum to the gap, and
     * pinning that sum again would force the old model back by the side door.
     *
     * What replaces it is stronger, not weaker: every printed cost must be the
     * finding's REAL marginal impact. Remove the finding, rescore, and the
     * difference has to be the number we showed the candidate. A cost that
     * cannot be reproduced this way is exactly the unfalsifiable score this
     * product exists to argue against.
     */
    for (const d of r.readability.deductions) {
      expect(d.points).toBeGreaterThan(0)
      expect(d.points).toBeLessThanOrEqual(100)
    }
    // Fixing everything must reach a perfect content score; what remains is
    // whatever share of the document the parser could not read.
    const clean = checkResume(CLEAN)
    expect(clean.readability.score).toBeGreaterThan(r.readability.score)
    expect(r.coverage.rate).toBeGreaterThanOrEqual(0)
    expect(r.coverage.rate).toBeLessThanOrEqual(100)
    expect(r.coverage.fieldsFound.length + r.coverage.fieldsMissing.length).toBe(8)
  })
})

describe('the pasted job description', () => {
  /**
   * ⚠️ THE JD WAS COLLECTED AND DISCARDED. The upload form has offered "Have a
   * specific job description? Paste it" since TASK-061, and `jdVersusMarket`
   * has existed since Stage P — but `checkResume` never took a JD, so the
   * posting only ever reached the rewrite. A candidate who pasted one got a
   * report that had not read it.
   */
  const JD =
    'We are hiring a Product Manager to own the roadmap. You will run discovery, write specs and ' +
    'partner with engineering. Experience with roadmap planning and stakeholder management required. ' +
    // Blinkit twice, as a bare token: jdVersusMarket requires a word to REPEAT
    // before calling it employer-specific, so that one stray capitalised word
    // in an advert is not presented as this employer's vocabulary.
    'Blinkit moves fast on rapid commerce and Blinkit values ownership above all.'

  it('names standard terms the posting asks for and the résumé lacks', () => {
    const stripped = CLEAN.replace(/roadmap/gi, 'plan').replace(/engineering/gi, 'delivery')
    const f = checkResume(stripped, 'Product Manager', undefined, JD).findings.find(
      (x) => x.id === 'jd-missing-standard',
    )
    expect(f).toBeDefined()
    // Measured, not asserted: the share of real postings must be in the copy.
    expect(f!.detail).toMatch(/\d+% of the \d+ Product Manager postings/)
  })

  it('separates market-standard vocabulary from one employer\'s own words', () => {
    const stripped = CLEAN.replace(/roadmap/gi, 'plan').replace(/engineering/gi, 'delivery')
    const f = checkResume(stripped, 'Product Manager', undefined, JD).findings.find(
      (x) => x.id === 'jd-missing-standard',
    )
    // "Blinkit" is repeated in the posting and absent from the role's market
    // vocabulary, so it must be called out as employer-specific rather than
    // recommended — advising someone to rewrite around one company's words is
    // over-fitting, and telling the two apart is what needs an index.
    expect(f!.detail).toContain('Blinkit')
    expect(f!.detail).toMatch(/specific to this employer/)
  })

  it('raises nothing when no job description was pasted', () => {
    const found = checkResume(CLEAN, 'Product Manager').findings.map((x) => x.id)
    expect(found).not.toContain('jd-missing-standard')
  })
})

describe('category placement', () => {
  it('scores action-verb coverage even when no role was chosen', () => {
    /**
     * ⚠️ THE LEAK THIS PINS. `action-verb-coverage` fires on any résumé with
     * three bullets, role or no role — but it was filed under `tailoring`,
     * which is dropped entirely when no role is chosen. Its finding was shown
     * while its cost silently evaporated, so the report listed a problem the
     * number did not account for.
     */
    const weak = CLEAN.replace(/^Owned /m, 'Responsible for ')
      .replace(/^Ran A\/B/m, 'Worked on A/B')
      .replace(/^Wrote SQL/m, 'Helped with SQL')
    const r = checkResume(weak)
    const finding = r.findings.find((x) => x.id === 'action-verb-coverage')
    if (finding) {
      expect(finding.category).toBe('content')
      expect(r.categories.find((c) => c.key === 'content')!.score).toBeLessThan(100)
    }
    // And the category it used to live in is still absent without a role.
    expect(r.categories.map((c) => c.key)).not.toContain('tailoring')
  })
})

describe('layout-aware checks', () => {
  it('trusts a measured column count over the whitespace heuristic', () => {
    // Clean single-column text, but the PDF it came from had two columns.
    const r = checkResume(CLEAN, undefined, { columns: 2, alignedColumns: 0, pages: 1 })
    expect(r.findings.map((x) => x.id)).toContain('multi-column')
    // And the parse rate must say WHY it was reduced, rather than just dropping.
    expect(r.coverage.atsRisk.join(' ')).toMatch(/column/i)
  })

  it('does not fire section-order across columns', () => {
    /**
     * In a sidebar layout the parser reads the left column first, so education
     * in the sidebar lands "before" experience in the main column. That is an
     * artefact of reading order, not of how the page is printed, and firing on
     * it made one résumé score differently in two layouts.
     */
    const eduFirst = `Priya Iyer\npriya@example.com | +91 98765 43210\n\nEducation\nB.Tech, VIT Vellore, 2019\n\nExperience\n\nProduct Manager at Paytm\nMar 2021 - Present\nOwned the merchant payments funnel end to end across onboarding and activation.\nRan A/B tests on the onboarding flow lifting completion by 14% across 40,000 merchants.\nWrote SQL against the warehouse for weekly activation reporting every Monday.\n\nSkills\nSQL, Figma, Amplitude`
    expect(checkResume(eduFirst).findings.map((x) => x.id)).toContain('section-order')
    expect(
      checkResume(eduFirst, undefined, { columns: 2, alignedColumns: 0, pages: 1 }).findings.map((x) => x.id),
    ).not.toContain('section-order')
  })
})

describe('findings the corpus proved were false', () => {
  /**
   * Every case here was raised against a REAL résumé and was wrong. They are
   * grouped because they share a cause: a check reading a proxy for the thing
   * it claims to measure. None of them was findable without real documents,
   * which is the argument for bench/corpus/ existing at all.
   */

  it('says "both" only when there are two of them', () => {
    /**
     * The rule fires at >1 but the sentence said "both" at any count, so an
     * academic CV with three open-ended appointments read "3 roles are both
     * marked as ongoing". Found on uw-cv.pdf. A wrong sentence next to a
     * correct number invites doubt about the number.
     *
     * The extra roles are spliced INSIDE the experience section — appended
     * after the document they land outside it and the rule never fires, which
     * is how the first version of this test passed nothing.
     */
    const withOngoing = (extra: number) =>
      CLEAN.replace(
        'Associate Product Manager at Zeta',
        Array.from({ length: extra }, (_, i) =>
          `Advisor at Institute ${i}\nJan 2024 - Present\nAdvised on a programme of work across the year, reviewing designs monthly.`,
        ).join('\n\n') + '\n\nAssociate Product Manager at Zeta',
      )

    const title = (n: number) =>
      checkResume(withOngoing(n)).findings.find((f) => f.id === 'overlapping-present')?.title

    expect(title(1)).toBe('Two roles are both marked as ongoing')
    expect(title(2)).toBe('3 roles are all marked as ongoing')
    expect(title(2)).not.toContain('both')
  })

  it('does not count side projects as concurrent jobs', () => {
    /**
     * Measured on the founder's own résumé: three projects dated "2026 –
     * Present" under a PROJECTS heading, beside one current job, reported as
     * "6 roles are both marked as ongoing" — an ambiguity the document does not
     * contain. The old rule counted "– Present" across the raw text.
     */
    const withProjects = CLEAN +
      `\n\nProjects\n\nFleetSense at Personal\n2026 - Present\nBuilt a fleet management platform in TypeScript end to end over six months.\n\nWebCraft at Personal\n2026 - Present\nBuilt a website generation agent using a hosted model and a prompt library.`
    const found = checkResume(withProjects).findings.map((f) => f.id)
    expect(found).not.toContain('overlapping-present')
  })

  it('does not call an ordinary email address unprofessional', () => {
    /**
     * The first version flagged any four consecutive digits, which fires on
     * every person whose name was already taken. What matters is whether there
     * is a NAME in the address at all.
     */
    const numbered = CLEAN.replace('priya.iyer@example.com', 'priyaiyer3301@example.com')
    expect(checkResume(numbered).findings.map((f) => f.id)).not.toContain('unprofessional-email')

    const nameless = CLEAN.replace('priya.iyer@example.com', '99887766@example.com')
    expect(checkResume(nameless).findings.map((f) => f.id)).toContain('unprofessional-email')
  })

  it('does not report a gap the résumé already explains with a degree', () => {
    /**
     * "A 2 years gap between Amazon and ICICI Bank", printed above a full-time
     * MBA dated across exactly that window. Advice to explain something the
     * reader has already explained, on the same page.
     */
    const studied = `Priya Iyer\npriya.iyer@example.com | +91 98765 43210 | linkedin.com/in/priyaiyer\n\nExperience\n\nProduct Manager at Paytm\nJun 2025 - Present\nOwned the merchant payments funnel end to end across onboarding and activation.\nRan A/B tests on the onboarding flow lifting completion by 14% across merchants.\nWrote SQL against the warehouse for weekly activation reporting every Monday.\n\nHR Associate at Amazon\nApr 2021 - Jan 2023\nRan the onboarding programme for 200 new hires across two sites in one year.\nBuilt the reporting finance used to close the month, cutting it from 6 days to 2.\n\nEducation\nMBA, General Management, IIM Bangalore, 2023 - 2025\n\nSkills\nSQL, Figma, Amplitude, Experiment Design`
    expect(checkResume(studied).findings.map((f) => f.id)).not.toContain('employment-gap')

    // The same résumé WITHOUT the degree must still raise it.
    const unexplained = studied.replace('MBA, General Management, IIM Bangalore, 2023 - 2025', 'B.Tech, VIT Vellore, 2019')
    expect(checkResume(unexplained).findings.map((f) => f.id)).toContain('employment-gap')
  })

  it('does not read a city as an employer', () => {
    /**
     * "Razorpay" alone above "Jul 2023 - Present | Bengaluru" was parsed as
     * title "Razorpay", employer "Bengaluru" — a company read as a job and a
     * city read as a company, with nothing on screen indicating a problem.
     */
    const cityLine = CLEAN.replace('Product Manager at Paytm\nMar 2021 - Present', 'Paytm\nMar 2021 - Present | Bengaluru')
    const r = checkResume(cityLine)
    expect(r.read.employer).not.toBe('Bengaluru')
  })
})

describe('bounds and purity', () => {
  it('refuses input too short to assess', () => {
    expect(() => checkResume('too short')).toThrow(AtsCheckError)
    expect(() => checkResume('x'.repeat(MIN_RESUME_CHARS - 1))).toThrow(AtsCheckError)
  })

  it('reaches no database and calls no model', () => {
    const source = readFileSync(join(__dirname, '..', 'ats-check.ts'), 'utf8')
    expect(source).not.toMatch(/supabase/i)
    expect(source).not.toMatch(/\.from\(['"`]/)
    // Deterministic by construction: no provider, no fetch, no key.
    expect(source).not.toMatch(/readResumeWithModel|GROQ|GEMINI|fetch\(/)
  })

  it('is deterministic — the same input gives the same report', () => {
    const a = checkResume(CLEAN)
    const b = checkResume(CLEAN)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('the role comparison', () => {
  const PM_RESUME = `Priya Iyer
Bengaluru, Karnataka, India

Product Manager at Paytm
Mar 2021 - Present
Owned the merchant payments roadmap and worked cross functional with engineering.
Built platform strategy for the technical teams.

SKILLS
SQL, Roadmapping, Experimentation

EDUCATION
B.Tech, VIT Vellore, 2019`

  it('is absent when no role was chosen', () => {
    expect(checkResume(PM_RESUME).role).toBeUndefined()
  })

  it('is absent for a role we have no measured terms for', () => {
    expect(checkResume(PM_RESUME, 'Astronaut').role).toBeUndefined()
  })

  it('splits the measured terms into present and missing', () => {
    const r = checkResume(PM_RESUME, 'Product Manager')!
    expect(r.role).toBeDefined()
    expect(r.role!.name).toBe('Product Manager')
    expect(r.role!.postings).toBeGreaterThan(0)
    // Every term is accounted for on exactly one side.
    const all = [...r.role!.present, ...r.role!.missing]
    expect(new Set(all).size).toBe(all.length)
    // This résumé genuinely says these.
    expect(r.role!.present).toEqual(expect.arrayContaining(['roadmap', 'platform', 'strategy']))
  })

  it('finds every present term actually in the text', () => {
    const r = checkResume(PM_RESUME, 'Product Manager')!
    for (const t of r.role!.present) {
      expect(PM_RESUME.toLowerCase()).toContain(t)
    }
    for (const t of r.role!.missing) {
      expect(PM_RESUME.toLowerCase()).not.toContain(t)
    }
  })

  it('scores the vocabulary finding LOW, never as a parse failure', () => {
    // A résumé is not broken for wording things differently, and an ATS keyword
    // match is a ranking signal rather than a parse error. Overstating it turns
    // a deterministic checker into an advice column.
    const bare = `Anil Kumar
Bengaluru, India

Manager at Acme
Jan 2020 - Present
Did assorted things for the group and reported upward on the numbers.

EDUCATION
B.Com, 2018`
    const r = checkResume(bare, 'Product Manager')!
    const vocab = r.findings.find((x) => x.id === 'role-vocabulary')
    if (vocab) {
      expect(vocab.severity).toBe('low')
      expect(vocab.area).toBe('keywords')
      // It must name how many postings it measured, not assert best practice.
      expect(vocab.detail).toMatch(/postings we index/i)
    }
  })

  it('still reaches no database with a role selected', () => {
    const src = readFileSync(join(__dirname, '..', 'ats-check.ts'), 'utf8')
    expect(src).not.toMatch(/supabase/i)
  })
})

/**
 * The categories added on 2026-09-08, and the six rules that came with them.
 *
 * Written defect-first like everything above: each fixture carries exactly the
 * fault its test names, and the last test in this block is the one that keeps
 * the group scores honest.
 */
describe('report categories', () => {
  it('places every finding it raises in a registered category', () => {
    // A document with as many faults as one file can hold, so the assertion
    // runs over the widest set of ids the checker can produce in one pass.
    const broken = `RESUME
Responsible for the payments team
Worked on the onboarding flow
Involved in reporting

Education
B.Tech VIT 2019

Experience
Analyst    Zeta    03/2021 - Present
Analyst at Paytm Jan 2020 - Present
skills: sql, sql, sql, sql, sql, sql, python, python, python, excel, excel`
    const r = checkResume(broken)
    expect(r.findings.length).toBeGreaterThan(2)
    for (const f of r.findings) {
      expect(categoryOf(f.id), `${f.id} is missing from RULES`).not.toBeNull()
      expect(f.category).toBe(categoryOf(f.id))
    }
  })

  it('never reports passing more rules than it ran', () => {
    const r = checkResume(CLEAN)
    for (const c of r.categories) {
      expect(c.passed).toBeGreaterThanOrEqual(0)
      expect(c.passed).toBeLessThanOrEqual(c.total)
      expect(c.score).toBeLessThanOrEqual(100)
    }
  })

  it('omits the tailoring group entirely when no role was chosen', () => {
    const without = checkResume(CLEAN).categories.map((c) => c.key)
    expect(without).not.toContain('tailoring')
    // Showing it at 100/100 because no rule ran would be the flattering lie.
    const withRole = checkResume(CLEAN, 'Product Manager').categories.map((c) => c.key)
    expect(withRole).toContain('tailoring')
  })
})

describe('the six ATS-essentials and content rules', () => {
  it('flags two date formats in one document', () => {
    const mixed = `${CLEAN}\n\nConsulting\nAdvisor at Razorpay\n03/2018 - 06/2019\nAdvised on pricing.`
    expect(ids(mixed)).toContain('date-format-mixed')
    expect(ids(CLEAN)).not.toContain('date-format-mixed')
  })

  it('flags a résumé with no findable link, and passes one that has it', () => {
    expect(ids(CLEAN.replace('| linkedin.com/in/priyaiyer', ''))).toContain('no-links')
    expect(ids(CLEAN)).not.toContain('no-links')
  })

  it('flags a résumé too short to rank on', () => {
    const short = `Ravi Kumar
ravi@example.com | +91 90000 00000 | linkedin.com/in/ravi

Experience
Analyst at Zeta
Jan 2023 - Present
Built the reporting for 30 clients.

Skills
SQL, Excel

Education
B.Com, Christ University, 2022`
    expect(ids(short)).toContain('resume-length')
  })

  it('flags education printed above experience — but only for someone who has worked', () => {
    const eduFirst = `Ravi Kumar
ravi@example.com | linkedin.com/in/ravi

Education
B.Tech, VIT Vellore, 2019

Experience
Product Analyst — Zeta
Jan 2023 - Present
• Built the retention report used by 200 merchants`
    expect(ids(eduFirst)).toContain('section-order')

    const student = `Ravi Kumar
ravi@example.com | +91 90000 00000 | linkedin.com/in/ravi
Chennai, Tamil Nadu, India

Education
B.Tech, Computer Science, VIT Vellore, 2023

Skills
SQL, Python, Excel, Tableau, Statistics, Data Modelling`
    // No employment history, so leading with education is correct, not a defect.
    expect(ids(student)).not.toContain('section-order')
  })

  it('flags experience lines that carry no figure at all', () => {
    const noNumbers = `Ravi Kumar
ravi@example.com | linkedin.com/in/ravi

Experience
Product Analyst — Zeta
Jan 2023 - Present
• Built the retention report for the growth team
• Ran the migration of the experiment framework
• Owned the weekly business review with the leadership team

Skills
SQL, Python

Education
B.Tech, VIT Vellore, 2019`
    expect(ids(noNumbers)).toContain('no-quantified-impact')
    // CLEAN carries real figures in its bullets, so it must not fire.
    expect(ids(CLEAN)).not.toContain('no-quantified-impact')
  })

  it('flags duty-shaped openers and over-long lines', () => {
    const weak = `Ravi Kumar
ravi@example.com | linkedin.com/in/ravi

Experience
Product Analyst — Zeta
Jan 2023 - Present
• Responsible for the weekly retention report covering 200 merchants
• Worked on the migration of the experiment framework across 3 teams
• ${'Owned an unusually long line that keeps going well past the point at which a parser might truncate it, describing 40 different responsibilities in one breath and burying the outcome at the very end where nothing can find it, which is the failure this rule exists to name. '.repeat(2)}

Skills
SQL

Education
B.Tech, VIT Vellore, 2019`
    const found = ids(weak)
    expect(found).toContain('weak-openers')
    expect(found).toContain('bullet-too-long')
  })

  it('still refuses to accuse the writer, on every new rule', () => {
    const accusatory = /\b(lie|lying|dishonest|inflated|exaggerat|misleading|fake|padding)\b/i
    for (const text of [CLEAN, CLEAN.replace('linkedin.com/in/priyaiyer', '')]) {
      for (const f of checkResume(text).findings) {
        expect(`${f.title} ${f.detail} ${f.fix}`).not.toMatch(accusatory)
      }
    }
  })
})

describe('a confident wrong answer, which is worse than no answer', () => {
  const MISREAD = `Rahul Menon
rahul.menon@example.com | +91 98450 11223 | linkedin.com/in/rahulmenon
Bengaluru, Karnataka

PROFESSIONAL SUMMARY
Backend engineer with 4 years building payment and ledger services in fintech.

WORK EXPERIENCE
Software Engineer II — Razorpay
Jul 2023 - Present | Bengaluru
• Cut p99 latency on the payouts API from 1400ms to 320ms by batching writes
• Migrated the ledger from MySQL to Postgres over 3 months

SKILLS
Java, Python, SQL, AWS, Docker, Kubernetes, Postgres

EDUCATION
B.E. Computer Science, PES University, 2021`

  it('reads the title correctly, so there is no misread left to flag', () => {
    /**
     * ⚠️ THIS TEST USED TO ASSERT `title-misread` AND NOW ASSERTS ITS ABSENCE,
     * because the defect was fixed at the source rather than reported better.
     * `extractFields` returns "Jul 2023 - Present" as the title here — that is
     * still true and still the reason the rule exists. But `parseSections` reads
     * the same line as "Software Engineer II" at "Razorpay", and since
     * 2026-09-12 the checker prefers the structured read wherever it produced
     * BOTH halves. There is no longer a wrong title on screen to explain.
     *
     * The rule is not dead — it still guards the uncorroborated case below.
     */
    const r = checkResume(MISREAD)
    expect(r.read.currentTitle).toBe('Software Engineer II')
    expect(r.read.employer).toBe('Razorpay')
    expect(r.findings.map((x) => x.id)).not.toContain('title-misread')
  })

  it('still flags a date-as-title where the structure gives no second opinion', () => {
    /**
     * The case the rule is for: a role line carrying no separator, so
     * parseSections cannot produce a title AND an employer, and the regex
     * reader's date-shaped answer is the only one available. A confident wrong
     * answer is invisible to the candidate, because their screen shows a title.
     */
    const noSeparator = MISREAD.replace('Software Engineer II — Razorpay', 'Razorpay')
    const r = checkResume(noSeparator)
    const misread = r.findings.find((x) => x.id === 'title-misread')
    const unreadable = r.findings.find((x) => x.id === 'title-unreadable')
    expect(misread ?? unreadable).toBeDefined()
  })

  it('does not quote the contact line as a role line built from separators', () => {
    const sep = checkResume(MISREAD).findings.find((x) => x.id === 'separator-header')
    // Either it does not fire, or it quotes something that is not contact data.
    if (sep) expect(sep.evidence ?? '').not.toMatch(/@|linkedin\.com/)
  })

  it('leaves a clean résumé alone', () => {
    expect(ids(CLEAN)).not.toContain('title-misread')
  })
})

/**
 * The market column — the differentiator, and therefore the part most worth
 * pinning. Its whole value is that every number is measured, so a test that
 * only checked shape would miss the one way it can go wrong: a percentage that
 * does not correspond to the postings it claims to summarise.
 */
describe('market coverage', () => {
  it('ranks a role’s terms by how many postings actually use them', () => {
    const cov = marketCoverage('Backend Engineer', 'I write Java and run Postgres.')
    expect(cov.length).toBeGreaterThan(4)
    // Sorted, so the most common missing term is the first thing to fix.
    for (let i = 1; i < cov.length; i++) expect(cov[i - 1].pct).toBeGreaterThanOrEqual(cov[i].pct)
    for (const c of cov) {
      expect(c.pct).toBeGreaterThan(0)
      expect(c.pct).toBeLessThanOrEqual(100)
    }
  })

  it('marks what the résumé already has, so we never tell someone to add a word they wrote', () => {
    const cov = marketCoverage('Backend Engineer', 'Backend engineer building distributed systems.')
    const backend = cov.find((c) => c.term === 'backend')
    expect(backend?.present).toBe(true)
  })

  it('returns nothing for a role we hold no postings for, rather than guessing', () => {
    expect(marketCoverage('Sanskrit Calligrapher', 'anything')).toEqual([])
  })

  it('splits a posting into market-standard and employer-specific vocabulary', () => {
    const jd = `We are hiring a Backend Engineer to work on distributed systems and platform
      services. You will use Kafka extensively; Kafka experience is required. Our Kafka
      pipelines process billions of events. Strong software engineering fundamentals.`
    const { standard, specific } = jdVersusMarket('Backend Engineer', jd)

    // "platform"/"engineering" are common to the role — worth writing in for good.
    expect(standard.map((s) => s.term)).toContain('platform')
    expect(standard.every((s) => s.pct > 0)).toBe(true)
    // "Kafka" is this employer's own emphasis, not the role's.
    expect(specific).toContain('Kafka')
  })
})

/**
 * The second tier — "what a recruiter will think" rather than "what a machine
 * can read". Added 2026-09-09 to close the gap against the category leader's
 * content and tailoring categories, deterministically, so the page's claim that
 * no model decides the score survives.
 */
describe('content, second tier', () => {
  it('flags a misspelling a spellchecker autocorrects around, and names the correction', () => {
    const typo = CLEAN.replace('Owned the merchant payments funnel', 'Owned the merchant payments funnel and managment of it')
    const f = checkResume(typo).findings.find((x) => x.id === 'spelling-common')
    expect(f).toBeDefined()
    expect(f!.detail).toContain('management')
  })

  it('flags a word typed twice, which every spellchecker passes', () => {
    const doubled = CLEAN.replace('Owned the merchant', 'Owned the the merchant')
    const f = checkResume(doubled).findings.find((x) => x.id === 'doubled-word')
    expect(f).toBeDefined()
    expect(f!.evidence).toMatch(/the the/i)
  })

  it('flags claims a reader cannot check, without calling the writer anything', () => {
    const fluff = CLEAN.replace(
      'Product manager with six years',
      'Hard working team player and results-driven product manager with six years',
    )
    const f = checkResume(fluff).findings.find((x) => x.id === 'unevidenced-claims')
    expect(f).toBeDefined()
    expect(`${f!.title} ${f!.detail} ${f!.fix}`).not.toMatch(/lazy|padding|dishonest|exaggerat/i)
  })

  it('measures how many lines open with an action, separately from weak openers', () => {
    const passive = `Ravi Kumar
ravi@example.com | +91 90000 00000 | linkedin.com/in/ravi

Experience
Product Analyst at Zeta
Jan 2023 - Present
• The retention report was rebuilt for 200 merchants over two quarters
• Weekly business reviews with leadership covering 12 product lines
• Responsibility for the experiment framework across 3 teams

Skills
SQL, Python, Looker, dbt, Experimentation, Statistics

Education
B.Tech, VIT Vellore, 2019`
    expect(ids(passive)).toContain('action-verb-coverage')
    // CLEAN's lines open with Owned / Ran / Wrote / Rebuilt / Shipped / Built.
    expect(ids(CLEAN)).not.toContain('action-verb-coverage')
  })

  it('flags mixed bullet punctuation, and leaves a consistent list alone', () => {
    const mixed = CLEAN.replace(
      'Ran the quarterly roadmap process for a group of 4 engineers and 2 designers.',
      'Ran the quarterly roadmap process for a group of 4 engineers and 2 designers',
    )
    expect(ids(mixed)).toContain('bullet-punctuation')
  })

  it('flags a résumé that never names the role it is aimed at', () => {
    // CLEAN is a product manager's; targeting Backend Engineer should say so.
    expect(ids2(CLEAN, 'Backend Engineer')).toContain('title-not-targeted')
    // And must not fire when the headline already names the target.
    const targeted = CLEAN.replace('Priya Iyer', 'Priya Iyer\nBackend Engineer')
    expect(ids2(targeted, 'Backend Engineer')).not.toContain('title-not-targeted')
  })

  it('keeps every new rule registered, so the denominators stay true', () => {
    for (const id of [
      'spelling-common', 'doubled-word', 'bullet-punctuation', 'unevidenced-claims',
      'action-verb-coverage', 'title-not-targeted',
    ]) {
      expect(categoryOf(id), `${id} missing from RULES`).not.toBeNull()
    }
  })
})

/**
 * Recruiter red flags, bias and seniority — the nine checks this file once said
 * it would never have.
 *
 * ⚠️ THE VOICE TEST AT THE END OF THIS BLOCK IS THE IMPORTANT ONE. These
 * findings touch employment gaps, age and whether somebody has been promoted.
 * Getting the tone wrong here is not annoying, it is cruel, and it is the one
 * class of defect no amount of correctness makes up for.
 */
describe('the recruiter, bias and seniority checks', () => {
  const GAPPED = `Ravi Kumar
ravi@example.com | +91 90000 00000 | linkedin.com/in/ravi

Summary
Backend engineer with seven years across payments and logistics platforms,
working on services that move money and freight at national scale.

Experience

Senior Engineer at Razorpay
Jan 2024 - Present
• Owned the settlement service that moves money to 60,000 merchant accounts
• Migrated the ledger from MySQL to Postgres with zero downtime over 3 months

Engineer at Delhivery
Jan 2019 - Mar 2022
• Built the routing service that assigned 40,000 shipments a day
• Cut dispatch latency from 900ms to 200ms across 12 hubs

Skills
Java, Python, SQL, Kubernetes, Terraform, Kafka, Cassandra, GraphQL

Education
B.Tech, Computer Science, VIT Vellore, 1998`

  it('flags a gap between two dated roles, in months it can show its working for', () => {
    const f = checkResume(GAPPED).findings.find((x) => x.id === 'employment-gap')
    expect(f).toBeDefined()
    // Mar 2022 → Jan 2024 is 22 months.
    expect(f!.title).toMatch(/1 year|22 months/)
  })

  it('flags skills that appear only in the skills list', () => {
    const f = checkResume(GAPPED).findings.find((x) => x.id === 'skills-not-evidenced')
    expect(f).toBeDefined()
    // Kafka, Cassandra, GraphQL, Terraform are listed and never used again.
    expect(f!.detail).toMatch(/Kafka|Cassandra|GraphQL/)
    // Java is in neither bullet either, but Postgres IS — so it must not be named.
    expect(f!.detail).not.toMatch(/Postgres/)
  })

  it('names an age signal as information, and never tells anyone to hide it', () => {
    const f = checkResume(GAPPED).findings.find((x) => x.id === 'age-signal')
    expect(f).toBeDefined()
    expect(f!.evidence).toBe('1998')
    expect(f!.fix).toMatch(/your.*decide|Keep it if you would rather|this is information/i)
  })

  it('benchmarks against postings, and says so', () => {
    // Backend Engineer's measured median is well above two years.
    const junior = GAPPED.replace('seven years', 'two years')
      .replace('Jan 2019 - Mar 2022', 'Jan 2023 - Mar 2023')
    const f = checkResume(junior, 'Backend Engineer').findings.find((x) => x.id === 'seniority-benchmark')
    if (f) {
      expect(f.detail).toMatch(/postings we index/)
      expect(f.fix).toMatch(/Nothing on your résumé needs to change|right band/)
    }
  })

  it('registers every id it can raise, so the category denominators stay true', () => {
    for (const id of [
      'employment-gap', 'short-tenure', 'skills-not-evidenced',
      'age-signal', 'dated-experience',
      'career-progression', 'leadership-evidence', 'seniority-benchmark',
    ]) {
      expect(categoryOf(id), `${id} missing from RULES`).not.toBeNull()
    }
  })

  it('⚠️ never judges the person, on any finding in these three categories', () => {
    /**
     * The words that would turn a measurement into an accusation. A gap is not
     * "unexplained absence"; a short role is not "job hopping"; an age signal is
     * never "outdated". If a future rule reaches for one of these, this fails.
     */
    const judgement =
      /\b(job.?hop|unstable|unreliable|outdated|too old|overqualified|red flag|concerning|worrying|suspicious|lazy|excuse|failure|weak candidate)\b/i

    for (const text of [GAPPED, CLEAN, GAPPED.replace('Jan 2024', 'Jan 2020')]) {
      for (const f of checkResume(text, 'Backend Engineer').findings) {
        const category = categoryOf(f.id)
        if (category !== 'red_flags' && category !== 'bias' && category !== 'seniority') continue
        expect(`${f.title} ${f.detail} ${f.fix}`, f.id).not.toMatch(judgement)
      }
    }
  })
})

/**
 * The before/after comparison on /tools/ats-checker.
 *
 * ⚠️ THE TWO SCORES MUST BE MEASURED BY THE SAME RULES, WITH ONE NAMED
 * EXCEPTION. The baseline (actions/ats-check.ts) passes targetRole, layout and
 * jdText. The projected score after a rewrite (actions/optimise-resume.ts)
 * passed only targetRole until 2026-09-15, so `jd-missing-standard` could never
 * be raised against a rewrite and the "after" number came from a check that
 * skipped a rule the "before" was measured with.
 *
 * `layout` stays out on purpose and is NOT the same bug — the rewrite replaces
 * a two-column upload with a single-column document, so charging it the
 * geometry penalty of the file it replaced would understate a real gain.
 */
describe('the before/after comparison is measured by the same rules', () => {
  const RESUME = `Priya Iyer
priya.iyer@example.com | +91 98765 43210 | linkedin.com/in/priyaiyer
Bengaluru, India

Summary
Analyst with five years in payments operations.

Experience

Operations Analyst at Razorpay
Mar 2021 - Present
Owned the merchant onboarding queue end to end across activation and review.
Ran weekly reporting that cut manual effort by 14%.

Skills
Excel, SQL

Education
B.Tech, VIT Vellore, 2017`

  const JD = `Backend Engineer. You will lead software development across our
platform, designing cloud services and writing production code. Strong
engineering and technical systems background required.`

  it('raises jd-missing-standard only when the posting is passed', () => {
    const ids = (jd?: string) =>
      checkResume(RESUME, 'Backend Engineer', undefined, jd).findings.map((f) => f.id)
    expect(ids(JD)).toContain('jd-missing-standard')
    expect(ids()).not.toContain('jd-missing-standard')
  })

  it('scores lower with the posting than without it, for the same document', () => {
    // Small — measured at one point — but it must not be ZERO, or the two
    // surfaces could diverge again without any test noticing.
    const withJd = checkResume(RESUME, 'Backend Engineer', undefined, JD).readability.score
    const without = checkResume(RESUME, 'Backend Engineer').readability.score
    expect(withJd).toBeLessThan(without)
  })

  it('a rewrite that changes nothing does not move the score', () => {
    // The property the whole before/after headline rests on. Same text, same
    // role, same posting, run twice — the projected path must reproduce the
    // baseline exactly rather than approximately.
    const before = checkResume(RESUME, 'Backend Engineer', undefined, JD)
    const after = checkResume(RESUME, 'Backend Engineer', undefined, JD)
    expect(after.readability.score).toBe(before.readability.score)
    expect(after.findings.map((f) => f.id).sort()).toEqual(before.findings.map((f) => f.id).sort())
  })

  it('does not charge a rewrite for the uploaded file\'s column geometry', () => {
    // Deliberate asymmetry, pinned so nobody "fixes" it into symmetry.
    const twoColumn = checkResume(RESUME, 'Backend Engineer', { columns: 2, lines: 40, pages: 1 } as never, JD)
    const rebuilt = checkResume(RESUME, 'Backend Engineer', undefined, JD)
    expect(twoColumn.readability.score).toBeLessThan(rebuilt.readability.score)
    expect(twoColumn.findings.map((f) => f.id)).toContain('multi-column')
    expect(rebuilt.findings.map((f) => f.id)).not.toContain('multi-column')
  })
})
