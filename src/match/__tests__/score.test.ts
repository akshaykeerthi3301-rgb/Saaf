import { describe, it, expect } from 'vitest'
import { scoreRole, summarise, bucketFor } from '../score'
import { extractTitleSeniority } from '@/gates/title'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'

const junior: CandidateProfile = {
  yearsExperience: 2, city: 'Bengaluru', credential: 'none',
  preferredRole: 'Product Manager', workModePreference: 'no_preference',
}
const senior: CandidateProfile = { ...junior, yearsExperience: 10 }

const role = { title: 'Product Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru' }

const req = (over: Partial<TypedRequirement>): TypedRequirement => ({
  kind: 'experience_years', sourceQuote: 'stated in the posting', confidence: 0.95, ...over,
})

describe('the score reads the candidate', () => {
  it('gives two candidates different scores on the same role', () => {
    // The defect this replaces: scoreFor() took the profile as `_p` and never
    // read it, so every candidate scored identically and the number really
    // measured how wordy the posting was.
    const reqs = [req({ minYears: 8 })]
    const a = scoreRole(junior, role, reqs).total
    const b = scoreRole(senior, role, reqs).total
    expect(a).not.toBe(b)
    expect(b).toBeGreaterThan(a)
  })

  it('never withholds — a role far above the candidate still scores', () => {
    const r = scoreRole(junior, role, [req({ minYears: 15 })])
    expect(r.total).toBeGreaterThan(0)
    expect(r.total).toBeLessThanOrEqual(100)
  })

  it('keeps every total within 0-100', () => {
    for (const years of [0, 2, 5, 20]) {
      for (const min of [0, 3, 10, 25]) {
        const r = scoreRole({ ...junior, yearsExperience: years }, role, [req({ minYears: min })])
        expect(r.total).toBeGreaterThanOrEqual(0)
        expect(r.total).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('components', () => {
  it('scores a matching title above an unrelated one', () => {
    const match = scoreRole(junior, role, []).components.find((c) => c.key === 'title')!
    const miss = scoreRole(junior, { ...role, title: 'Chartered Accountant' }, []).components
      .find((c) => c.key === 'title')!
    expect(match.points).toBeGreaterThan(miss.points)
    expect(match.points).toBe(match.max)
  })

  it('matches "Product Management" to a "Product Manager" search', () => {
    // Crude stemming has to survive the plural/gerund forms real titles use.
    const c = scoreRole(junior, { ...role, title: 'Product Management - Lending' }, [])
      .components.find((x) => x.key === 'title')!
    expect(c.points).toBe(c.max)
  })

  it('penalises a credential the candidate does not hold, without withholding', () => {
    const reqs = [req({ kind: 'credential', credential: 'CA' })]
    const without = scoreRole(junior, role, reqs)
    const with_ = scoreRole({ ...junior, credential: 'CA' }, role, reqs)
    expect(with_.total).toBeGreaterThan(without.total)
    expect(without.total).toBeGreaterThan(0)
  })

  it('rewards a work-mode match', () => {
    const remoteRole = { title: 'Product Manager', locationRaw: 'Remote - India' }
    const wants = scoreRole({ ...junior, workModePreference: 'remote' }, remoteRole, [])
    const doesnt = scoreRole({ ...junior, workModePreference: 'onsite' }, remoteRole, [])
    expect(wants.total).toBeGreaterThan(doesnt.total)
  })

  it('flags low confidence when the experience bar could not be read', () => {
    const r = scoreRole(junior, { ...role, unreadExperienceMention: true }, [])
    expect(r.confidence).toBe('low')
  })

  it('ignores requirements below the gating threshold', () => {
    // A preference-framed mention must not move the score as if it were a
    // requirement — the same threshold the extractor applies.
    const soft = scoreRole(junior, role, [req({ minYears: 12, confidence: 0.3 })])
    const none = scoreRole(junior, role, [])
    expect(soft.total).toBe(none.total)
  })
})

describe('summarise', () => {
  it('surfaces the weakest component, not a generic line', () => {
    const r = scoreRole(junior, role, [req({ minYears: 9 })])
    expect(summarise(r)).toMatch(/9 years/)
  })

  it('says so plainly when nothing is short', () => {
    const r = scoreRole(senior, role, [req({ minYears: 3 })])
    expect(summarise(r)).toMatch(/clears every requirement/i)
  })
})

describe('skills', () => {
  const withSkills: CandidateProfile = { ...junior, skills: ['SQL', 'Roadmapping', 'A/B testing'] }
  const jd = { ...role, description: 'You will own the roadmap and run A/B testing. SQL is essential. '.repeat(3) }

  it('lifts a role whose posting names the candidate’s skills', () => {
    const named = scoreRole(withSkills, jd, []).total
    const notNamed = scoreRole(withSkills, { ...role, description: 'Unrelated duties. '.repeat(10) }, []).total
    expect(named).toBeGreaterThan(notNamed)
  })

  it('does not penalise a candidate who has no skills on file', () => {
    // The component is left out of the total rather than scored zero —
    // otherwise everyone who has not uploaded a résumé sits 20 points below
    // an otherwise identical candidate who has.
    const none = scoreRole(junior, jd, [])
    expect(none.components.some((c) => c.key === 'skills')).toBe(false)
    expect(none.total).toBeGreaterThanOrEqual(scoreRole(withSkills, { ...role, description: 'Unrelated. '.repeat(10) }, []).total)
  })

  it('omits the component when the posting has no text to search', () => {
    const r = scoreRole(withSkills, role, [])
    expect(r.components.some((c) => c.key === 'skills')).toBe(false)
  })

  it('names the matched skills back, rather than asserting a fit', () => {
    const c = scoreRole(withSkills, jd, []).components.find((x) => x.key === 'skills')!
    expect(c.note).toMatch(/SQL/)
  })
})

describe('a candidate under the stated bar is never a top choice', () => {
  // The two cases this was raised on. Both used to score into "Matches you",
  // because a gap inside the two-year relaxation was absorbed into the number
  // and nothing on screen said the bar had not been met.
  const inBengaluru = { title: 'Product Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru' }

  it('1.5 years against a "2+ years" posting is short, not a match', () => {
    const candidate: CandidateProfile = { ...junior, yearsExperience: 1.5 }
    const b = scoreRole(candidate, inBengaluru, [req({ minYears: 2 })])
    expect(b.experience).toBe('short')
    expect(bucketFor(b)).toBe('experience_short')
    // The gap is still named on the card, to the half year.
    expect(b.components.find((c) => c.key === 'seniority')!.note)
      .toBe('Asks for 2 years; you have 1.5 — 0.5 short.')
  })

  it('0 years against a "1 - 5 years" posting is short, not a match', () => {
    // The extractor stores the floor of a range, so "1 - 5 years" arrives as 1.
    const candidate: CandidateProfile = { ...junior, yearsExperience: 0 }
    const b = scoreRole(candidate, inBengaluru, [req({ minYears: 1 })])
    expect(b.experience).toBe('short')
    expect(bucketFor(b)).toBe('experience_short')
  })

  it('meeting the bar exactly is a match', () => {
    const candidate: CandidateProfile = { ...junior, yearsExperience: 2 }
    const b = scoreRole(candidate, inBengaluru, [req({ minYears: 2 })])
    expect(b.experience).toBe('meets')
    expect(bucketFor(b)).toBe('matches')
  })

  it('still scores a short candidate above a far-short one', () => {
    // Separating the bucket must not flatten the ranking inside it.
    const short = scoreRole({ ...junior, yearsExperience: 1.5 }, inBengaluru, [req({ minYears: 2 })])
    const far = scoreRole({ ...junior, yearsExperience: 1.5 }, inBengaluru, [req({ minYears: 9 })])
    expect(short.total).toBeGreaterThan(far.total)
    expect(bucketFor(far)).toBe('experience_out')
  })
})

describe('location standing', () => {
  it('marks the asked-for city exact and a commute-cluster city as cluster', () => {
    const delhi: CandidateProfile = { ...junior, city: 'Delhi' }
    const inDelhi = scoreRole(delhi, { title: 'Product Manager', locationRaw: 'Delhi, India' }, [])
    const inNoida = scoreRole(delhi, { title: 'Product Manager', locationRaw: 'Noida, Uttar Pradesh' }, [])
    const inPune = scoreRole(delhi, { title: 'Product Manager', locationRaw: 'Pune, Maharashtra' }, [])

    expect(inDelhi.location).toBe('exact')
    expect(inNoida.location).toBe('cluster')
    expect(inPune.location).toBe('elsewhere')
    expect(inDelhi.total).toBeGreaterThan(inNoida.total)
  })

  it('does not label the cluster role in its note, only names the city', () => {
    const delhi: CandidateProfile = { ...junior, city: 'Delhi' }
    const inNoida = scoreRole(delhi, { title: 'Product Manager', locationRaw: 'Noida, Uttar Pradesh' }, [])
    expect(inNoida.components.find((c) => c.key === 'location')!.note).toBe('In Noida.')
  })
})

describe('over-qualification, against a stated ceiling only', () => {
  const inBengaluru = { title: 'Product Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru' }
  const range = (min: number, max: number) => [req({ minYears: min, maxYears: max })]

  it('reads a candidate past the top of a "1 - 5 years" band as over', () => {
    const b = scoreRole({ ...junior, yearsExperience: 12 }, inBengaluru, range(1, 5))
    expect(b.experience).toBe('over')
    expect(bucketFor(b)).toBe('experience_over')
    expect(b.components.find((c) => c.key === 'seniority')!.note)
      .toBe('Asks for 1–5 years; you have 12 — 7 over.')
  })

  it('allows the same two-year tolerance above the ceiling as below the floor', () => {
    const b = scoreRole({ ...junior, yearsExperience: 7 }, inBengaluru, range(1, 5))
    expect(b.experience).toBe('meets')
    expect(bucketFor(b)).toBe('matches')
  })

  it('never calls anyone over-qualified against an open-ended posting', () => {
    // "5+ years" states no ceiling. The old scorer guessed one — held >
    // required + 8 — and scored a 20-year candidate down against an upper
    // bound nobody had written.
    const b = scoreRole({ ...junior, yearsExperience: 20 }, inBengaluru, [req({ minYears: 5 })])
    expect(b.experience).toBe('meets')
    expect(b.components.find((c) => c.key === 'seniority')!.points)
      .toBe(b.components.find((c) => c.key === 'seniority')!.max)
  })

  it('scores further over the ceiling lower than just over it', () => {
    const near = scoreRole({ ...junior, yearsExperience: 9 }, inBengaluru, range(1, 5))
    const far = scoreRole({ ...junior, yearsExperience: 25 }, inBengaluru, range(1, 5))
    expect(near.total).toBeGreaterThan(far.total)
    expect(near.experience).toBe('over')
    expect(far.experience).toBe('over')
  })

  it('reads the floor first when a band is stated at both ends', () => {
    // Under the floor by one year, inside the relaxation.
    expect(scoreRole({ ...junior, yearsExperience: 2 }, inBengaluru, range(3, 8)).experience)
      .toBe('short')
    // Under it by three, past the relaxation.
    expect(scoreRole({ ...junior, yearsExperience: 0 }, inBengaluru, range(3, 8)).experience)
      .toBe('far_short')
    // Inside the band.
    expect(scoreRole({ ...junior, yearsExperience: 5 }, inBengaluru, range(3, 8)).experience)
      .toBe('meets')
  })
})

describe('years asked for in a function the candidate has not worked in', () => {
  const inBengaluru = { title: 'Product Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru' }
  // Two years in HR, searching for product management. The exact case raised.
  const changer: CandidateProfile = {
    ...junior, yearsExperience: 2, currentTitle: 'HR Business Partner',
    preferredRole: 'Product Manager',
  }

  it('does not count HR years toward "2 years of product management experience"', () => {
    const b = scoreRole(changer, inBengaluru,
      [req({ minYears: 2, valueText: 'product management' })])
    expect(b.experience).toBe('short')
    expect(bucketFor(b)).toBe('experience_short')
    expect(b.components.find((c) => c.key === 'seniority')!.note)
      .toBe('Asks for 2 years of Product experience; your 2 years are in HR & People.')
  })

  it('scores an UNQUALIFIED years requirement normally — the stated rule', () => {
    // "2 years of experience required" asks for two years of anything, and the
    // candidate has two years. It is suggested with its respective score.
    const b = scoreRole(changer, inBengaluru, [req({ minYears: 2 })])
    expect(b.experience).toBe('meets')
    expect(bucketFor(b)).toBe('matches')
  })

  it('counts the years when the function does match', () => {
    const pm: CandidateProfile = { ...changer, currentTitle: 'Associate Product Manager' }
    const b = scoreRole(pm, inBengaluru, [req({ minYears: 2, valueText: 'product management' })])
    expect(b.experience).toBe('meets')
  })

  it('stays silent when either side names no function', () => {
    // A requirement whose qualifier is not a function...
    expect(scoreRole(changer, inBengaluru,
      [req({ minYears: 2, valueText: 'fast-paced environment' })]).experience).toBe('meets')
    // ...and a candidate title we cannot place.
    const unknown: CandidateProfile = { ...changer, currentTitle: 'Chief Vibes Officer' }
    expect(scoreRole(unknown, inBengaluru,
      [req({ minYears: 2, valueText: 'product management' })]).experience).toBe('meets')
  })

  it('caps the score rather than hiding the role', () => {
    const b = scoreRole(changer, inBengaluru,
      [req({ minYears: 2, valueText: 'product management' })])
    expect(b.total).toBeLessThanOrEqual(65)
    expect(b.components.some((c) => c.key === 'cap')).toBe(true)
  })
})

describe('entry-level titles are read as a ceiling', () => {
  it('drops an internship for a candidate with real experience', () => {
    const b = scoreRole(
      { ...junior, yearsExperience: 2 },
      { title: 'Product Management Intern - Insurance', locationRaw: 'Bengaluru, India', city: 'Bengaluru' },
      extractTitleSeniority('Product Management Intern - Insurance'),
    )
    expect(b.experience).toBe('over')
    expect(bucketFor(b)).toBe('experience_over')
    expect(b.total).toBeLessThan(60)
    expect(b.components.find((c) => c.key === 'seniority')!.note)
      .toBe('This is an internship; you have 2 years.')
  })

  it('leaves an ordinary Indian mid-level title alone', () => {
    // "Assistant Manager" and "Associate Director" are mid-level here. Reading
    // them as entry-level would push down exactly what should be shown.
    expect(extractTitleSeniority('Assistant Manager - Product')).toEqual([])
  })
})

describe('the worked example published on the landing page', () => {
  // src/app/(marketing)/page.tsx prints these numbers as the product's own
  // proof that its arithmetic can be checked. They were wrong for months —
  // 35/35, 2/30, 15/15, 10/10, none of which the scorer has ever used — so
  // they are pinned here. If this test fails, the landing page is lying.
  it('still produces exactly what the page claims', () => {
    const b = scoreRole(
      { yearsExperience: 2, city: 'Bengaluru', credential: 'none',
        preferredRole: 'Staff Engineer', workModePreference: 'no_preference', skills: [] },
      { title: 'Staff Engineer', locationRaw: 'Bengaluru, India', city: 'Bengaluru' },
      [req({ minYears: 8 })],
    )
    expect(b.total).toBe(35)
    const at = (k: string) => {
      const c = b.components.find((x) => x.key === k)!
      return `${c.points}/${c.max}`
    }
    expect(at('title')).toBe('28/28')
    expect(at('seniority')).toBe('1/25')
    expect(at('location')).toBe('10/10')
    expect(at('work_mode')).toBe('7/7')
    expect(at('credential')).toBe('10/10')
    expect(at('cap')).toBe('35/50')
  })
})

/**
 * An experience bar we could not read must never present as a strong match.
 *
 * CAPS had entries for short, far_short and over, and none for 'unread'. So a
 * posting whose bar the extractor could not read confidently kept an uncapped
 * total: the four components that are near full marks for any in-city role
 * needing no credential carried it to 85, and the card said "Strong match"
 * directly above the words "we couldn't read this reliably". Observed live
 * 2026-09-07 on a 7–10 year posting shown to a two-year candidate.
 */
describe('an unread experience bar is capped', () => {
  const candidate: CandidateProfile = {
    yearsExperience: 2, city: 'Bengaluru', preferredRole: 'Manager', credential: 'none',
  } as CandidateProfile

  const role = { title: 'Manager', locationRaw: 'Bengaluru, India', city: 'Bengaluru', unreadExperienceMention: true }

  it('cannot reach the Strong match band', () => {
    const b = scoreRole(candidate, role, [])
    expect(b.total).toBeLessThan(75)
  })

  it('still ranks above a known shortfall, which is the stronger negative', () => {
    const unread = scoreRole(candidate, role, []).total
    const shortfall = scoreRole(candidate, { ...role, unreadExperienceMention: false }, [
      { kind: 'experience_years', minYears: 6, sourceQuote: '6 years required', confidence: 0.95 },
    ]).total
    expect(unread).toBeGreaterThan(shortfall)
  })

  it('says why, in its own component, rather than silently holding the number down', () => {
    const b = scoreRole(candidate, role, [])
    const cap = b.components.find((c) => c.key === 'cap')
    expect(cap).toBeDefined()
    // It must not claim the candidate is outside a band — we never read one.
    expect(cap!.note).not.toMatch(/you are outside/i)
    expect(cap!.note).toMatch(/could not read/i)
  })
})

describe('several preferred roles', () => {
  const role = {
    title: 'Senior Product Manager',
    description: 'Own the payments platform roadmap. SQL and experimentation.',
  }
  const base = { yearsExperience: 5, city: 'Bengaluru', skills: ['SQL'] }

  const titleOf = (c: Parameters<typeof scoreRole>[0]) =>
    scoreRole(c, role, []).components.find((x) => x.key === 'title')!

  it('scores the BEST role, not the union of them', () => {
    // ⚠️ THE REGRESSION THIS PINS IS BACKWARDS-FEELING AND REAL. A union pools
    // the words of every role, so adding a second role the candidate would
    // happily take LOWERS the score of every posting that answers the first.
    const one = titleOf({ ...base, preferredRoles: ['Product Manager'] })
    const two = titleOf({ ...base, preferredRoles: ['Product Manager', 'Data Analyst'] })
    expect(two.points).toBe(one.points)
    expect(two.points).toBe(two.max)
  })

  it('names which of the roles matched, when there is more than one', () => {
    const c = titleOf({ ...base, preferredRoles: ['Data Analyst', 'Product Manager'] })
    expect(c.note).toMatch(/Product Manager/)
  })

  it('does not name a role when there is only one', () => {
    const c = titleOf({ ...base, preferredRoles: ['Product Manager'] })
    expect(c.note).not.toMatch(/\(/)
  })

  it('still reads the singular column, so an unmigrated profile works', () => {
    const legacy = titleOf({ ...base, preferredRole: 'Product Manager' })
    const modern = titleOf({ ...base, preferredRoles: ['Product Manager'] })
    expect(legacy.points).toBe(modern.points)
  })

  it('merges both sources without double-counting', () => {
    const both = titleOf({
      ...base,
      preferredRole: 'Product Manager',
      preferredRoles: ['Product Manager'],
    })
    expect(both.points).toBe(both.max)
  })
})

describe('the candidate’s own keywords', () => {
  const role = {
    title: 'Senior Product Manager',
    description: 'Own the payments platform roadmap for our fintech business.',
  }
  const base = { yearsExperience: 5, preferredRoles: ['Product Manager'], skills: ['SQL'] }
  const kw = (c: Parameters<typeof scoreRole>[0]) =>
    scoreRole(c, role, []).components.find((x) => x.key === 'keywords')

  it('is absent when the candidate set none, so they are not scored out of more', () => {
    expect(kw(base)).toBeUndefined()
  })

  it('boosts a role that names them', () => {
    const c = kw({ ...base, keywords: ['payments', 'fintech'] })!
    expect(c.points).toBeGreaterThan(0)
    expect(c.note).toMatch(/payments/)
  })

  it('scores zero — not absent — when the role names none of them', () => {
    // Absent and zero mean different things: absent is "not asked", zero is
    // "asked and the answer was no". The candidate must be able to tell.
    const c = kw({ ...base, keywords: ['kubernetes', 'devops'] })!
    expect(c.points).toBe(0)
    expect(c.note).toMatch(/none of the keywords/i)
  })

  it('never hides a role — only reorders', () => {
    // The Stage A lock. A role matching no keyword still scores and still
    // appears; it simply ranks lower than one that matches.
    const without = scoreRole({ ...base, keywords: ['kubernetes'] }, role, []).total
    const with_ = scoreRole({ ...base, keywords: ['payments'] }, role, []).total
    expect(without).toBeGreaterThan(0)
    expect(with_).toBeGreaterThan(without)
  })
})
