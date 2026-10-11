import { describe, it, expect } from 'vitest'
import { parseSections, sectionsToText } from '../sections'
import { checkResume } from '@/lib/ats-check'

/**
 * Fixtures are defect-first, like src/lib/__tests__/ats-check.test.ts.
 *
 * The interesting cases are not the tidy résumé — they are the shapes that
 * look fine on screen and collapse when a machine reads them, because those are
 * exactly the documents this parser exists to be honest about.
 */

const CLEAN = `Akshay Keerthi
akshay@example.com | +91 98765 43210 | linkedin.com/in/akshay

PROFESSIONAL SUMMARY
Product analyst with three years building reporting for fintech teams.

WORK EXPERIENCE
Product Analyst — Zeta | Bengaluru
Jan 2023 – Present
• Built the weekly retention report used by the growth team
• Ran the experiment framework migration

Business Analyst — Infosys
Jun 2021 – Dec 2022
• Wrote SQL models for a banking client

SKILLS
Languages: SQL, Python
Tools: Looker, dbt

EDUCATION
B.Tech Computer Science | VIT Vellore | 2021
`

describe('parseSections — a well-formed résumé', () => {
  const s = parseSections(CLEAN)

  it('reads the contact block without a name dictionary', () => {
    expect(s.contact.name).toBe('Akshay Keerthi')
    expect(s.contact.email).toBe('akshay@example.com')
    expect(s.contact.phone).toBeTruthy()
    expect(s.contact.links[0]).toContain('linkedin.com')
  })

  it('keeps each job’s bullets under that job', () => {
    expect(s.experience).toHaveLength(2)
    expect(s.experience[0].title).toBe('Product Analyst')
    expect(s.experience[0].employer).toBe('Zeta')
    expect(s.experience[0].dates).toMatch(/Jan 2023/i)
    expect(s.experience[0].bullets).toHaveLength(2)
    expect(s.experience[1].employer).toBe('Infosys')
    expect(s.experience[1].bullets).toHaveLength(1)
  })

  it('splits skills off their labels', () => {
    expect(s.skills).toContain('SQL')
    expect(s.skills).toContain('Python')
    expect(s.skills).toContain('Looker')
    expect(s.skills).not.toContain('Languages')
  })

  it('reads education', () => {
    expect(s.education[0].qualification).toContain('B.Tech')
    expect(s.education[0].institution).toBe('VIT Vellore')
    expect(s.education[0].dates).toBe('2021')
  })

  it('records heading order for the section-order check', () => {
    expect(s.order).toEqual(['summary', 'experience', 'skills', 'education'])
  })

  it('places almost everything', () => {
    expect(s.unplaced).toBeLessThanOrEqual(1)
  })
})

describe('parseSections — the shapes that fail', () => {
  it('counts every line as unplaced when the headings are not text', () => {
    // What a résumé whose headings are images or a coloured sidebar extracts as.
    const noHeadings = `Akshay Keerthi
akshay@example.com
Built the weekly retention report used by the growth team
Ran the experiment framework migration
SQL, Python, Looker`
    const s = parseSections(noHeadings)
    expect(s.experience).toHaveLength(0)
    expect(s.unplaced).toBeGreaterThan(3)
  })

  it('never attaches orphan bullets to the job above them', () => {
    const orphan = `EXPERIENCE
• A bullet with no employer above it
• Another one

Product Analyst — Zeta
Jan 2023 – Present
• A bullet that does have one`
    const s = parseSections(orphan)
    expect(s.experience).toHaveLength(1)
    expect(s.experience[0].employer).toBe('Zeta')
    expect(s.experience[0].bullets).toHaveLength(1)
    // The two orphans are reported, not silently merged into Zeta.
    expect(s.unplaced).toBe(2)
  })

  it('treats an employer on its own line as part of the same job', () => {
    const twoLine = `EXPERIENCE
Senior Product Analyst
Zeta | Jan 2023 – Present
• Built the retention report`
    const s = parseSections(twoLine)
    expect(s.experience).toHaveLength(1)
    expect(s.experience[0].title).toBe('Senior Product Analyst')
    expect(s.experience[0].bullets).toHaveLength(1)
  })

  it('keeps unglyphed prose under the job it sits below', () => {
    const prose = `EXPERIENCE
Product Analyst — Zeta | Jan 2023 – Present
Owned the reporting stack end to end and ran the migration.`
    const s = parseSections(prose)
    expect(s.experience[0].bullets).toHaveLength(1)
    expect(s.unplaced).toBe(0)
  })

  it('does not read a sentence containing "experience" as a heading', () => {
    const sentence = `PROFILE
I have five years of experience in analytics.

EXPERIENCE
Analyst — Zeta | 2023 – Present
• Did the work`
    const s = parseSections(sentence)
    expect(s.order).toEqual(['summary', 'experience'])
    expect(s.summary).toContain('five years')
  })

  it('returns empty structure rather than throwing on junk', () => {
    expect(() => parseSections('')).not.toThrow()
    expect(parseSections('').experience).toEqual([])
  })
})

