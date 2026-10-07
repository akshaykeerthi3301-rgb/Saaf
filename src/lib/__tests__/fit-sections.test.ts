import { describe, it, expect } from 'vitest'
import { fitSections, quoteAround, type FitSectionInput } from '../fit-sections'

const base: FitSectionInput = {
  title: 'Senior Product Manager',
  description: 'We are hiring a product manager. You have 5+ years of product experience. Strong SQL and stakeholder management. A bachelor’s degree is preferred.',
  yearsExperience: 6,
  currentTitle: 'Product Manager',
  credential: 'none',
  skills: ['SQL', 'Stakeholder management'],
  matchedSkills: ['SQL', 'Stakeholder management'],
  missingSkills: ['Kafka'],
  requirements: [{ kind: 'experience_years', minYears: 5, sourceQuote: '5+ years of product experience', confidence: 0.9 }],
}
const by = (o: Partial<FitSectionInput>) => fitSections({ ...base, ...o })
const get = (s: ReturnType<typeof fitSections>, k: string) => s.find((x) => x.key === k)!

describe('fitSections — shape', () => {
  it('always returns the four sections, in order', () => {
    expect(by({}).map((s) => s.key)).toEqual(['experience', 'seniority', 'education', 'skills'])
  })
  it('never throws on an empty profile and an empty posting', () => {
    const s = fitSections({ title: '', description: '', yearsExperience: null, currentTitle: null, credential: null, skills: [], matchedSkills: [], missingSkills: [], requirements: [] })
    expect(s).toHaveLength(4)
    expect(s.every((x) => x.status === 'unknown')).toBe(true)
  })
})

describe('experience', () => {
  it('aligned when the profile meets the years asked, with both quotes', () => {
    const e = get(by({}), 'experience')
    expect(e.status).toBe('aligned')
    expect(e.evidence[0]).toEqual({ you: '6 years of experience · Product Manager', posting: '5+ years of product experience' })
  })
  it('not aligned when short, and still quotes the posting', () => {
    const e = get(by({ yearsExperience: 2 }), 'experience')
    expect(e.status).toBe('not_aligned')
    expect(e.summary).toContain('asks for 5 years'.replace('asks', 'Asks'))
    expect(e.evidence[0].posting).toBe('5+ years of product experience')
  })
  it('unknown when the posting states no years, never aligned by default', () => {
    expect(get(by({ requirements: [] }), 'experience').status).toBe('unknown')
  })
  it('cleans an HTML entity out of a stored quote (found on the live feed: "required&nbsp;")', () => {
    const e = get(by({ requirements: [{ kind: 'experience_years', minYears: 2, sourceQuote: '2 to 5 years of experience required&nbsp;', confidence: 0.9 }] }), 'experience')
    expect(e.evidence[0].posting).toBe('2 to 5 years of experience required')
  })
  it('a low-confidence requirement is not used', () => {
    expect(get(by({ requirements: [{ kind: 'experience_years', minYears: 9, sourceQuote: 'x', confidence: 0.4 }] }), 'experience').status).toBe('unknown')
  })
  it('unknown when the profile has no years', () => {
    const e = get(by({ yearsExperience: null }), 'experience')
    expect(e.status).toBe('unknown')
    expect(e.evidence[0].you).toBeNull()
  })
  it('takes the strictest requirement', () => {
    const e = get(by({ requirements: [
      { kind: 'experience_years', minYears: 3, sourceQuote: 'three years', confidence: 0.9 },
      { kind: 'experience_years', minYears: 8, sourceQuote: 'eight years', confidence: 0.9 },
    ] }), 'experience')
    expect(e.status).toBe('not_aligned')
    expect(e.evidence[0].posting).toBe('eight years')
  })
})

