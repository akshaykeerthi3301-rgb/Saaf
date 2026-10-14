/**
 * Runs the parsing engine over every résumé in the local test directories and writes two reports to output/reports/:
 *   parser_comprehensive_audit.md   success rates, failures, layout-collision suspects, internship isolation
 *   pilot_audit_sheet.csv           the founder's 9 résumés, raw line beside parsed value, blank verdict columns
 *
 *   npm run audit:fixtures   # once: builds image-only PDFs from the synthetic résumés
 *   npm run audit:parse      # deterministic (no model, no network)
 *   npm run audit:parse -- --model   # also asks the model for skills (spends Groq/Gemini tokens)
 *
 * ⚠️ BOTH OUTPUTS HOLD REAL PEOPLE'S DATA AND ARE GIT-IGNORED (output/). The .md prints numbers and flags, never
 * names or employers; real documents appear as real-1…real-9. The .csv is the one place content appears, because the
 * founder has to read it — and it is the founder's own résumés.
 *
 * ⚠️ tests/fixtures/resumes/indian_volunteers/ IS EMPTY UNTIL SOMEONE COLLECTS CONSENTING VOLUNTEERS' FILES. The report
 * says so in its first section instead of letting a green run imply Indian coverage it does not have.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { parseResume, ResumeFileError, PARSER_VERSION } from '../src/lib/parse/engine'
import type { ParsedResume } from '../src/lib/types/parsed-resume'
import { scoreDoc, byField, type Check, type Row as ScoreRow } from '../bench/score-parse'
import type { Gold } from '../bench/make-stress'

const ROOT = process.cwd()
const useModel = process.argv.includes('--model')
const REPORTS = join(ROOT, 'output/reports')

const SETS = [
  { label: 'indian_volunteers', dir: 'tests/fixtures/resumes/indian_volunteers' },
  { label: 'scanned', dir: 'tests/fixtures/resumes/scanned' },
  { label: 'bench/synthetic', dir: 'bench/corpus/synthetic' },
  { label: 'bench/stress', dir: 'bench/corpus/stress' },
  { label: 'bench/samples', dir: 'bench/corpus/samples' },
  { label: 'bench/real (pilot 9)', dir: 'bench/corpus/real' },
] as const

// Step 1 — directories verified or created.
for (const d of ['tests/fixtures/resumes/indian_volunteers', 'tests/fixtures/resumes/scanned', 'output/reports']) {
  const p = join(ROOT, d)
  const had = existsSync(p)
  mkdirSync(p, { recursive: true })
  console.log(`${had ? 'ok     ' : 'created'} ${d}`)
}

type Kind = 'pdf' | 'docx' | 'image'
const KINDS: Record<string, Kind> = { '.pdf': 'pdf', '.docx': 'docx', '.png': 'image', '.jpg': 'image', '.jpeg': 'image' }

type Row = {
  set: string
  id: string // display id — real documents are anonymised in the .md
  file: string
  kind: Kind
  ms: number
  text: string
  result: ParsedResume | null
  error: string | null
  /** Known answers, for the documents that have them (bench/golden/stress.json). */
  gold?: Gold & { heldout: boolean }
  checks?: Check[]
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ')}"`
const lineWith = (text: string, value: string | null | undefined) => {
  if (!value) return ''
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return (text.split('\n').find((l) => n(l).includes(n(value))) ?? '').trim().slice(0, 200)
}
const ym = (p: { y: number; m: number | null } | null) => (p ? `${p.y}${p.m ? '-' + String(p.m).padStart(2, '0') : ''}` : '')
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${Math.round((100 * n) / d)}% (${n}/${d})`)

const GOLD_PATH = join(ROOT, 'bench/golden/stress.json')
const GOLD: { as_of: string; docs: Record<string, Gold & { heldout: boolean }> } | null = existsSync(GOLD_PATH) ? JSON.parse(readFileSync(GOLD_PATH, 'utf8')) : null

async function main() {
  const rows: Row[] = []
  const emptySets: string[] = []
  for (const set of SETS) {
    const dir = join(ROOT, set.dir)
    const files = readdirSync(dir).filter((f) => KINDS[extname(f).toLowerCase()] && statSync(join(dir, f)).isFile()).sort()
    if (files.length === 0) emptySets.push(set.label)
    for (const [i, f] of files.entries()) {
      const kind = KINDS[extname(f).toLowerCase()]
      let text = ''
      const t0 = Date.now()
      let result: ParsedResume | null = null
      let error: string | null = null
      const gold = set.label === 'bench/stress' ? GOLD?.docs[f] : undefined
      let checks: Check[] | undefined
      try {
        // Labelled documents are parsed "as of" the date their answers were computed for; everything else as of today.
        result = await parseResume(readFileSync(join(dir, f)), { useModel, asOf: gold && GOLD ? new Date(`${GOLD.as_of}T00:00:00Z`) : undefined, onText: (t) => (text = t) })
        if (gold) checks = scoreDoc(gold, result)
      } catch (e) {
        error = e instanceof ResumeFileError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message.split('\n')[0].slice(0, 200) : String(e)
      }
      const ms = Date.now() - t0
      rows.push({ set: set.label, id: set.label.startsWith('bench/real') ? `real-${i + 1}` : f, file: f, kind, ms, text, result, error, gold, checks })
      console.log(`${error ? 'FAIL' : 'ok  '} ${set.label.padEnd(22)} ${(set.label.startsWith('bench/real') ? `real-${i + 1}` : f).padEnd(34)} ${ms} ms${error ? '  ' + error : ''}`)
    }
  }

  // ---------- markdown ----------
  const ok = rows.filter((r) => r.result)
  const failed = rows.filter((r) => !r.result)
  const md: string[] = []
  md.push(`# Parser comprehensive audit`, '', `Parser version \`${PARSER_VERSION}\` · run ${new Date().toISOString()} · model ${useModel ? 'ON' : 'off (deterministic only)'} · ${rows.length} documents`, '')
  md.push('## 0. Coverage of the corpus — read this before the numbers', '')
  md.push(`| Directory | Documents |`, `|---|---|`)
  for (const set of SETS) md.push(`| ${set.label} | ${rows.filter((r) => r.set === set.label).length} |`)
  md.push('')
  if (emptySets.includes('indian_volunteers')) {
    md.push('> ⚠️ **`indian_volunteers/` holds 0 documents.** No consenting volunteers\' résumés have been collected, so **nothing in this report measures Indian-résumé accuracy beyond the founder\'s own 9.** The remaining sets are synthetic (one invented career in several layouts), public university samples (US-centric), and the founder\'s own.', '')
  }
  md.push('## 1. Outcome', '', '| Set | Parsed | Schema-valid | Crashed | OCR used | Median ms |', '|---|---|---|---|---|---|')
  for (const set of SETS) {
    const rs = rows.filter((r) => r.set === set.label)
    if (rs.length === 0) continue
    const ms = rs.map((r) => r.ms).sort((a, b) => a - b)
    md.push(`| ${set.label} | ${pct(rs.filter((r) => r.result).length, rs.length)} | ${pct(rs.filter((r) => r.result).length, rs.length)} | ${rs.filter((r) => !r.result).length} | ${rs.filter((r) => r.result?.meta.ocr_used).length} | ${ms[Math.floor(ms.length / 2)]} |`)
  }
  md.push('', '"Schema-valid" equals "Parsed" by construction: the engine validates its own output with Zod and throws on a violation, so a schema failure appears under §5 as a crash.', '')

  md.push('## 2. What was found (coverage, not accuracy — computed over the real-world-like documents only, not the invented stress careers; accuracy is §8)', '')
  const okReal = ok.filter((r) => r.set !== 'bench/stress')
  const exp = okReal.flatMap((r) => r.result!.experience)
  const cov = (label: string, n: number, d: number) => md.push(`| ${label} | ${pct(n, d)} |`)
  md.push('| Probe | Result |', '|---|---|')
  cov('Documents with a current-or-latest role', okReal.filter((r) => r.result!.derived.latest_role?.title || r.result!.derived.latest_role?.employer).length, okReal.length)
  cov('…of which dated "currently working" (open-ended role)', okReal.filter((r) => r.result!.derived.current_role).length, okReal.length)
  cov('Documents with total experience > 0 months', okReal.filter((r) => r.result!.derived.total_experience_months > 0).length, okReal.length)
  cov('Professional entries with usable dates', exp.filter((e) => e.months).length, exp.length)
  cov('Professional entries with title AND employer', exp.filter((e) => e.title && e.employer).length, exp.length)
  cov('Documents with ≥ 1 education entry', okReal.filter((r) => r.result!.education.length > 0).length, okReal.length)
  cov('Documents with ≥ 1 skill', okReal.filter((r) => r.result!.skills.length > 0).length, okReal.length)
  cov('Documents with a summary', okReal.filter((r) => r.result!.summary).length, okReal.length)
  cov('Documents with ≥ 1 certification line', okReal.filter((r) => r.result!.certifications.length > 0).length, okReal.length)
  md.push('')

  md.push('## 3. Internship isolation (rule B)', '')
  const withIntern = ok.filter((r) => r.result!.internships.length > 0)
  const leaked = ok.filter((r) => r.result!.experience.some((e) => e.is_internship) || r.result!.internships.some((e) => e.counts_toward_total))
  md.push(`- Documents with ≥ 1 internship entry: **${withIntern.length}** of ${ok.length}; internship entries: **${ok.reduce((n, r) => n + r.result!.internships.length, 0)}**; project entries kept out of the total: **${ok.reduce((n, r) => n + r.result!.projects.length, 0)}**.`)
  md.push(`- **Leaks (an internship in \`experience\`, or an internship marked as counted): ${leaked.length}.** ${leaked.length === 0 ? 'None.' : 'Must be 0 — see: ' + leaked.map((r) => r.id).join(', ')}`)
  md.push(`- Months kept out of the headline number: ${ok.reduce((n, r) => n + r.result!.derived.internship_months, 0)} (sum over documents).`)
  md.push('- "Trainee" alone is **not** treated as an internship (a Graduate Engineer Trainee is salaried); each such case carries the flag `trainee_role_counted` — see §6.', '')

  md.push('## 4. Layout collision suspects', '', 'A document is listed when the layout reader saw ≥ 2 columns (for scans, the columns the OCR word boxes form) **and** at least one entry lacks a title, employer or dates — the signature of text from two columns being interleaved. It is a *suspect* list, not a verdict.', '')
  const collide = ok.filter((r) => {
    const x = r.result!
    return x.meta.layout_columns >= 2 && [...x.experience, ...x.internships].some((e) => !e.title || !e.employer || !e.dates_raw)
  })
  if (collide.length === 0) md.push('None.')
  else {
    md.push('| Document | Columns | Entries lacking title/employer/dates |', '|---|---|---|')
    for (const r of collide) md.push(`| ${r.id} | ${r.result!.meta.layout_columns} | ${[...r.result!.experience, ...r.result!.internships].filter((e) => !e.title || !e.employer || !e.dates_raw).length} |`)
  }
  const noEntries = ok.filter((r) => r.result!.meta.chars >= 400 && r.result!.experience.length + r.result!.internships.length + r.result!.projects.length === 0)
  md.push('', `Documents with ≥ 400 characters of text but **no role found at all** (a parse miss, whatever the cause): **${noEntries.length}**${noEntries.length ? ' — ' + noEntries.map((r) => r.id).join(', ') : ''}.`)
  md.push('', `Column counts seen: ${[1, 2, 3].map((c) => `${c}-col ${ok.filter((r) => r.result!.meta.layout_columns === c).length}`).join(' · ')} · 0 (no text layer) ${ok.filter((r) => r.result!.meta.layout_columns === 0).length}`, '')

  md.push('## 5. Failures', '')
  if (failed.length === 0) md.push('No document crashed the engine.')
  else {
    md.push('| Document | Kind | Error |', '|---|---|---|')
    for (const r of failed) md.push(`| ${r.id} | ${r.kind} | ${r.error} |`)
  }
  const noText = ok.filter((r) => r.result!.meta.chars < 50)
  const lowOcr = ok.filter((r) => r.result!.meta.ocr_confidence !== null && r.result!.meta.ocr_confidence < 60)
  md.push('', `- Documents with < 50 characters even after OCR: **${noText.length}**${noText.length ? ' — ' + noText.map((r) => r.id).join(', ') : ''}.`)
  md.push(`- OCR confidence < 60%: **${lowOcr.length}**${lowOcr.length ? ' — ' + lowOcr.map((r) => `${r.id} (${r.result!.meta.ocr_confidence}%)`).join(', ') : ''}.`)
  md.push(`- Documents rescued by OCR (text layer missing/garbled): **${ok.filter((r) => r.result!.meta.ocr_used && r.kind === 'pdf').length}** PDF(s).`, '')

  md.push('## 6. Flags raised', '')
  const flagCount = new Map<string, number>()
  for (const r of ok) for (const f of r.result!.derived.flags) flagCount.set(f, (flagCount.get(f) ?? 0) + 1)
  md.push('| Flag | Documents |', '|---|---|')
  for (const [f, n] of [...flagCount].sort((a, b) => b[1] - a[1])) md.push(`| ${f} | ${n} |`)
  if (flagCount.size === 0) md.push('| (none) | 0 |')
  md.push('', '## 7. Per document', '', '| Document | Set | Via | Cols | Prof. entries | Internships | Total months (low–high) | Current role? | Flags |', '|---|---|---|---|---|---|---|---|---|')
  for (const r of rows) {
    const x = r.result
    if (!x) { md.push(`| ${r.id} | ${r.set} | ${r.kind} | – | – | – | – | – | **FAILED** |`); continue }
    md.push(`| ${r.id} | ${r.set} | ${x.meta.text_source} | ${x.meta.layout_columns} | ${x.experience.length} | ${x.internships.length} | ${x.derived.total_experience_months} (${x.derived.total_experience_months_low}–${x.derived.total_experience_months_high}) | ${x.derived.current_role ? 'yes' : 'no'} | ${x.derived.flags.join(', ')} |`)
  }
  // ---------- accuracy on documents with known answers ----------
  const scored = rows.filter((r) => r.checks && r.gold)
  md.push('', '## 8. Accuracy on documents with known answers', '')
  if (scored.length === 0) md.push('No labelled documents were found (run `npm run bench:stress`).')
  else {
    const asRows = (xs: Row[]): ScoreRow[] => xs.map((r) => ({ file: r.file, career: r.gold!.career, rendering: '', checks: r.checks! }))
    const tally = (xs: Row[]) => {
      const c = xs.flatMap((r) => r.checks!)
      return { docs: xs.length, checks: c.length, right: c.filter((k) => k.verdict === 'right').length, wrong: c.filter((k) => k.verdict === 'wrong').length, absent: c.filter((k) => k.verdict === 'absent').length }
    }
    const dev = scored.filter((r) => !r.gold!.heldout)
    const held = scored.filter((r) => r.gold!.heldout)
    md.push('Every answer was declared by hand from an invented career (`bench/make-stress.ts`) and the expected month totals were computed by a different method from the engine\'s. **"Wrong" = a confident value that is not the truth; "absent" = the engine abstained.**', '', '| Set | Documents | Checks | Right | Wrong | Absent |', '|---|---|---|---|---|---|')
    for (const [label, xs] of [['Tuned against', dev], ['Held out (see note)', held]] as const) {
      const t = tally(xs)
      md.push(`| ${label} | ${t.docs} | ${t.checks} | ${pct(t.right, t.checks)} | ${t.wrong} | ${t.absent} |`)
    }
    md.push('', '> **Held-out note.** The held-out careers were written after the first 12 were tuned against, and run ONCE before any fix: **644 of 655 checks right (98.3%), 1 wrong, 10 absent.** Two general defects surfaced (a planned future end date was not read as "still employed here"; a header wrapped by a narrow column cut `Mar` from `2022-Present`) and were fixed, after which these careers became development data like the rest. The 100% shown here is therefore NOT a held-out result; the first-sight figure above is. A fresh held-out set and the founder\'s hand-checked sheet are the next honest measurements.', '')
    md.push('| Field | Right | Wrong | Absent |', '|---|---|---|---|')
    for (const f of byField(asRows(scored))) md.push(`| ${f.field} | ${f.right} | ${f.wrong} | ${f.absent} |`)
    const bad = scored.flatMap((r) => r.checks!.filter((k) => k.verdict !== 'right').map((k) => `${r.file} · ${k.field} · ${k.verdict} · ${k.detail ?? ''}`))
    md.push('', bad.length === 0 ? '**No failing checks.**' : '**Failing checks:**', ...bad.map((b) => `- ${b}`))
  }
  writeFileSync(join(REPORTS, 'parser_comprehensive_audit.md'), md.join('\n') + '\n')

  // ---------- pilot CSV ----------
  const pilot = rows.filter((r) => r.set.startsWith('bench/real') && r.result)
  const csv: string[] = [['document', 'section', 'item', 'field', 'raw_text_line', 'parsed_value', 'counted_in_total', 'founder_verdict (OK / WRONG / MISSING)', 'founder_correction'].map(csvCell).join(',')]
  const add = (r: Row, section: string, item: string, field: string, raw: string, parsed: string, counted = '') => csv.push([r.id, section, item, field, raw, parsed, counted, '', ''].map(csvCell).join(','))
  for (const r of pilot) {
    const x = r.result!
    const d = x.derived
    add(r, 'summary', '', 'current_role', lineWith(r.text, d.current_role?.title), d.current_role ? `${d.current_role.title ?? ''} @ ${d.current_role.employer ?? ''}` : '(none — no open-ended role)')
    add(r, 'summary', '', 'latest_role', lineWith(r.text, d.latest_role?.title), d.latest_role ? `${d.latest_role.title ?? ''} @ ${d.latest_role.employer ?? ''} [${d.latest_role.source}]` : '(none)')
    const basis = { dates: 'from the dates of every role', partial_dates: 'from the roles that HAVE dates (others are missing)', stated: "taken from the résumé's own 'N years' sentence — no role had dates", unknown: 'UNKNOWN — nothing to go on (0 here does not mean zero)' }[d.total_experience_basis]
    add(r, 'summary', '', 'total_experience', 'computed from dates', `${d.total_experience_months} months = ${d.total_experience_years} years (range ${d.total_experience_months_low}–${d.total_experience_months_high}); internships excluded: ${d.internship_months} months`)
    add(r, 'summary', '', 'how_total_was_found', d.stated_experience_years !== null ? `résumé says ${d.stated_experience_years} years` : '', basis)
    for (const g of d.gaps) add(r, 'gaps', `after ${g.after}`, 'career_gap', '', `${g.months} months with no role — ${g.reason === 'education' ? 'falls inside a period of study' : 'not explained by the résumé'} (not counted as experience)`)
    if (d.flags.length) add(r, 'summary', '', 'flags', '', d.flags.join(', '))
    if (x.meta.document_date) add(r, 'summary', '', 'file_last_saved', '', x.meta.document_date)
    add(r, 'contact', '', 'name / city', x.contact.name ? lineWith(r.text, x.contact.name) : '', `${x.contact.name ?? ''} / ${x.contact.city ?? ''}`)
    if (x.summary) add(r, 'summary', '', 'summary_text', x.summary.slice(0, 200), x.summary.slice(0, 200))
    const groups: [string, typeof x.experience][] = [['experience', x.experience], ['internship', x.internships], ['project', x.projects]]
    for (const [section, list] of groups) {
      list.forEach((e, i) => {
        const item = `${section} ${i + 1}`
        const counted = e.counts_toward_total ? 'YES' : 'no'
        add(r, section, item, 'title', lineWith(r.text, e.title), e.title ?? '', counted)
        add(r, section, item, 'employer', lineWith(r.text, e.employer), e.employer ?? '', counted)
        add(r, section, item, 'dates', e.dates_raw ?? '', e.dates_raw ? `${ym(e.start)} → ${e.is_open ? 'present' : ym(e.end)}${e.months ? ` = ${e.months.mid} months` : ''} (${e.date_precision})` : '(no dates found)', counted)
      })
    }
    x.education.forEach((e, i) => {
      add(r, 'education', `education ${i + 1}`, 'degree', lineWith(r.text, e.degree), e.degree)
      add(r, 'education', `education ${i + 1}`, 'institution', lineWith(r.text, e.institution), e.institution ?? '')
      add(r, 'education', `education ${i + 1}`, 'years', e.dates_raw ?? '', `${e.start_year ?? ''} – ${e.end_year ?? ''}`)
    })
    add(r, 'skills', '', `${x.skills.length} skills`, '', x.skills.join('; '))
    x.certifications.forEach((c, i) => add(r, 'certifications', `cert ${i + 1}`, 'name', c, c))
  }
  writeFileSync(join(REPORTS, 'pilot_audit_sheet.csv'), csv.join('\n') + '\n')
  console.log(`\nwrote output/reports/parser_comprehensive_audit.md (${rows.length} documents, ${failed.length} failed)`)
  console.log(`wrote output/reports/pilot_audit_sheet.csv (${pilot.length} pilot documents, ${csv.length - 1} rows)`)
  const wrongAnswers = rows.some((r) => r.checks?.some((k) => k.verdict !== 'right'))
  process.exit(failed.length > 0 || wrongAnswers ? 1 : 0)
}
main()
