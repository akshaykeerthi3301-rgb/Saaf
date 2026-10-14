import { describe, expect, it } from 'vitest'
import { buildStress, AS_OF, type StressDoc } from './make-stress'
import { scoreDoc } from './score-parse'
import { parseResume } from '../src/lib/parse/engine'

/**
 * The stress corpus as a gate: 24 invented careers × 5 layouts, each with hand-declared answers (bench/make-stress.ts).
 * Every check must be RIGHT — not merely "not wrong". An absent value on a document whose answer is known is a
 * regression too, because the profile would be left empty for a person who gave us everything we needed.
 *
 * ⚠️ HOW TO READ A FAILURE: the message names career, layout, field and what was found against what was declared. Fix the
 * parser, not the gold — unless the gold is wrong, in which case say so in the commit.
 */
const asOf = new Date(`${AS_OF}T00:00:00Z`)
let docs: StressDoc[] | null = null
const corpus = async () => (docs ??= await buildStress())
const parsed = new Map<string, Awaited<ReturnType<typeof parseResume>>>()
const parse = async (d: StressDoc) => {
  let r = parsed.get(d.file)
  if (!r) parsed.set(d.file, (r = await parseResume(d.buffer, { asOf, ocr: 'never' })))
  return r
}

describe('stress corpus', () => {
  it('has the documents the gate assumes', async () => {
    const d = await corpus()
    expect(d.length).toBe(120)
    expect(d.filter((x) => x.heldout).length).toBe(50)
  }, 60_000)

  it('every declared answer is read correctly, in every layout', async () => {
    const failures: string[] = []
    for (const d of await corpus()) {
      for (const c of scoreDoc(d.gold, await parse(d))) if (c.verdict !== 'right') failures.push(`${d.file} · ${c.field} · ${c.verdict} · ${c.detail ?? ''}`)
    }
    expect(failures).toEqual([])
  }, 120_000)

  it('the same career reads the same in all five layouts', async () => {
    const byCareer = new Map<string, string[]>()
    for (const d of await corpus()) {
      const r = await parse(d)
      const key = JSON.stringify([r.derived.current_role, r.derived.latest_role, r.derived.total_experience_months, r.derived.internship_months, r.experience.length, r.internships.length, r.projects.length, r.derived.gaps])
      byCareer.set(d.gold.career, [...(byCareer.get(d.gold.career) ?? []), key])
    }
    for (const [career, keys] of byCareer) expect(new Set(keys).size, `${career} differs between layouts`).toBe(1)
  }, 120_000)

  it('no internship, fellowship or project ever reaches the headline number', async () => {
    for (const d of await corpus()) {
      const r = await parse(d)
      expect(r.experience.some((e) => e.is_internship || e.is_project), d.file).toBe(false)
      expect([...r.internships, ...r.projects].some((e) => e.counts_toward_total), d.file).toBe(false)
    }
  }, 120_000)
})