describe('seniority', () => {
  it('unknown when the title states no level', () => {
    expect(get(by({ title: 'Product Manager' }), 'seniority').status).toBe('unknown')
  })
  it('aligned at the same level or one above', () => {
    expect(get(by({ title: 'Senior Analyst', currentTitle: 'Senior Analyst' }), 'seniority').status).toBe('aligned')
    expect(get(by({ title: 'Senior Analyst', currentTitle: 'Lead Analyst' }), 'seniority').status).toBe('aligned')
  })
  it('not aligned below the level, or far above it', () => {
    expect(get(by({ title: 'Senior Analyst', currentTitle: 'Junior Analyst' }), 'seniority').status).toBe('not_aligned')
    expect(get(by({ title: 'Junior Analyst', currentTitle: 'Director of Analytics' }), 'seniority').status).toBe('not_aligned')
  })
  it('falls back to years when the candidate\'s own title states no level', () => {
    const s = get(by({ title: 'Senior Product Manager', currentTitle: 'Product Manager', yearsExperience: 7 }), 'seniority')
    expect(s.status).toBe('aligned')
    expect(s.evidence[0].you).toContain('7 years')
  })
  it('unknown when there is neither a level in the title nor years', () => {
    expect(get(by({ currentTitle: 'Product Manager', yearsExperience: null }), 'seniority').status).toBe('unknown')
  })
})

describe('education', () => {
  it('a professional credential the posting requires and the profile holds is aligned, both sides quoted', () => {
    const e = get(by({ credential: 'CA', requirements: [{ kind: 'credential', minYears: null, credential: 'CA', sourceQuote: 'CA qualified required', confidence: 0.95 }] }), 'education')
    expect(e.status).toBe('aligned')
    expect(e.evidence[0]).toEqual({ you: 'CA (on your profile)', posting: 'CA qualified required' })
  })
  it('a credential required and not held is not aligned', () => {
    const e = get(by({ requirements: [{ kind: 'credential', minYears: null, credential: 'CFA', sourceQuote: 'CFA charterholder', confidence: 0.9 }] }), 'education')
    expect(e.status).toBe('not_aligned')
  })
  it('a degree in the text is UNKNOWN — the profile records no education — and quoted', () => {
    const e = get(by({}), 'education')
    expect(e.status).toBe('unknown')
    expect(e.summary).toContain('does not record your education')
    expect(e.evidence[0].posting).toContain('bachelor’s degree')
    expect(e.evidence[0].you).toBeNull()
  })
  it('"a high degree of autonomy" is not an education requirement (found on the live feed, 2026-10-07)', () => {
    const e = get(by({ description: 'You will work with a high degree of autonomy. Own the roadmap.' }), 'education')
    expect(e.status).toBe('unknown')
    expect(e.summary).toBe('The posting states no education requirement.')
  })
  it.each([
    'Collaborate internally to be the voice of the customer across other departments.',
    'You will be a Scrum Master for two squads.',
    'Master the platform within your first month.',
    'We need someone who can be trusted with master data.',
  ])('does not read %j as a degree (the words "be" and "master" are not degrees; found on the live feed)', (line) => {
    expect(get(by({ description: line }), 'education').summary).toBe('The posting states no education requirement.')
  })
  it.each([
    "Bachelor's degree in any discipline",
    'Master’s degree preferred',
    'A Masters in finance helps',
    'Master of Business Administration',
    'B.E. or B.Tech in computer science',
    'B.Tech or MBA preferred',
    'A degree in engineering is required',
    'Graduate degree or equivalent',
    'MBA from a reputed institute',
  ])('reads %j as a degree requirement', (line) => {
    expect(get(by({ description: line }), 'education').summary).toContain('mentions a degree')
  })
  it('a long sentence is cut AROUND the degree word, so the quote shows what it was chosen for', () => {
    const long = `${'Responsibilities include many things for the team. '.repeat(1)}${'filler '.repeat(40)}and a bachelor’s degree is required ${'tail '.repeat(40)}.`
    const e = get(by({ description: long }), 'education')
    expect(e.evidence[0].posting).toContain('bachelor’s degree')
    expect(e.evidence[0].posting!.length).toBeLessThanOrEqual(190)
  })
  it('says so plainly when the posting asks for nothing', () => {
    const e = get(by({ description: 'Join us. You will own the roadmap.' }), 'education')
    expect(e.status).toBe('unknown')
    expect(e.summary).toBe('The posting states no education requirement.')
  })
})

