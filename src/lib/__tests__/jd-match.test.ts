import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matchJdToResume, JdMatchError } from '../jd-match'
import { extractFields } from '../parse/extract'
import { pdfToText } from '../parse/pdf'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'

/**
 * TASK-060 step 1 — the pasted-JD pipeline, proved offline before any UI.
 *
 * Every test here runs with NO provider key, which is the deployed default for
 * this surface and the path most candidates will hit. If the deterministic half
 * cannot carry a usable score on its own, the tool is a model wrapper with a
 * fallback rather than a product with an optional enrichment.
 */

// A real posting's shape: title line, prose, a stated experience bar with a
// qualifier, a credential that is explicitly optional, and boilerplate.
const JD = `Senior Product Manager

Razorpay is hiring a Senior Product Manager for our payments platform team.

About the role:
You will own the merchant onboarding experience end to end, working with
engineering, design and risk to ship changes that move activation.

Requirements:
- 5+ years of product management experience, ideally in fintech or payments
- Strong SQL and data analysis skills; comfortable writing your own queries
- Experience with A/B testing and experimentation frameworks
- An MBA is a plus but not required

We are an equal opportunity employer and value diversity at our company.`

const RESUME = `Priya Iyer
Bengaluru, Karnataka, India
priya.iyer@example.com | +91 98765 43210

Product Manager at Paytm
Mar 2021 - Present

Owned the merchant payments funnel. Ran A/B tests on onboarding.
Wrote SQL against the warehouse for weekly activation reporting.

Associate Product Manager at Zeta
Jul 2019 - Feb 2021

Skills: SQL, Product Roadmapping, A/B Testing, Figma, Amplitude

Education
B.Tech, Computer Science, VIT Vellore, 2019`

/** Criterion 2: the deployed default for this public surface is no key. */
beforeEach(() => {
  delete process.env.GROQ_API_KEY
  delete process.env.GEMINI_API_KEY
})
afterEach(() => {
  delete process.env.GROQ_API_KEY
  delete process.env.GEMINI_API_KEY
})

describe('criterion 1 — a real JD and résumé produce the /today breakdown', () => {
  it('returns the five always-applicable components in the /today shape', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME, jdLocation: 'Bengaluru, India' })

    const keys = r.breakdown.components.map((c) => c.key).filter((k) => k !== 'cap')
    // Five always apply. `skills` does NOT: the deterministic parser cannot read
    // a skills list — only the model can — so with no key scoreRole() drops the
    // component and normalises over what remains. That is deliberate (the
    // candidate is not penalised for a component that never had a chance), and
    // it is why the module warns when the row is missing.
    expect(keys).toEqual(expect.arrayContaining(['title', 'seniority', 'location', 'credential']))
    expect(keys).not.toContain('skills')
    // Omitted on this surface: nobody sets a work-mode preference when pasting
    // a JD, and workModeFit() awards full marks for an absent one.
    expect(keys).not.toContain('work_mode')
    expect(r.breakdown.total).toBeGreaterThan(0)
    expect(r.breakdown.total).toBeLessThanOrEqual(100)
  })

  it('says why the skills row is absent rather than dropping it silently', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    expect(r.warnings.some((w) => /skills are left out/i.test(w))).toBe(true)
  })

  it('reads the stated experience bar out of the posting', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    const years = r.requirements.find((q) => q.kind === 'experience_years')
    expect(years?.minYears).toBe(5)
  })

  it('does not gate on a credential the posting calls optional', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    // "An MBA is a plus but not required" must never reach the scorer as a hard
    // requirement — that is the false-refusal case src/gates/extract.ts exists
    // to prevent, and this surface must inherit it rather than re-earn it.
    const hardCredential = r.requirements.filter(
      (q) => q.kind === 'credential' && q.confidence >= CONFIDENCE_THRESHOLD
    )
    expect(hardCredential).toHaveLength(0)
  })

  it('carries a one-line reason from the same summariser the shortlist uses', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    expect(r.reason.length).toBeGreaterThan(0)
  })

  it('reads the candidate out of the résumé', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    expect(r.profile.city).toBe('Bengaluru')
    expect(r.profile.currentTitle).toBe('Product Manager')
    expect(r.profile.yearsExperience).toBeGreaterThan(0)
  })
})

