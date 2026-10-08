import { describe, it, expect } from 'vitest'
import { restoreUnselected } from '../scope-restore'
import type { ResumeSections } from '../parse/sections'

const base: ResumeSections = {
  contact: { name: 'A', email: null, phone: null, links: [] }, summary: 's',
  experience: [
    { title: 'CSM', employer: 'Acme', dates: null, location: null, bullets: ['Owned 40 accounts.'] },
    { title: 'Saaf', employer: 'Side project', dates: null, location: null, bullets: ['Built a matcher.'], isProject: true },
  ],
  education: [], skills: [], other: [], unplaced: 0, order: [],
}
const rewritten: ResumeSections = {
  ...base,
  experience: [
    { ...base.experience[0], bullets: ['Owned 40 accounts worth more.'] },
    { ...base.experience[1], bullets: ['Shipped a matcher.'] },
  ],
}
const changes = [
  { entry: -1, original: 's', rewritten: 'S', kept: true },
  { entry: 0, original: 'Owned 40 accounts.', rewritten: 'Owned 40 accounts worth more.', kept: true },
  { entry: 1, original: 'Built a matcher.', rewritten: 'Shipped a matcher.', kept: true },
]

describe('restoreUnselected', () => {
  it('leaves everything when both are ticked', () => {
    const r = restoreUnselected(rewritten, changes, base, { experience: true, projects: true })
    expect(r.sections.experience[1].bullets).toEqual(['Shipped a matcher.'])
    expect(r.changes).toHaveLength(3)
  })
  it('puts a project back, and forgets its change, when projects is unticked', () => {
    const r = restoreUnselected(rewritten, changes, base, { experience: true, projects: false })
    expect(r.sections.experience[1].bullets).toEqual(['Built a matcher.'])
    expect(r.sections.experience[0].bullets).toEqual(['Owned 40 accounts worth more.'])
    expect(r.changes.map((c) => c.entry)).toEqual([-1, 0])
  })
  it('puts the jobs back when only projects is ticked, and never touches the summary change', () => {
    const r = restoreUnselected(rewritten, changes, base, { experience: false, projects: true })
    expect(r.sections.experience[0].bullets).toEqual(['Owned 40 accounts.'])
    expect(r.sections.experience[1].bullets).toEqual(['Shipped a matcher.'])
    expect(r.changes.map((c) => c.entry)).toEqual([-1, 1])
  })
})