describe('core skills', () => {
  it('aligned at 60% and above, quoting the posting for each skill held', () => {
    const s = get(by({ description: 'You will use SQL daily. You will practise stakeholder management weekly. Kafka is a plus.' }), 'skills')
    expect(s.status).toBe('aligned')
    expect(s.summary).toContain('You hold 2 of the 3 skills')
    expect(s.summary).toContain('Not on your profile: Kafka')
    expect(s.evidence.map((e) => e.you)).toEqual(['SQL (on your profile)', 'Stakeholder management (on your profile)'])
    expect(s.evidence[0].posting).toBe('You will use SQL daily.')
  })
  it('one long run-on sentence is quoted once, however many skills sit in it (found on the live feed: three cuts of one passage)', () => {
    const run = `Intro words here. ${'filler '.repeat(30)}we need Kafka experience ${'middle '.repeat(30)}and Spark experience ${'end '.repeat(30)}and Airflow too.`
    const s = get(by({ matchedSkills: [], missingSkills: ['Kafka', 'Spark', 'Airflow'], description: run }), 'skills')
    expect(s.status).toBe('not_aligned')
    expect(s.evidence).toHaveLength(1)
  })
  it('two skills named in one sentence give that sentence once, not twice', () => {
    const s = get(by({}), 'skills') // base: "Strong SQL and stakeholder management." is one sentence
    expect(s.evidence).toHaveLength(1)
    expect(s.evidence[0].posting).toContain('SQL and stakeholder management')
  })
  it('not aligned below 60%', () => {
    const s = get(by({ matchedSkills: ['SQL'], missingSkills: ['Kafka', 'Spark', 'Airflow'], description: 'We use SQL. Kafka is used daily. Spark and Airflow too.' }), 'skills')
    expect(s.status).toBe('not_aligned')
    expect(s.evidence.some((e) => e.you === null && e.posting)).toBe(true)
  })
  it('unknown when the posting names no skills', () => {
    expect(get(by({ matchedSkills: [], missingSkills: [] }), 'skills').status).toBe('unknown')
  })
  it('does not tick a skill it cannot quote: aligned-by-count with no quote becomes unknown', () => {
    const s = get(by({ matchedSkills: ['Ghostwriting'], missingSkills: [] }), 'skills')
    expect(s.status).toBe('unknown')
    expect(s.summary).toContain('None could be quoted')
  })
  it('shows at most four evidence items', () => {
    const many = ['SQL', 'Excel', 'Python', 'Tableau', 'Looker', 'dbt']
    const s = get(by({ matchedSkills: many, missingSkills: [], description: many.map((m) => `We use ${m} daily.`).join(' ') }), 'skills')
    expect(s.evidence).toHaveLength(4)
  })
})

describe('THE INVARIANT: no tick without both sides', () => {
  const cases: Partial<FitSectionInput>[] = [
    {}, { yearsExperience: 12 }, { yearsExperience: 1 }, { title: 'Analyst' }, { credential: 'CA', requirements: [{ kind: 'credential', minYears: null, credential: 'CA', sourceQuote: 'CA', confidence: 0.9 }] },
    { matchedSkills: ['SQL'], missingSkills: [] }, { matchedSkills: ['Nope'], missingSkills: [] }, { description: '' },
  ]
  it.each(cases.map((c, i) => [i, c] as const))('case %i', (_i, c) => {
    for (const s of by(c)) {
      if (s.status !== 'aligned') continue
      expect(s.evidence.length, s.key).toBeGreaterThan(0)
      for (const e of s.evidence) {
        expect(e.you?.trim(), `${s.key} you`).toBeTruthy()
        expect(e.posting?.trim(), `${s.key} posting`).toBeTruthy()
      }
    }
  })
})

describe('quoteAround', () => {
  it('returns the sentence containing the whole word', () => {
    expect(quoteAround('Intro. You will use SQL daily. Bye.', 'SQL')).toBe('You will use SQL daily.')
  })
  it('does not match inside a word', () => {
    expect(quoteAround('Our MySQL estate is large.', 'SQL')).toBeNull()
  })
  it('strips tags and entities: text only', () => {
    expect(quoteAround('<p>Know <b>Python</b>&nbsp;well.</p>', 'Python')).toBe('Know Python well.')
  })
  it('trims a long sentence around the term and marks the cut', () => {
    const long = `${'word '.repeat(60)}Kafka ${'more '.repeat(60)}.`
    const q = quoteAround(long, 'Kafka')!
    expect(q.length).toBeLessThanOrEqual(190)
    expect(q).toContain('Kafka')
    expect(q.startsWith('…')).toBe(true)
  })
  it('is null for an empty text or term', () => {
    expect(quoteAround('', 'x')).toBeNull()
    expect(quoteAround('text', '  ')).toBeNull()
  })
})
