/**
 * How often does the whole-document rewrite fail, and why?
 *
 *   npm run probe:rewrite            # 10 runs on the public UW tech sample
 *   npm run probe:rewrite -- 20      # a different count
 *   npm run probe:rewrite -- 4 35    # 4 runs, 35 s apart
 *
 * ⚠️ SPENDS GROQ FREE-TIER TOKENS — ~1,360 a run, against 8,000 a minute shared
 * with the live site. Runs are spaced 12 s apart so the probe does not starve
 * real candidates while it measures them.
 *
 * Written for TASK-105 (docs/QA-AUDIT.md QA-26): "Rewrite everything" failed
 * once on 2026-09-23 with the provider healthy and nothing logged. The rule is
 * measure before changing prompts or parsing, so this runs the same code the
 * action runs (parseSections, extractFields, roleVocabulary, rewriteResume) and
 * tallies each outcome by the `[model]` lines logModelFailure() now writes.
 * No résumé text is printed — only outcomes, kinds and timings.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pdfToText } from '../src/lib/parse/pdf'
import { parseSections } from '../src/lib/parse/sections'
import { extractFields } from '../src/lib/parse/extract'
import { roleVocabulary } from '../src/lib/ats-check'
import { rewriteResume } from '../src/lib/resume-rewrite'
import { ModelBusyError } from '../src/lib/parse/llm'
import type { CandidateFacts, RoleFacts } from '../src/lib/tailor'

const RUNS = Number(process.argv[2]) || 10
const SAMPLE = join(process.cwd(), 'bench/corpus/samples/uw-tech.pdf')
const SPACING_MS = (Number(process.argv[3]) || 12) * 1000

async function main(): Promise<void> {
  if (!existsSync(SAMPLE)) {
    console.error('bench/corpus/samples/uw-tech.pdf is missing — run `npm run bench:samples` first.')
    process.exit(1)
  }
  const text = await pdfToText(readFileSync(SAMPLE))
  const sections = parseSections(text)
  const d = extractFields(text).fields
  const facts: CandidateFacts = {
    currentTitle: d.currentTitle ?? null,
    employer: d.employer ?? null,
    yearsExperience: d.yearsExperience ?? null,
    skills: [],
    domain: null,
    credential: d.credential ?? null,
  }
  const vocabulary = roleVocabulary('Data Analyst')
  const role: RoleFacts = {
    title: 'Data Analyst',
    company: '',
    description: vocabulary ? `Postings for this role commonly use these terms: ${vocabulary.terms.join(', ')}.` : null,
  }

  // Each run's [model] lines — provider, kind and status only. A run can
  // SUCCEED with lines logged: the first provider failed and the fallback
  // answered, which is the slow case worth seeing.
  let kinds: Record<string, number> = {}
  let attempts: string[] = []
  const warn = console.warn
  console.warn = (msg: unknown) => {
    const line = String(msg)
    if (!line.startsWith('[model] ')) return
    const e = JSON.parse(line.slice(8)) as { kind: string; provider: string; status?: number; code?: string; ms?: number }
    kinds[e.kind] = (kinds[e.kind] ?? 0) + 1
    attempts.push(`${e.provider} ${e.kind}${e.status ? ` ${e.status}` : ''}${e.code ? ` ${e.code}` : ''}${e.ms !== undefined ? ` after ${(e.ms / 1000).toFixed(1)} s` : ''}`)
  }

  const outcomes: Record<string, number> = {}
  const times: number[] = []
  for (let i = 0; i < RUNS; i++) {
    kinds = {}
    attempts = []
    const t0 = Date.now()
    let outcome: string
    try {
      const res = await rewriteResume({ sections, facts, role })
      outcome = res
        ? `ok — ${res.changes.filter((c) => c.kept).length} lines rewritten, ${res.changes.filter((c) => !c.kept).length} reverted by the guard`
        : `failed (${Object.keys(kinds).join('+') || 'no log'})`
    } catch (e) {
      outcome = e instanceof ModelBusyError ? 'busy (every provider rate-limited)' : `threw ${(e as Error).name}`
    }
    const ms = Date.now() - t0
    times.push(ms)
    const bucket = outcome.startsWith('ok') ? 'ok' : outcome
    outcomes[bucket] = (outcomes[bucket] ?? 0) + 1
    warn(`run ${String(i + 1).padStart(2)}: ${outcome.padEnd(52)} ${(ms / 1000).toFixed(1)} s${attempts.length ? `   [${attempts.join('; ')}]` : ''}`)
    for (const a of attempts) {
      const key = `attempt failed: ${a.replace(/ after .*/, '')}`
      outcomes[key] = (outcomes[key] ?? 0) + 1
    }
    if (i < RUNS - 1) await new Promise((r) => setTimeout(r, SPACING_MS))
  }
  console.warn = warn

  times.sort((a, b) => a - b)
  console.log(`\n${RUNS} runs · median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)} s`)
  for (const [k, n] of Object.entries(outcomes).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${k}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
