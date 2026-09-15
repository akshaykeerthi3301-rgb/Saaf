import { describe, expect, it } from 'vitest'
import { checkResume, categoryOf } from '../ats-check'
import { checkTally } from '@/components/features/score-headline'
import { reorderSkills } from '../resume-rewrite'

/**
 * TASK-084's two pure claims, pinned.
 *
 * The Stage 1 headline says "N of M checks came back clean" and Stage 3 offers
 * a skills reorder described as costing nothing and inventing nothing. Both are
 * assertions a candidate reads as fact, and both are cheap to break silently —
 * a rule added to `checkResume` but not registered in `RULES` would quietly
 * change the denominator, and a "reorder" that dropped a skill would be a
 * fabrication guard failure with no guard in front of it.
 */

const RESUME = `Priya Nair — Backend Engineer
Bengaluru · priya@example.com · +91 98765 43210 · linkedin.com/in/priyanair

SUMMARY
Backend engineer with 3 years building payment services in Python.

EXPERIENCE
Backend Engineer, Fintech Co — Jan 2023 to Present
- Built payment APIs in Python and Django serving 4,000 requests per second
- Cut p99 latency 40% by moving reporting onto a read replica

Software Engineer, Agency — Jul 2021 to Dec 2022
- Shipped 12 internal dashboards in React against a REST API

SKILLS
Python, Django, Postgres, SQL, AWS, Docker, React, Git

EDUCATION
B.E. Computer Science, VTU, 2021`

describe('checkTally — the Stage 1 headline numbers', () => {
  it('counts every check, and passed never exceeds total', () => {
    const { passed, total } = checkTally(checkResume(RESUME, 'Backend Engineer'))
    expect(total).toBeGreaterThan(0)
    expect(passed).toBeLessThanOrEqual(total)
  })

  it('every finding raised is registered, so the denominator is real', () => {
    /**
     * ⚠️ THE DENOMINATOR DEFECT THIS GUARDS. `categoryOf()`'s own comment: a
     * rule raised by checkResume but absent from RULES is "scored yet not
     * counted, so 'passed 6 of 8' would be arithmetic over the wrong
     * denominator". The headline prints that fraction, so it has to hold here.
     */
    const report = checkResume(RESUME, 'Backend Engineer')
    for (const f of report.findings) expect(categoryOf(f.id)).not.toBeNull()
  })

  it('failures equal total minus passed — the sentence adds up', () => {
    const report = checkResume(RESUME, 'Backend Engineer')
    const { passed, total } = checkTally(report)
    // Only findings in a registered category are counted, which is the same
    // set the categories were built from.
    const counted = report.findings.filter((f) => categoryOf(f.id) !== null).length
    expect(total - passed).toBe(counted)
  })

  it('choosing a role adds role checks and does not remove document ones', () => {
    /**
     * ⚠️ THE CLAIM THE HEADLINE MAKES ABOUT THE ROLE. The plan wanted "matches
     * this role on 24 of 31 checks"; measured, only the `tailoring` category is
     * about the role. This pins that the role adds a small, separately
     * countable set rather than recolouring the whole tally.
     */
    const without = checkResume(RESUME)
    const with_ = checkResume(RESUME, 'Backend Engineer')
    const tailoring = with_.categories.find((c) => c.key === 'tailoring')

    expect(without.categories.find((c) => c.key === 'tailoring')).toBeUndefined()
    expect(tailoring).toBeDefined()
    expect(tailoring!.total).toBeGreaterThan(0)
    // The role's checks are a minority of the total — that is why the headline
    // reports them separately instead of folding them in.
    expect(tailoring!.total).toBeLessThan(checkTally(with_).total / 2)
    expect(checkTally(with_).total).toBe(checkTally(without).total + tailoring!.total)
  })
})

describe('reorderSkills — Stage 3’s free option', () => {
  const role = { title: 'Backend Engineer', company: '', description: 'We use Docker and AWS daily.' }

  it('adds nothing and removes nothing — it is a sort', () => {
    const before = ['Python', 'Django', 'Postgres', 'AWS', 'Docker']
    const { skills } = reorderSkills(before, role)
    expect([...skills].sort()).toEqual([...before].sort())
    expect(skills).toHaveLength(before.length)
  })

  it('leads with the skills the posting actually names', () => {
    const { skills, changed } = reorderSkills(['Python', 'Django', 'AWS', 'Docker'], role)
    expect(changed).toBe(true)
    expect(skills.slice(0, 2).sort()).toEqual(['AWS', 'Docker'])
  })

  it('reports no change when there is nothing to move', () => {
    // Nothing named by the posting: leaving the order alone is the honest
    // answer, and the UI uses `changed` to avoid claiming it did something.
    expect(reorderSkills(['Figma', 'Sketch'], role).changed).toBe(false)
    // Everything named: already in the right order.
    expect(reorderSkills(['AWS', 'Docker'], role).changed).toBe(false)
  })

  it('cannot fabricate, so it needs no grounding guard', () => {
    const before = ['Python', 'Kubernetes']
    const { skills } = reorderSkills(before, {
      ...role,
      description: 'Kubernetes, Kafka, Terraform and Rust are essential.',
    })
    // Kafka, Terraform and Rust are in the posting and must NOT appear.
    expect(skills).toEqual(expect.arrayContaining(before))
    expect(skills).toHaveLength(2)
    for (const s of skills) expect(before).toContain(s)
  })
})