describe('criterion 2 — degrades to the deterministic parser with no key', () => {
  it('scores with no provider configured and reports provider: null', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    expect(r.provider).toBeNull()
    expect(r.breakdown.total).toBeGreaterThan(0)
  })

  it('never throws for a missing key, only for unreadably short input', async () => {
    await expect(matchJdToResume({ jdText: 'PM role', resumeText: RESUME })).rejects.toBeInstanceOf(
      JdMatchError
    )
    await expect(matchJdToResume({ jdText: JD, resumeText: 'Priya' })).rejects.toBeInstanceOf(
      JdMatchError
    )
  })
})

describe('criterion 3 — no database dependency', () => {
  const source = readFileSync(join(__dirname, '..', 'jd-match.ts'), 'utf8')

  it('imports nothing from lib/supabase and never queries', () => {
    expect(source).not.toMatch(/supabase/i)
    expect(source).not.toMatch(/\.from\(['"`]/)
  })

  it('runs with no Supabase environment at all', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    try {
      const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
      expect(r.breakdown.total).toBeGreaterThan(0)
    } finally {
      if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url
      if (anon) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anon
    }
  })
})

describe('criterion 5 — every requirement shows its working', () => {
  it('attaches the source sentence to each extracted requirement', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME, jdLocation: 'Bengaluru, India' })
    expect(r.requirements.length).toBeGreaterThan(0)
    for (const q of r.requirements) {
      expect(typeof q.sourceQuote).toBe('string')
      expect(q.sourceQuote.length).toBeGreaterThan(0)
      expect(q.confidence).toBeGreaterThanOrEqual(0)
      expect(q.confidence).toBeLessThanOrEqual(1)
    }
  })

  it('quotes text that is actually in the posting', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    const years = r.requirements.find((q) => q.kind === 'experience_years')
    expect(JD.toLowerCase()).toContain(years!.sourceQuote.toLowerCase().slice(0, 20))
  })
})

describe('honesty guards', () => {
  it('omits work mode rather than awarding 7 free points to everyone', async () => {
    const strong = await matchJdToResume({ jdText: JD, resumeText: RESUME, jdLocation: 'Bengaluru, India' })
    const weak = await matchJdToResume({
      jdText: JD,
      jdLocation: 'Bengaluru, India',
      resumeText: `Arjun Rao\nKochi, Kerala, India\nJunior Accountant at a local firm\nJun 2025 - Present\nMaintained ledgers and assisted with the monthly closing entries each period.`,
    })
    for (const r of [strong, weak]) {
      expect(r.breakdown.components.map((c) => c.key)).not.toContain('work_mode')
    }
    // And the surface still discriminates — omitting a constant must not
    // flatten the range it was inflating.
    expect(strong.breakdown.total).toBeGreaterThan(weak.breakdown.total)
  })

  it('scores title against the candidate\'s background, not against the pasted JD', async () => {
    // The regression this pins: defaulting preferredRole to the JD's OWN title
    // would score titleAffinity full marks for every paste, inflating this
    // surface against the identical role on /today.
    //
    // A résumé whose title genuinely differs is what exposes it — "Product
    // Manager" against "Senior Product Manager" legitimately scores full marks,
    // so it cannot tell the two behaviours apart.
    const mismatched = RESUME.replace(/Product Manager at Paytm/, 'Business Analyst at Paytm')
      .replace(/Associate Product Manager at Zeta/, 'Business Analyst at Zeta')

    const r = await matchJdToResume({ jdText: JD, resumeText: mismatched })
    const title = r.breakdown.components.find((c) => c.key === 'title')!

    expect(r.profile.preferredRole).toBe('Business Analyst')
    expect(r.profile.preferredRole).not.toBe('Senior Product Manager')
    expect(title.points).toBeLessThan(title.max)

    // And laundering the JD's title in would visibly inflate it — which is
    // exactly what the default must not do.
    const inflated = await matchJdToResume({
      jdText: JD,
      resumeText: mismatched,
      preferredRole: 'Senior Product Manager',
    })
    const inflatedTitle = inflated.breakdown.components.find((c) => c.key === 'title')!
    expect(inflatedTitle.points).toBeGreaterThan(title.points)
  })

  it('warns rather than silently assuming when years cannot be read', async () => {
    const noDates = `Priya Iyer
Bengaluru, Karnataka, India
Product Manager at Paytm
Owned the merchant payments funnel and ran experiments on onboarding flows.
Skills: SQL, Product Roadmapping, A/B Testing, Figma, Amplitude`
    const r = await matchJdToResume({ jdText: JD, resumeText: noDates })
    expect(r.profile.yearsExperience).toBe(0)
    expect(r.warnings.some((w) => /years of experience/i.test(w))).toBe(true)
  })

  it('warns when it had to guess the role title', async () => {
    const r = await matchJdToResume({ jdText: JD, resumeText: RESUME })
    expect(r.warnings.some((w) => /role title/i.test(w))).toBe(true)
  })

  it('does not warn about the title when the caller supplied one', async () => {
    const r = await matchJdToResume({
      jdText: JD,
      resumeText: RESUME,
      jdTitle: 'Senior Product Manager',
    })
    expect(r.warnings.some((w) => /read the role title/i.test(w))).toBe(false)
  })

  it('an explicit yearsExperience overrides the résumé', async () => {
    const low = await matchJdToResume({ jdText: JD, resumeText: RESUME, yearsExperience: 1 })
    const high = await matchJdToResume({ jdText: JD, resumeText: RESUME, yearsExperience: 8 })
    expect(low.profile.yearsExperience).toBe(1)
    expect(high.profile.yearsExperience).toBe(8)
    // The 5-year bar is the decisive component; being under it must cost.
    expect(high.breakdown.total).toBeGreaterThan(low.breakdown.total)
  })
})

