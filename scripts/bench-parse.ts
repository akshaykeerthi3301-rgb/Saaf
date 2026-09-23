/**
 * The onboarding read, measured — what `parseResume()` would suggest as a
 * candidate's target role, for every document in bench/corpus/.
 *
 *   npm run bench:parse             # deterministic reader + live postings count
 *   npm run bench:parse -- --model  # also the model, as onboarding runs it (spends Groq tokens)
 *
 * ⚠️ THE ONE FAILURE THAT MUST STAY AT ZERO: suggesting a title that is not a
 * job. The public UW tech sample parsed "Hackfest" as the current title and the
 * confirm screen pre-filled it as the role (docs/QA-AUDIT.md QA-09). Documents
 * labelled `titleIsJob: false` in bench/manifest.json must get no suggestion;
 * the run exits non-zero if one does. `titleIsJob: true` without a suggestion
 * is reported, not failed — it means the index holds no posting for that
 * title, which is coverage, not a wrong answer.
 *
 * Same code path as the action: resumeFacts, mergeModelRead and
 * suggestedRoleFor are imported, not restated. The postings count is the one
 * call made differently — with the service role, because there is no signed-in
 * request here — but with the same function and arguments as
 * countMatchingRoles() in src/lib/services/shortlist.ts.
 *
 * `bench/corpus/real/` is the founder's own résumés and is never committed;
 * this prints their titles to the terminal only.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { pdfToText } from '../src/lib/parse/pdf'
import { docxToText } from '../src/lib/parse/docx'
import { resumeFacts, mergeModelRead } from '../src/lib/parse/facts'
import { readResumeWithModel } from '../src/lib/parse/llm'
import { suggestedRoleFor } from '../src/lib/taxonomy/roles'

const ROOT = join(process.cwd(), 'bench')
const CORPUS = join(ROOT, 'corpus')
const useModel = process.argv.includes('--model')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.(pdf|docx)$/i.test(e) ? [p] : []
  })
}

async function postingsFor(title: string): Promise<number | null> {
  if (!db) return null
  const { count, error } = await db
    .rpc('roles_for_candidates', { searches: [title], adjacent: false, max_rows: 100_000 }, { count: 'exact', head: true })
    .select('id')
  return error ? null : count ?? null
}

async function main(): Promise<void> {
  const manifest: { documents: Record<string, { titleIsJob?: boolean }> } = JSON.parse(
    readFileSync(join(ROOT, 'manifest.json'), 'utf8'),
  )
  const files = walk(CORPUS).sort()
  if (files.length === 0) {
    console.error('No documents in bench/corpus/. Run `npm run bench:fixtures` first.')
    process.exit(1)
  }
  if (!db) console.warn('No Supabase env — postings counts unavailable; the taxonomy fallback decides every suggestion.\n')

  let harmful = 0
  let withheld = 0
  let labelled = 0
  console.log(`MODE ${useModel ? 'deterministic + model' : 'deterministic only'}\n`)
  console.log(`${'DOCUMENT'.padEnd(30)} ${'TITLE READ'.padEnd(34)} ${'POSTINGS'.padStart(8)}  SUGGESTED`)
  console.log('-'.repeat(100))

  for (const path of files) {
    const doc = relative(CORPUS, path)
    const buf = readFileSync(path)
    const text = path.toLowerCase().endsWith('.pdf') ? await pdfToText(buf) : await docxToText(buf)
    if (text.trim().length < 50) {
      console.log(`${doc.padEnd(30)} (no text layer — onboarding asks them to type it in)`)
      continue
    }

    const deterministic = resumeFacts(text)
    let fields = deterministic.fields
    if (useModel) {
      const model = await readResumeWithModel(text)
      if (model) fields = mergeModelRead(deterministic, model).fields
    }

    const title = fields.currentTitle?.trim()
    const postings = title ? await postingsFor(title) : null
    const suggested = suggestedRoleFor(title, postings)

    const want = manifest.documents[doc]?.titleIsJob
    let verdict = ''
    if (want !== undefined) {
      labelled++
      if (!want && suggested) { harmful++; verdict = '  ✗ SUGGESTED A NON-JOB' }
      else if (want && !suggested) { withheld++; verdict = '  · real job, no postings — left for the candidate' }
      else verdict = '  ✓'
    }
    console.log(
      `${doc.padEnd(30)} ${(title ?? '—').slice(0, 34).padEnd(34)} ${String(postings ?? '—').padStart(8)}  ${suggested ?? '(left empty)'}${verdict}`,
    )
  }

  console.log(`\n${labelled} labelled · ${harmful} suggested a non-job · ${withheld} real jobs left for the candidate`)
  if (harmful > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
