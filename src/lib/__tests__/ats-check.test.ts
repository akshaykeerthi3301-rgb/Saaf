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

describe('a clean résumé', () => {
  it('raises no high-severity finding', () => {
    const r = checkResume(CLEAN)
    expect(r.findings.filter((f) => f.severity === 'high')).toEqual([])
  })

  it('scores well and shows the arithmetic', () => {
    const r = checkResume(CLEAN)
    expect(r.readability.score).toBeGreaterThanOrEqual(90)
    const total = r.readability.deductions.reduce((s, d) => s + d.points, 0)
    expect(r.readability.score).toBe(100 - total)
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
    expect(r.readability.score).toBe(
      Math.max(0, 100 - r.readability.deductions.reduce((s, d) => s + d.points, 0))
    )
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

  it('flags a title the parser read as a date', () => {
    // Measured live: extractFields returns "Jul 2023 - Present" here. Before
    // this rule, nothing fired and the report showed the wrong title with no
    // explanation beside it.
    const r = checkResume(MISREAD)
    const finding = r.findings.find((x) => x.id === 'title-misread')
    expect(finding).toBeDefined()
    expect(finding!.evidence).toMatch(/2023|Present/i)
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