describe('end to end through the real PDF fixture', () => {
  it('scores a real résumé file against a pasted JD', async () => {
    const buf = readFileSync(join(__dirname, '..', 'parse', '__tests__', 'fixtures', 'resume.pdf'))
    const resumeText = await pdfToText(buf)
    const r = await matchJdToResume({ jdText: JD, resumeText, jdLocation: 'Bengaluru, India' })
    expect(r.breakdown.total).toBeGreaterThan(0)
    expect(r.breakdown.components.length).toBeGreaterThan(0)
  })
})

/**
 * The warning table in keepStillTrue() copies its strings from
 * src/lib/parse/extract.ts. Nothing in the type system holds those two in
 * agreement, so this does.
 */
describe('the model-resolved warning filter stays wired to the parser', () => {
  it('extractFields still emits the exact strings keepStillTrue() matches on', () => {
    // A résumé with no city, no title, no employer and no dates: every
    // "could not find" warning fires at once.
    const { warnings } = extractFields('Some prose about nothing in particular at all.')
    const joined = warnings.join('\n')

    expect(joined).toContain('We could not find a city')
    expect(joined).toContain('We could not work out your years of experience')
    expect(joined).toContain('We could not find your current title')
    expect(joined).toContain('We could not find your current employer')
  })

  it('drops a warning the model resolved, and keeps one it did not', async () => {
    // Observed on the first real run of /tools/paste-jd: the panel said "We
    // could not find your current title" directly above a 28/28 title score.
    // The parser could not read the title; the model could. Only one of those
    // two statements can be on screen.
    process.env.GROQ_API_KEY = 'test-key'
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  currentTitle: 'Data Analyst',
                  employer: null,
                  yearsExperience: 6,
                  city: 'Bengaluru',
                  skills: ['SQL'],
                  domain: null,
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    try {
      const res = await matchJdToResume({ jdText: JD, resumeText: RESUME })
      const joined = res.warnings.join('\n')
      // Supplied by the model → the admission is gone.
      expect(joined).not.toContain('We could not find your current title')
      expect(joined).not.toContain('We could not find a city')
      // NOT a "could not find" — it is a statement about where a value came
      // from, and it stays true however the field was filled. The filter must
      // leave this family alone.
      expect(joined).toContain('We worked out your years of experience from the dates')
    } finally {
      spy.mockRestore()
      delete process.env.GROQ_API_KEY
    }
  })
})

