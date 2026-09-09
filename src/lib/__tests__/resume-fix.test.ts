import { describe, it, expect } from 'vitest'
import {
  strengthenOpener, splitLongBullet, normaliseDates, fixFor, applyEdit, applyDateNormalisation,
} from '../resume-fix'
import { parseSections } from '../parse/sections'

const RESUME = `Rahul Menon
rahul.menon@example.com | +91 98450 11223 | linkedin.com/in/rahulmenon

WORK EXPERIENCE
Software Engineer II at Razorpay
Jul 2023 - Present
• Responsible for the settlement service that moves money to 60,000 merchants
• Worked on migrating the ledger from MySQL to Postgres over 3 months
• Involved in the on-call rota for 4 services

SKILLS
Java, Python, SQL

EDUCATION
B.E. Computer Science, PES University, 2021`

describe('strengthenOpener — a substitution, never a promotion', () => {
  it('uses the candidate’s own verb when the sentence carries one', () => {
    // "Worked on migrating X" → "Migrated X" introduces no new word at all.
    expect(strengthenOpener('Worked on migrating the ledger from MySQL to Postgres'))
      .toBe('Migrated the ledger from MySQL to Postgres')
  })

  it('substitutes a synonym when there is no verb to promote', () => {
    expect(strengthenOpener('Responsible for the settlement service'))
      .toBe('Owned the settlement service')
  })

  it('de-escalates rather than promotes', () => {
    // The candidate may well have led it. Their sentence does not say so.
    const out = strengthenOpener('Involved in the on-call rota for 4 services')
    expect(out).toBe('Contributed to the on-call rota for 4 services')
    expect(out).not.toMatch(/\bLed\b|\bOwned\b/)
  })

  it('never invents an irregular past tense', () => {
    expect(strengthenOpener('Worked on building the dashboard')).toBe('Built the dashboard')
    expect(strengthenOpener('Worked on leading the migration')).toBe('Led the migration')
  })

  it('leaves a strong line alone', () => {
    expect(strengthenOpener('Cut p99 latency from 1400ms to 320ms')).toBeNull()
  })

  it('preserves every figure and name in the line', () => {
    const out = strengthenOpener('Responsible for the settlement service that moves money to 60,000 merchants')!
    expect(out).toContain('60,000')
    expect(out).toContain('settlement service')
  })
})

describe('splitLongBullet', () => {
  it('splits at a sentence boundary', () => {
    const long = `${'Owned the reporting stack end to end for the payments group. '.repeat(6)}Ran the weekly review.`
    const parts = splitLongBullet(long)
    expect(parts!.length).toBeGreaterThan(1)
    expect(parts!.join(' ').replace(/\s+/g, ' ')).toContain('Ran the weekly review.')
  })

  it('refuses to split one long sentence rather than cutting it in half', () => {
    expect(splitLongBullet('Owned the reporting stack '.repeat(20))).toBeNull()
  })

  it('leaves a normal bullet alone', () => {
    expect(splitLongBullet('Built the retention report')).toBeNull()
  })
})

describe('normaliseDates', () => {
  it('rewrites the numeric form and leaves the word form alone', () => {
    expect(normaliseDates('03/2021 - 06/2019')).toBe('Mar 2021 - Jun 2019')
    expect(normaliseDates('Mar 2021 – Present')).toBe('Mar 2021 – Present')
  })
})

describe('fixFor', () => {
  const sections = parseSections(RESUME)

  it('offers one edit per weak line, each independently acceptable', () => {
    const fix = fixFor('weak-openers', sections)
    expect(fix?.kind).toBe('edit')
    if (fix?.kind !== 'edit') throw new Error('expected edits')
    expect(fix.edits).toHaveLength(3)
    for (const e of fix.edits) expect(e.after).not.toBe(e.before)
  })

  it('returns an ASK, never a generated figure, for missing impact', () => {
    const fix = fixFor('no-quantified-impact', sections)
    expect(fix?.kind).toBe('ask')
    if (fix?.kind !== 'ask') throw new Error('expected ask')
    // The promise this whole product rests on, asserted in a test.
    expect(fix.note).toMatch(/not invent/i)
  })

  it('returns an ask for a link, because we cannot know the URL', () => {
    expect(fixFor('no-links', sections)?.kind).toBe('ask')
  })

  it('refuses to pad a short résumé', () => {
    const fix = fixFor('resume-length', sections)
    if (fix?.kind !== 'ask') throw new Error('expected ask')
    expect(fix.note).toMatch(/padding/i)
  })

  it('treats structural findings as a layout rebuild', () => {
    for (const id of ['section-order', 'title-misread', 'separator-header', 'multi-column']) {
      expect(fixFor(id, sections)?.kind).toBe('layout')
    }
  })

  it('returns null for a finding with no mechanical answer', () => {
    expect(fixFor('role-vocabulary', sections)).toBeNull()
  })
})

describe('applying a fix', () => {
  const sections = parseSections(RESUME)

  it('changes only the accepted line and leaves the rest untouched', () => {
    const fix = fixFor('weak-openers', sections)
    if (fix?.kind !== 'edit') throw new Error('expected edits')
    const next = applyEdit(sections, fix.edits[0])

    expect(next.experience[0].bullets[0]).toBe(fix.edits[0].after)
    // The other two are still exactly as the candidate wrote them.
    expect(next.experience[0].bullets[1]).toBe(sections.experience[0].bullets[1])
    expect(next.experience[0].bullets[2]).toBe(sections.experience[0].bullets[2])
  })

  it('does not mutate the input', () => {
    const fix = fixFor('weak-openers', sections)
    if (fix?.kind !== 'edit') throw new Error('expected edits')
    const before = sections.experience[0].bullets[0]
    applyEdit(sections, fix.edits[0])
    expect(sections.experience[0].bullets[0]).toBe(before)
  })

  it('normalises dates across experience and education together', () => {
    const mixed = parseSections(RESUME.replace('Jul 2023 - Present', '07/2023 - Present'))
    const next = applyDateNormalisation(mixed)
    expect(next.experience[0].dates).toContain('Jul 2023')
  })
})
