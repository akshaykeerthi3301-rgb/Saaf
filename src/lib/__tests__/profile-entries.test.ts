import { describe, expect, it } from 'vitest'
import {
  bulletsToText, dateProblem, emptySections, formatRange, headline, listEducation, listExperience, listProjects,
  parseDates, removeEntry, textToBullets, upsertEntry,
} from '@/lib/profile-entries'
import { EMPTY_EXTRAS, favouriteSkills, mergeFavouriteKeywords, readExtras, strengthTier } from '@/lib/profile-extras'

const job = (title: string, isProject = false) => ({ title, employer: 'Acme', dates: 'Jan 2020 – Mar 2021', location: null, bullets: ['a'], isProject })

describe('parseDates / formatRange', () => {
  it('reads the three shapes a résumé uses and writes one house style', () => {
    expect(parseDates('Jun 2025 – Jul 2026')).toEqual({ startMonth: 6, startYear: 2025, endMonth: 7, endYear: 2026, current: false })
    expect(formatRange(parseDates('June 2025 to July 2026'))).toBe('Jun 2025 - Jul 2026')
    expect(formatRange(parseDates('Jan 2023 – Present'))).toBe('Jan 2023 - Present')
    expect(formatRange(parseDates('2019 - 2023'))).toBe('2019 - 2023')
    expect(parseDates('Apr 2022 — Current').current).toBe(true)
  })
  it('returns nothing for empty or undated text', () => {
    expect(formatRange(parseDates(null))).toBe('')
    expect(formatRange(parseDates('summer'))).toBe('')
  })
  it('refuses a backwards or half-filled range, and allows none at all', () => {
    expect(dateProblem(parseDates('Mar 2021 - Jan 2020'))).toMatch(/before/)
    expect(dateProblem({ startMonth: 1, startYear: null, endMonth: null, endYear: 2022, current: false })).toMatch(/start year/)
    expect(dateProblem({ startMonth: null, startYear: null, endMonth: null, endYear: null, current: false })).toBeNull()
    expect(dateProblem(parseDates('Jan 2020 - Present'))).toBeNull()
  })
})

describe('description box', () => {
  it('round-trips bullets and strips any marker a person pastes', () => {
    expect(bulletsToText(['one', 'two'])).toBe('● one\n● two')
    expect(textToBullets('● one\n• two\n- three\n\n  plain line ')).toEqual(['one', 'two', 'three', 'plain line'])
  })
})

describe('entries', () => {
  const base = { ...emptySections(), experience: [job('Manager'), job('Side project', true), job('Intern')], education: [{ qualification: 'MBA', institution: 'IIM', dates: '2023 - 2025' }] }

  it('keeps projects out of experience and keeps each original index', () => {
    expect(listExperience(base).map((e) => [e.index, e.title])).toEqual([[0, 'Manager'], [2, 'Intern']])
    expect(listProjects(base).map((e) => [e.index, e.title])).toEqual([[1, 'Side project']])
    expect(listEducation(base)).toHaveLength(1)
  })
  it('adds new entries first and replaces in place', () => {
    const added = upsertEntry(base, 'experience', null, job('Lead'))
    expect(added.experience[0].title).toBe('Lead')
    const edited = upsertEntry(base, 'experience', 2, job('Analyst'))
    expect(edited.experience.map((e) => e.title)).toEqual(['Manager', 'Side project', 'Analyst'])
  })
  it('will not let a project edit overwrite a job, or the reverse', () => {
    expect(upsertEntry(base, 'project', 0, job('x'))).toBe(base)
    expect(removeEntry(base, 'experience', 1)).toBe(base)
    expect(removeEntry(base, 'project', 1).experience).toHaveLength(2)
  })
  it('marks what it writes with the kind it was asked for', () => {
    expect(upsertEntry(base, 'project', null, job('New', false)).experience[0].isProject).toBe(true)
    expect(upsertEntry(base, 'experience', null, job('New', true)).experience[0].isProject).toBe(false)
  })
  it('edits education and ignores an index that is not there', () => {
    expect(upsertEntry(base, 'education', 0, { qualification: 'MBA', institution: 'IIMS', dates: null }).education[0].institution).toBe('IIMS')
    expect(upsertEntry(base, 'education', 9, { qualification: 'x', institution: null, dates: null })).toBe(base)
    expect(removeEntry(base, 'education', 0).education).toEqual([])
  })
})

describe('headline', () => {
  it('leaves out what is missing', () => {
    expect(headline('Manager', 'ICICI Bank')).toBe('Manager @ ICICI Bank')
    expect(headline(null, 'ICICI Bank')).toBe('ICICI Bank')
    expect(headline(' ', null)).toBe('')
  })
})

describe('profile extras', () => {
  it('reads a missing, wrong-typed or half-valid column without throwing', () => {
    expect(readExtras(null)).toEqual(EMPTY_EXTRAS)
    expect(readExtras('nope')).toEqual(EMPTY_EXTRAS)
    const r = readExtras({ githubUrl: 'https://github.com/a', languages: 'English', values: ['x', 'y', 'z', 'w'], birthday: '1999-05-25' })
    expect(r.githubUrl).toBe('https://github.com/a')
    expect(r.languages).toEqual([])
    expect(r.values).toEqual([])
    expect(r.birthday).toBe('1999-05-25')
  })
  it('names a tier for every score', () => {
    expect(strengthTier(100).title).toMatch(/All-Star/)
    expect(strengthTier(80).title).toBe('Almost there')
    expect(strengthTier(50).title).toBe('Making progress')
    expect(strengthTier(0).title).toBe('Just getting started')
  })
})

describe('hearted skills are keywords', () => {
  it('adds hearts, drops un-hearted and removed skills, and leaves other keywords alone', () => {
    const out = mergeFavouriteKeywords(['Power BI', 'fintech', 'Excel'], ['Power BI', 'Excel', 'SQL'], ['Excel', 'SQL', 'Claude'], ['sql', 'Claude'])
    expect(out).toEqual(['fintech', 'sql', 'Claude'])
  })
  it('ignores a heart on a skill that is not in the list, and never exceeds 20', () => {
    expect(mergeFavouriteKeywords([], [], ['a'], ['a', 'ghost'])).toEqual(['a'])
    const many = Array.from({ length: 30 }, (_, i) => `s${i}`)
    expect(mergeFavouriteKeywords([], [], many, many)).toHaveLength(20)
  })
  it('reads hearts back from keywords, ignoring case', () => {
    expect(favouriteSkills(['Claude', 'Next.js'], ['claude', 'fintech'])).toEqual(['Claude'])
  })
})
