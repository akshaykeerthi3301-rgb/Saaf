import { describe, expect, it } from 'vitest'
import { buildGapTable, type GapRow } from '../gap-table'

/**
 * The gap table is Stage 2 of the Résumé Studio and it is entirely retrieval,
 * so every test here is an assertion about what it REFUSES to say as much as
 * about what it says. The two failures this surface can plausibly ship are a
 * cell asserted from nothing and a term matched inside another word, and both
 * have precedents in this repo: the interview generator asked "How much have
 * you worked with Poland?" for a day (Stage U), and the scorer paid out 28
 * points as a constant (Stage R). Both passed their own tests first.
 */

const RESUME = `
Priya Nair
Backend Engineer, Bengaluru
priya@example.com

EXPERIENCE
Backend Engineer, Fintech Co — 2022 to present
- Built payment APIs in Python on AWS, handling 4,000 requests per second
- Owned the Postgres migration off a single instance

SKILLS
Python, Postgres, AWS, Docker
`.trim()

const JD = `
Senior Backend Engineer

We are looking for an engineer with 6+ years of experience building distributed
systems. You will work with Kubernetes, Kafka and Python across our platform.
Kubernetes experience is essential and Kafka is used across every service.
`.trim()

const read = { currentTitle: 'Backend Engineer', yearsExperience: 3 }

function row(rows: GapRow[], id: GapRow['id']) {
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error(`no ${id} row`)
  return r
}

