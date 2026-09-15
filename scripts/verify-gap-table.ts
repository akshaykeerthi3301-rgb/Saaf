/**
 * Point the gap table at real postings and READ THE OUTPUT. Run:
 *   npx tsx --env-file=.env.local scripts/verify-gap-table.ts
 *
 * ⚠️ THIS SCRIPT EXISTS BECAUSE THE TESTS ARE NOT ENOUGH, AND THIS REPOSITORY
 * HAS THE RECEIPT. On 2026-09-15 the interview-prep generator passed every one
 * of its tests and, pointed at 60 real postings, asked candidates "How much
 * have you worked with Poland?" in 78% of its questions. It was reverted the
 * same day (PROJECT-STATE Stage U). The tests were written against fixtures
 * somebody wrote; the index was not consulted. TASK-083 therefore gates on
 * five REAL postings rather than on a green suite.
 *
 * It prints every row of every table so a person can read them, and separately
 * asserts the one thing that failure taught: no term the table shows may be a
 * place or a company name. Both exclusion sets are rebuilt here from the same
 * data `scripts/build-skill-vocabulary.ts` uses, so this is an independent
 * check on the vocabulary rather than a restatement of it.
 *
 * Reads the live index. Writes nothing.
 */
import { readFileSync } from 'node:fs'
import { createServiceClient } from '../src/lib/supabase/service'
import { CITIES, INDIAN_STATES } from '../src/lib/taxonomy/locations'
import { buildGapTable, type GapRow } from '../src/lib/gap-table'

/**
 * One real résumé's worth of text, invented but shaped like the documents the
 * checker actually sees. It is deliberately a mid-level engineer: strong on
 * Python and AWS, silent on everything a platform posting asks for, so the
 * table has both matches and gaps to print rather than one or the other.
 */
const RESUME = `
Priya Nair — Backend Engineer
Bengaluru, Karnataka · priya.nair@example.com · github.com/priyanair

SUMMARY
Backend engineer with three years building payment services in Python.

EXPERIENCE
Backend Engineer, Fintech Co — Jan 2023 to present
- Built and owned payment APIs in Python and Django serving 4,000 rps
- Moved reporting off a single Postgres instance onto a read replica
- Wrote the on-call runbook the team still uses

Software Engineer, Agency — Jul 2021 to Dec 2022
- Shipped internal dashboards in React against a REST API
- Automated the weekly billing export with SQL and cron

SKILLS
Python, Django, Postgres, SQL, AWS, Docker, React, Git

EDUCATION
B.E. Computer Science, Visvesvaraya Technological University, 2021
`.trim()

const READ = { currentTitle: 'Backend Engineer', yearsExperience: 3 } as const

/** Spread across the functions the index actually carries, best first. */
const FUNCTIONS = ['engineering', 'data', 'product', 'design', 'operations']

