/**
 * The ATS benchmark. Run: `npm run bench`
 *
 * WHY THIS EXISTS. The checker was rebuilt six times without anyone being able
 * to say whether a change made scoring better or worse, because the only
 * fixtures were one toy résumé and the PDF test asserted a single field that a
 * substring scan could find. The suite stayed green while the parser was blind.
 * Nothing in src/ should change again without this printing a delta.
 *
 * It grades two different things, and the distinction matters:
 *   ACCURACY  — did we recover the facts the manifest says are in the document?
 *   INVARIANCE — do documents in the same `group` (one résumé, several layouts)
 *                produce the same score? This is the property that was broken:
 *                one résumé scored 34 as a PDF and 65 as a .docx.
 *
 * Real résumés live in bench/corpus/real/ and are NEVER committed — they are
 * third-party personal data and this repo deletes uploaded source files after
 * parsing. Only the synthetic corpus is tracked.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pdfToLayout } from '../src/lib/parse/pdf'
import { columnSample } from '../src/lib/parse/layout'
import { docxToText } from '../src/lib/parse/docx'
import { parseSections } from '../src/lib/parse/sections'
import { checkResume, type LayoutFacts } from '../src/lib/ats-check'

const ROOT = join(import.meta.dirname, '..', 'bench')
const CORPUS = join(ROOT, 'corpus')
const SNAP = join(ROOT, 'snapshots', 'latest.json')

/** The invariance gate. Two layouts of one résumé may differ by at most this. */
const PARITY_TOLERANCE = 3

type Expect = {
  group?: string
  columns?: number
  experienceEntries?: number
  educationEntries?: number
  skillsAtLeast?: number
  name?: string
  email?: string
  /** Findings this document MUST raise — a layout defect we want caught. */
  expectFindings?: string[]
  /** Findings this document must NOT raise — a clean layout wrongly flagged. */
  forbidFindings?: string[]
}
type Row = {
  doc: string
  group: string
  lines: number
  score: number
  experience: number
  education: number
  skills: number
  unplaced: number
  name: string | null
  email: string | null
  columns: number
  /** The document has no text layer at all — an ATS reads it as blank. */
  noText: boolean
  findings: string[]
  misses: string[]
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(pdf|docx)$/i.test(e) ? [p] : []
  })
}

/** Text plus, for a PDF, the geometry the checker now takes as an argument. */
async function read(path: string): Promise<{ text: string; layout?: LayoutFacts }> {
  const buf = readFileSync(path)
  if (!path.toLowerCase().endsWith('.pdf')) return { text: await docxToText(buf) }
  const doc = await pdfToLayout(buf)
  return {
    text: doc.pages.map((p) => p.lines.map((l) => l.text).join('\n')).join('\n').trim(),
    layout: {
      columns: Math.max(1, ...doc.pages.map((p) => p.columns)),
      alignedColumns: Math.max(0, ...doc.pages.map((p) => p.alignedColumns)),
      pages: doc.pages.length,
      sample: columnSample(doc),
    },
  }
}