describe('sectionsToText', () => {
  it('round-trips through the parser without losing a job', () => {
    const once = parseSections(CLEAN)
    const twice = parseSections(sectionsToText(once))
    expect(twice.experience).toHaveLength(once.experience.length)
    expect(twice.experience[0].employer).toBe('Zeta')
    expect(twice.skills).toContain('SQL')
  })
})

/**
 * ⚠️ THE INVARIANT THAT MATTERS MOST IN THIS FILE.
 *
 * The rewritten résumé is rebuilt by sectionsToText() and then re-scored by the
 * same checker the original went through. If our output format raises findings
 * the input did not, the product hands someone a WORSE score under a button
 * marked "improve my score" — which is exactly what happened on 2026-09-08,
 * measured at 79 → 70 against a real résumé, before the format was changed.
 *
 * This test is the guard on that. It is deliberately about NEW findings rather
 * than about the score: a rewrite legitimately changes wording, and the score
 * may move for reasons that belong to the content. What must never happen is a
 * finding caused by the way WE write the document out.
 */
describe('the document we generate must pass the check we sell', () => {
  it('introduces no parsing finding the original did not have', () => {
    const before = checkResume(CLEAN)
    const after = checkResume(sectionsToText(parseSections(CLEAN)))
    const had = new Set(before.findings.map((f) => f.id))
    const introduced = after.findings.map((f) => f.id).filter((id) => !had.has(id))
    expect(introduced).toEqual([])
  })

  it('does not turn a long skills list into a keyword dump', () => {
    /**
     * ⚠️ THE GUARD ABOVE MISSED THIS BECAUSE ITS FIXTURE IS TOO SMALL. CLEAN
     * lists eight skills; `keyword-dump` fires at more than fifteen
     * comma-separated items on ONE line. A real résumé listing 29 skills across
     * several lines passes, and joining them into a single line — which is what
     * sectionsToText used to do — fails. Measured live: 94 → 88 the moment a
     * fix was applied, under a button that promises to improve the score.
     */
    const many = Array.from({ length: 29 }, (_, i) => `Skill${i}`).join(', ')
    const input = CLEAN.replace(
      /Skills\n[^\n]+/,
      `Skills\n${many}`,
    )
    const before = checkResume(input).findings.map((f) => f.id)
    const after = checkResume(sectionsToText(parseSections(input))).findings.map((f) => f.id)
    expect(before).not.toContain('keyword-dump')
    expect(after).not.toContain('keyword-dump')
  })

  it('writes projects back under their own heading', () => {
    /**
     * ⚠️ `isProject` HAS TO SURVIVE THE ROUND TRIP OR A FIXED FINDING RETURNS.
     * It is what stops `overlapping-present` counting side projects as
     * concurrent jobs. Writing everything under EXPERIENCE erased it, so
     * re-parsing our own output reported an ambiguity the candidate's document
     * did not contain — and only after they accepted a fix.
     */
    const withProjects =
      CLEAN +
      `\n\nProjects\n\nFleetSense at Personal\n2026 - Present\nBuilt a fleet management platform in TypeScript end to end over six months.\n\nWebCraft at Personal\n2026 - Present\nBuilt a website generation agent against a hosted model and a prompt library.`
    const parsed = parseSections(withProjects)
    expect(parsed.experience.filter((e) => e.isProject)).toHaveLength(2)

    const round = parseSections(sectionsToText(parsed))
    expect(round.experience.filter((e) => e.isProject)).toHaveLength(2)
    expect(checkResume(sectionsToText(parsed)).findings.map((f) => f.id)).not.toContain('overlapping-present')
  })

  it('keeps the title and employer readable through the round trip', () => {
    /**
     * ⚠️ THIS TEST HAS BEEN INVERTED, AND THE REASON IS A GOOD ONE. It used to
     * assert that `title-unreadable` and `employer-unreadable` FIRED on CLEAN —
     * whose role lines are built with an em dash that the old regex reader could
     * not parse — and were fixed by rebuilding the document. That was most of
     * the honest value in the rewrite feature.
     *
     * Since 2026-09-12 the checker prefers `parseSections`, which reads em-dash
     * role lines correctly, so neither finding fires on the input any more. The
     * rewrite did not get worse; the PARSER got better, and the repair it used
     * to perform is no longer needed for this class of document. What still has
     * to hold — and is the thing this file exists to guard — is that writing the
     * document back out does not LOSE what we could already read.
     */
    const before = checkResume(CLEAN)
    const after = checkResume(sectionsToText(parseSections(CLEAN)))

    expect(before.read.currentTitle).toBeTruthy()
    expect(after.read.currentTitle).toBe(before.read.currentTitle)
    expect(after.read.employer).toBe(before.read.employer)
    expect(after.findings.map((f) => f.id)).not.toContain('title-unreadable')
    expect(after.findings.map((f) => f.id)).not.toContain('employer-unreadable')

    /**
     * `separator-header` fired on this fixture's CONTACT line — "email | phone
     * | linkedin" — until the rule learned to skip contact data on 2026-09-08.
     * It is asserted here as well as in ats-check.test.ts because this is the
     * round trip a candidate actually sees: a rewrite that still carried a
     * finding pointing at their email address would look like the rewrite had
     * failed to fix anything.
     */
    const sep = checkResume(sectionsToText(parseSections(CLEAN))).findings.find(
      (f) => f.id === 'separator-header',
    )
    expect(sep).toBeUndefined()
  })

  it('writes no doubled separator into a role line', () => {
    const withLocation = `EXPERIENCE
Software Engineer II — Razorpay
Jul 2023 - Present | Bengaluru
• Cut p99 latency on the payouts API from 1400ms to 320ms`
    const out = sectionsToText(parseSections(withLocation))
    expect(out).not.toMatch(/\|\s*\|/)
    expect(out).toContain('Software Engineer II at Razorpay')
  })
})