async function main(): Promise<void> {
  const db = createServiceClient()

  // ---- the two exclusion sets, rebuilt from data -------------------------
  const places = new Set<string>()
  for (const c of CITIES) {
    places.add(c.name.toLowerCase())
    for (const a of c.aliases ?? []) places.add(String(a).toLowerCase())
  }
  for (const st of INDIAN_STATES) places.add(st.toLowerCase())

  const employers = new Set<string>()
  const addEmployer = (name: string | null | undefined) => {
    if (!name) return
    for (const w of name.split(/[\s,.\-()&]+/)) {
      const t = w.trim().toLowerCase()
      if (t.length >= 3) employers.add(t)
    }
  }
  type Board = { company_name?: string }
  for (const b of JSON.parse(readFileSync('registry/boards.json', 'utf8')) as Board[]) {
    addEmployer(b.company_name)
  }

  // ---- five real postings, one per function ------------------------------
  type Row = { title: string; description: string; company_name: string | null; function: string | null }
  const postings: Row[] = []
  for (const fn of FUNCTIONS) {
    const { data, error } = await db
      .from('roles')
      .select('title, description, company_name, function')
      .eq('function', fn)
      .not('description', 'is', null)
      .limit(25)
    if (error) throw new Error(`${fn}: ${error.message}`)
    // Longest of the batch: a 200-character stub tests nothing.
    const best = ((data ?? []) as Row[])
      .filter((r) => (r.description ?? '').length >= 800)
      .sort((a, b) => b.description.length - a.description.length)[0]
    if (best) postings.push(best)
  }

  if (postings.length < 5) {
    // Fall back to any five long postings rather than reporting on three.
    const { data } = await db
      .from('roles')
      .select('title, description, company_name, function')
      .not('description', 'is', null)
      .limit(40)
    for (const r of (data ?? []) as Row[]) {
      if (postings.length >= 5) break
      if ((r.description ?? '').length < 800) continue
      if (postings.some((p) => p.title === r.title)) continue
      postings.push(r)
    }
  }

  console.log(`\n${postings.length} real postings from the live index\n${'='.repeat(72)}`)

  const offenders: { posting: string; row: string; term: string; why: string }[] = []
  let totalTerms = 0
  let totalPresent = 0

  for (const p of postings) {
    const { rows, gaps, unknowns } = buildGapTable({
      jdText: p.description,
      jdTitle: p.title,
      targetRole: 'Backend Engineer',
      resumeText: RESUME,
      read: READ,
    })

    console.log(`\n▸ ${p.title}`)
    console.log(`  ${p.company_name ?? 'unknown employer'} · ${p.function ?? 'unclassified'} · ${p.description.length} chars`)
    console.log(`  ${'-'.repeat(68)}`)
    console.log(`  ${'DIMENSION'.padEnd(18)}${'THIS JOB'.padEnd(20)}${'YOUR RÉSUMÉ'.padEnd(20)}STATUS`)

    for (const r of rows) {
      console.log(
        `  ${r.label.padEnd(18)}${(r.job ?? '— does not say').padEnd(20).slice(0, 20)}` +
          `${(r.resume ?? '— nothing read').padEnd(20).slice(0, 20)}${r.status}`,
      )
      if (r.evidence) console.log(`      quoted: "${r.evidence.trim().slice(0, 90)}"`)
      if (r.terms?.length) {
        const shown = r.terms
          .slice(0, 14)
          .map((t) => `${t.present ? '✓' : '·'}${t.term}${t.boards ? `(${t.boards})` : ''}`)
          .join('  ')
        console.log(`      ${shown}${r.terms.length > 14 ? `  … +${r.terms.length - 14}` : ''}`)
        totalTerms += r.terms.length
        totalPresent += r.terms.filter((t) => t.present).length
        for (const t of r.terms) flag(t.term, r, p)
      }
    }
    console.log(`  → ${gaps} gaps, ${unknowns} the posting is silent on`)
  }

  function flag(term: string, r: GapRow, p: Row) {
    const k = term.toLowerCase()
    if (places.has(k)) offenders.push({ posting: p.title, row: r.label, term, why: 'PLACE' })
    else if (employers.has(k)) offenders.push({ posting: p.title, row: r.label, term, why: 'EMPLOYER' })
  }

  console.log(`\n${'='.repeat(72)}`)
  console.log(`${totalTerms} terms shown across ${postings.length} postings`)

  /**
   * ⚠️ THE POSITIVE CONTROL. "0 of your terms are on this résumé" is exactly
   * what a BROKEN `namesTerm()` prints, and it is indistinguishable from an
   * honest answer about a poorly matched candidate — the same trap migration
   * 0026's RLS check fell into, where the assertion passed identically whether
   * the policy worked or the migration had never run. So the script proves the
   * ✓ path fires by building a résumé out of the posting's own terms.
   */
  const control = buildGapTable({
    jdText: postings[0].description,
    jdTitle: postings[0].title,
    resumeText: (buildGapTable({
      jdText: postings[0].description,
      jdTitle: postings[0].title,
      resumeText: '',
      read: {},
    }).rows.find((r) => r.id === 'skills')?.terms ?? []).map((t) => t.term).join(', '),
    read: {},
  })
  const controlRow = control.rows.find((r) => r.id === 'skills')
  const controlTerms = controlRow?.terms ?? []
  const controlHit = controlTerms.filter((t) => t.present).length
  if (controlTerms.length > 0 && controlHit === controlTerms.length) {
    console.log(`✅ positive control: ${controlHit}/${controlTerms.length} terms found when the résumé IS the posting's terms`)
  } else {
    console.log(`❌ positive control FAILED: ${controlHit}/${controlTerms.length} — namesTerm() is not matching`)
    process.exitCode = 1
  }
  console.log(`   (the real résumé above matched ${totalPresent} of ${totalTerms}, which is a fit question, not a bug)`)

  if (offenders.length === 0) {
    console.log('✅ no place or company name appeared in any row — TASK-083 gate PASSES')
  } else {
    console.log(`❌ ${offenders.length} place or company names appeared — TASK-083 gate FAILS`)
    for (const o of offenders) console.log(`   ${o.why.padEnd(9)}${o.term.padEnd(20)}${o.row} · ${o.posting}`)
    process.exitCode = 1
  }
  console.log()
}

void main()