async function run(): Promise<void> {
  const manifest: { documents: Record<string, Expect> } = JSON.parse(
    readFileSync(join(ROOT, 'manifest.json'), 'utf8'),
  )
  const files = walk(CORPUS).sort()
  if (files.length === 0) {
    console.error('No documents in bench/corpus/. Run `npm run bench:fixtures` first.')
    process.exit(1)
  }

  const rows: Row[] = []
  for (const file of files) {
    const doc = relative(CORPUS, file)
    const want = manifest.documents[doc] ?? {}
    const { text, layout } = await read(file)
    const s = parseSections(text)
    const misses: string[] = []
    let score = 0
    let noText = false
    try {
      score = checkResume(text, undefined, layout).readability.score
    } catch {
      /**
       * Not a miss — a RESULT. A document the checker refuses is usually one
       * with no text layer at all ("Microsoft Print to PDF" paints words as
       * shapes), which is the most severe thing a résumé can be and scores zero
       * everywhere. Recording it as a benchmark failure would hide the finding
       * inside the harness instead of measuring it.
       */
      score = 0
      noText = text.trim().length < 50
    }
    const lines = text.split('\n').filter((l) => l.trim()).length

    const check = (label: string, got: unknown, exp: unknown, ok: boolean) => {
      if (exp !== undefined && !ok) misses.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(exp)}`)
    }
    check('columns', layout?.columns ?? 1, want.columns, (layout?.columns ?? 1) === want.columns)
    check('experience', s.experience.length, want.experienceEntries, s.experience.length === want.experienceEntries)
    check('education', s.education.length, want.educationEntries, s.education.length === want.educationEntries)
    check('skills', s.skills.length, want.skillsAtLeast, s.skills.length >= (want.skillsAtLeast ?? 0))
    check('name', s.contact.name, want.name, s.contact.name === want.name)
    const ids = (() => { try { return checkResume(text, undefined, layout).findings.map((x) => x.id) } catch { return [] } })()
    for (const id of want.expectFindings ?? []) if (!ids.includes(id)) misses.push(`expected finding \`${id}\`, not raised`)
    for (const id of want.forbidFindings ?? []) if (ids.includes(id)) misses.push(`forbidden finding \`${id}\` was raised`)
    check('email', s.contact.email, want.email, s.contact.email === want.email)

    rows.push({
      doc, group: want.group ?? doc, lines, score,
      experience: s.experience.length, education: s.education.length,
      skills: s.skills.length, unplaced: s.unplaced,
      name: s.contact.name, email: s.contact.email,
      columns: layout?.columns ?? 1,
      noText,
      findings: (() => { try { return checkResume(text, undefined, layout).findings.map((f) => f.id) } catch { return [] } })(),
      misses,
    })
  }

  // ---- report -------------------------------------------------------------
  const w = Math.max(...rows.map((r) => r.doc.length), 12)
  console.log('\n' + 'DOCUMENT'.padEnd(w) + '  SCORE  LINES  COL   EXP  EDU  SKL  UNPL  ACCURACY')
  console.log('-'.repeat(w + 46))
  for (const r of rows) {
    console.log(
      r.doc.padEnd(w) +
        String(r.score).padStart(7) + String(r.lines).padStart(7) + String(r.columns).padStart(5) +
        String(r.experience).padStart(6) + String(r.education).padStart(5) +
        String(r.skills).padStart(5) + String(r.unplaced).padStart(6) +
        '  ' + (r.noText ? 'NO TEXT LAYER' : r.misses.length === 0 ? 'ok' : `${r.misses.length} miss`),
    )
  }

  for (const r of rows.filter((x) => x.misses.length)) {
    console.log(`\n  ${r.doc}`)
    for (const m of r.misses) console.log(`    - ${m}`)
  }

  // ---- invariance gate ----------------------------------------------------
  console.log('\nINVARIANCE — one résumé, several layouts')
  const groups = new Map<string, Row[]>()
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r])
  let failed = 0
  for (const [g, members] of groups) {
    if (members.length < 2) continue
    const scores = members.map((m) => m.score)
    const spread = Math.max(...scores) - Math.min(...scores)
    const ok = spread <= PARITY_TOLERANCE
    if (!ok) failed++
    console.log(
      `  ${g.padEnd(12)} spread ${String(spread).padStart(3)} pts  (${scores.join(', ')})  ` +
        `${ok ? 'PASS' : `FAIL — tolerance is ${PARITY_TOLERANCE}`}`,
    )
  }

  // ---- snapshot + delta ---------------------------------------------------
  const now = Object.fromEntries(rows.map((r) => [r.doc, { score: r.score, experience: r.experience, lines: r.lines }]))
  if (existsSync(SNAP)) {
    const prev = JSON.parse(readFileSync(SNAP, 'utf8')) as typeof now
    const deltas = rows
      .map((r) => ({ doc: r.doc, from: prev[r.doc]?.score, to: r.score }))
      .filter((d) => d.from !== undefined && d.from !== d.to)
    if (deltas.length) {
      console.log('\nDELTA since last run')
      for (const d of deltas) {
        const sign = d.to > d.from! ? '+' : ''
        console.log(`  ${d.doc.padEnd(w)}  ${d.from} → ${d.to}  (${sign}${d.to - d.from!})`)
      }
    } else {
      console.log('\nDELTA since last run: none')
    }
  }
  writeFileSync(SNAP, JSON.stringify(now, null, 2) + '\n')

  // ---- distribution -------------------------------------------------------
  /**
   * ⚠️ THE NUMBER THIS WHOLE REBUILD IS JUDGED ON, AND THE ONE NOBODY WAS
   * WATCHING. A scorer can be invariant, accurate and still useless if every
   * résumé lands within five points of every other — which is precisely what
   * the old flat model did once its saturation floor was reached. Spread is not
   * a nice-to-have here: a score that does not move when the document changes
   * teaches the candidate nothing.
   *
   * The weights in ats-check.ts (PARSE_WEIGHT, CATEGORY_WEIGHT,
   * SEVERITY_CATEGORY_COST) are PROVISIONAL and are meant to be set from this
   * line, against the real corpus in bench/corpus/real/ — not by taste. With
   * only the synthetic corpus loaded, treat the figure as a smoke test.
   */
  // Documents with no text layer are excluded: their zero says nothing about
  // how well the scorer discriminates, and it would drag the mean two ways.
  const scores = rows.filter((r) => !r.noText).map((r) => r.score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const sd = Math.sqrt(scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length)
  console.log(
    `\nDISTRIBUTION  min ${Math.min(...scores)} · mean ${mean.toFixed(1)} · max ${Math.max(...scores)} · sd ${sd.toFixed(1)}` +
      (rows.length < 10 ? '   (synthetic only — not a basis for tuning weights)' : ''),
  )

  const blank = rows.filter((r) => r.noText)
  if (blank.length) {
    console.log(`\nNO TEXT LAYER — an ATS reads these as blank (${blank.length})`)
    for (const b of blank) console.log(`  ${b.doc}`)
  }

  const accuracyFails = rows.filter((r) => r.misses.length).length
  console.log(
    `\n${rows.length} documents · ${accuracyFails} with accuracy misses · ${failed} invariance group(s) failing\n`,
  )
  if (process.argv.includes('--gate') && (accuracyFails > 0 || failed > 0)) process.exit(1)
}

run().catch((e) => { console.error(e); process.exit(1) })