describe('company-first headers', () => {
  const text = `Summary
Client-facing professional across private banking and HR operations, with six years of work in client retention.

Experience
ICICI Bank   Jun 2025 - Jul 2026
Private Banking Manager (Relationship Manager)   Bangalore, India
Managed 150+ CXO, HNI and UHNI relationships as primary relationship manager.
Amazon   Apr 2022 - Jan 2023
HR Associate   Hyderabad, India
Managed 300-400 complex employee-relations cases monthly for a global workforce.
Scaleup Mission   Apr 2024 - May 2024
HR Operations Intern   Remote
Ran full-cycle recruiting for 15+ roles across early-stage startups.`

  it('reads the job title as the title and the company as the employer', () => {
    const roles = parseSections(text).experience
    expect(roles.map((r) => [r.title, r.employer])).toEqual([
      ['Private Banking Manager (Relationship Manager)', 'ICICI Bank'],
      ['HR Associate', 'Amazon'],
      ['HR Operations Intern', 'Scaleup Mission'],
    ])
  })

  it('leaves a title-first header as it was', () => {
    const roles = parseSections('Experience\nProduct Manager at Paytm\nMar 2021 - Present\nOwned the merchant payments funnel end to end.').experience
    expect([roles[0].title, roles[0].employer]).toEqual(['Product Manager', 'Paytm'])
  })

  it('reads a bulleted title line, the way one real exported résumé has it', () => {
    const roles = parseSections(
      'Experience\nICICI Bank\nJun 2025 - Jul 2026\n• Private Banking Manager (Relationship Manager)\tBangalore, India\n• Managed 150+ CXO, HNI and UHNI relationships as primary relationship manager.\nMind Customs\n2026 - Present\n• Go-to-Market & Client Growth (Independent Engagement)\tBangalore, India\n• Own GTM and client growth for a niche automotive service business.',
    ).experience
    expect(roles.map((r) => [r.title, r.employer, r.bullets.length])).toEqual([
      ['Private Banking Manager (Relationship Manager)', 'ICICI Bank', 1],
      ['Go-to-Market & Client Growth (Independent Engagement)', 'Mind Customs', 1],
    ])
  })
})

describe('education — the school-first layout', () => {
  // A real shape (the founder's résumé): school and dates on one line, "Degree, Major" and the city on the next, tab-separated.
  const text = [
    'EDUCATION', '',
    'IIM Sambalpur (Indian Institute of Management)\t2023 - 2025',
    'MBA, General Management\tSambalpur, India',
    'Placement Committee member; coordinated placement outcomes for 16 cohort members.',
    '',
    'College of Engineering Muttathara\t2017 - 2021',
    'B.Tech, Mechanical Engineering\tKerala, India',
    '', 'SKILLS', '', 'Excel, Power BI',
  ].join('\n')

  it('reads each school and its degree as ONE entry, the right way round', () => {
    expect(parseSections(text).education).toEqual([
      { qualification: 'MBA, General Management', institution: 'IIM Sambalpur (Indian Institute of Management)', dates: '2023 - 2025' },
      { qualification: 'B.Tech, Mechanical Engineering', institution: 'College of Engineering Muttathara', dates: '2017 - 2021' },
    ])
  })

  it('leaves the degree-first and wrapped layouts as they were: one entry, degree first', () => {
    for (const t of ['EDUCATION\n\nB.Tech Computer Science, NIT Trichy, 2019\n', 'EDUCATION\n\nB.Tech Computer Science\nNIT Trichy, 2019\n']) {
      const [e, ...rest] = parseSections(t).education
      expect(rest).toEqual([])
      expect(e.qualification).toBe('B.Tech Computer Science')
      expect(e.institution).toContain('NIT Trichy')
      expect(e.dates).toBe('2019')
    }
  })
})