describe('buildGapTable', () => {
  it('returns one row per dimension, always in the same order', () => {
    const { rows } = buildGapTable({ jdText: JD, targetRole: 'Backend Engineer', resumeText: RESUME, read })
    expect(rows.map((r) => r.id)).toEqual(['title', 'experience', 'skills', 'credential'])
  })

  it('reads the experience bar out of the posting and quotes the sentence', () => {
    const { rows } = buildGapTable({ jdText: JD, targetRole: 'Backend Engineer', resumeText: RESUME, read })
    const r = row(rows, 'experience')
    expect(r.job).toBe('6+ years')
    expect(r.resume).toBe('3 years')
    expect(r.status).toBe('gap')
    // Retrieved, never generated — the candidate can check the row against the
    // posting they pasted.
    expect(r.evidence).toBeTruthy()
    expect(JD).toContain(r.evidence!.trim().slice(0, 20))
  })

  it('says nothing about experience when the posting states no bar', () => {
    const { rows } = buildGapTable({
      jdText: 'We want a backend engineer who cares about correctness.',
      targetRole: 'Backend Engineer',
      resumeText: RESUME,
      read,
    })
    const r = row(rows, 'experience')
    expect(r.job).toBeNull()
    // ⚠️ The row must NOT read as a gap. An invented requirement is the same
    // defect as a wrong refusal, pointed at the candidate's confidence.
    expect(r.status).toBe('unknown')
  })

  it('does not count a silent posting as a gap', () => {
    const { gaps, unknowns } = buildGapTable({
      jdText: 'Join our team. We move fast.',
      resumeText: RESUME,
      read: {},
    })
    expect(gaps).toBe(0)
    expect(unknowns).toBeGreaterThan(0)
  })

  it('treats a seniority prefix as the same job, not a title mismatch', () => {
    const { rows } = buildGapTable({ jdText: JD, jdTitle: 'Senior Backend Engineer', resumeText: RESUME, read })
    // "Senior" is a rung, not a job. Calling this a gap would tell the
    // candidate to rewrite the one line already right.
    expect(row(rows, 'title').status).toBe('match')
  })

  it('marks a genuinely different title as a gap', () => {
    const { rows } = buildGapTable({
      jdText: JD,
      jdTitle: 'Private Banking Manager',
      resumeText: RESUME,
      read,
    })
    expect(row(rows, 'title').status).toBe('gap')
  })

  it('finds the posting’s skill terms and marks which the résumé already has', () => {
    const { rows } = buildGapTable({ jdText: JD, targetRole: 'Backend Engineer', resumeText: RESUME, read })
    const terms = row(rows, 'skills').terms ?? []
    const byTerm = Object.fromEntries(terms.map((t) => [t.term.toLowerCase(), t]))
    expect(byTerm.python?.present).toBe(true)
    expect(byTerm.kubernetes?.present).toBe(false)
    expect(byTerm.kafka?.present).toBe(false)
    expect(row(rows, 'skills').status).toBe('partial')
  })

  it('ranks skill terms by how many employers name them, most first', () => {
    const terms = row(
      buildGapTable({ jdText: JD, targetRole: 'Backend Engineer', resumeText: RESUME, read }).rows,
      'skills',
    ).terms!
    const boards = terms.map((t) => t.boards ?? 0)
    expect([...boards].sort((a, b) => b - a)).toEqual(boards)
    // The dispersion figure is the thing a tool reading one advert cannot print.
    expect(boards[0]).toBeGreaterThan(0)
  })

  it('never reports a skill it only found INSIDE another word', () => {
    /**
     * ⚠️ THE REGRESSION THIS FILE EXISTS FOR. `marketCoverage()` uses a bare
     * substring test; over 1,134 short terms that finds "ai" in "email", "cd"
     * in "cdn", "go" in "goals" — each one a tick against a skill the
     * candidate does not have.
     */
    const jd = 'You will work with AI, Go and CD pipelines.'
    const resume = 'Email me. I set goals and read the CDN docs. Golang was not used.'
    const terms = row(buildGapTable({ jdText: jd, resumeText: resume, read: {} }).rows, 'skills').terms ?? []
    for (const t of terms) expect(t.present).toBe(false)
  })

  it('matches a term that ends in punctuation the word-boundary rule would drop', () => {
    const jd = 'Strong C++ and .NET experience required.'
    const resume = 'Shipped C++ services and a .NET reporting tool.'
    const terms = row(buildGapTable({ jdText: jd, resumeText: resume, read: {} }).rows, 'skills').terms ?? []
    const names = terms.map((t) => t.term.toLowerCase())
    // Only assert on terms the vocabulary actually carries; whichever of these
    // it holds must be found in the résumé, not missed on a boundary.
    for (const t of terms) {
      if (names.includes(t.term.toLowerCase())) expect(t.present).toBe(true)
    }
  })

  it('stays silent on a qualification the posting does not name', () => {
    /**
     * ⚠️ THIS ROW REPLACED "THEIR OWN WORDS". Against five live postings on
     * 2026-09-15 that row printed six employer names (`Xylem`, `Availity`,
     * `WEKA`, `Weka`, …) and prose fragments (`ideas.`, `e.g.`, `None`). See
     * the comment on the row in gap-table.ts; the point of this test is that
     * its replacement asserts nothing when the posting says nothing.
     */
    const r = row(buildGapTable({ jdText: JD, resumeText: RESUME, read }).rows, 'credential')
    expect(r.job).toBeNull()
    expect(r.status).toBe('unknown')
  })

  it('reads a stated qualification and quotes the sentence it came from', () => {
    const jd = 'Applicants must be a qualified Chartered Accountant with 4+ years in audit.'
    const r = row(buildGapTable({ jdText: jd, resumeText: RESUME, read }).rows, 'credential')
    expect(r.job).toBe('CA')
    expect(r.resume).toBeNull()
    expect(r.status).toBe('gap')
    expect(r.evidence).toBeTruthy()
  })

  it('matches a qualification the résumé actually holds', () => {
    const jd = 'Applicants must be a qualified Chartered Accountant.'
    const r = row(
      buildGapTable({ jdText: jd, resumeText: RESUME, read: { ...read, credential: 'CA' } }).rows,
      'credential',
    )
    expect(r.status).toBe('match')
  })

  it('carries a note on every row — a cell is never a number on its own', () => {
    const { rows } = buildGapTable({ jdText: JD, targetRole: 'Backend Engineer', resumeText: RESUME, read })
    for (const r of rows) expect(r.note.length).toBeGreaterThan(20)
  })
})
