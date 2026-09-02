/**
 * TASK-019 — run the whole fixture through the gate engine and print both lists.
 *
 * This is the product's first proof: the refusal in text form, before any screen
 * exists. If the reasons printed here cannot be checked by hand against the
 * source job descriptions, the gate is wrong and no amount of UI will fix it.
 */
import { readFileSync } from 'node:fs'
import { evaluate } from '../src/gates/evaluate'
import { extractAll, resolveInIndia } from '../src/gates/extract'
import type { CandidateProfile, GateResult } from '../src/gates/types'

type RawRole = {
  provider: string; company: string; externalId: string; title: string
  locationRaw: string; description: string; applyUrl: string; postedAt: string | null
}

const roles: RawRole[] = JSON.parse(readFileSync('ingest/fixtures/seed-roles.json', 'utf8'))

const PROFILES: { name: string; note: string; profile: CandidateProfile }[] = [
  {
    name: 'Rohan',
    note: 'engineering · 2 years · Bengaluru · no credential',
    profile: { yearsExperience: 2, fn: 'engineering', city: 'Bengaluru', credential: 'none' },
  },
  {
    name: 'Arjun',
    note: 'finance · 2 years post-qualification · Mumbai · no credential recorded',
    profile: { yearsExperience: 2, fn: 'finance', city: 'Mumbai', credential: 'none' },
  },
]

const bar = (s: string) => `\n${s}\n${'─'.repeat(74)}`

for (const { name, note, profile } of PROFILES) {
  const inIndia = roles.filter((r) => resolveInIndia(r.locationRaw))
  const results: { role: RawRole; result: GateResult }[] = inIndia.map((role) => ({
    role,
    result: evaluate(profile, extractAll(role.description, role.locationRaw)),
  }))

  const cleared = results.filter((r) => r.result.outcome === 'cleared')
  const stretch = results.filter((r) => r.result.outcome === 'stretch')
  const withheld = results.filter((r) => r.result.outcome === 'withheld')

  console.log(bar(`${name} — ${note}`))
  console.log(
    `${roles.length} indexed · ${inIndia.length} in India · ` +
      `${cleared.length} cleared · ${stretch.length} stretch · ${withheld.length} withheld`
  )

  console.log(`\n  CLEARED (${cleared.length}) — first 5`)
  for (const { role, result } of cleared.slice(0, 5)) {
    console.log(`    ${role.title} · ${role.company}`)
    console.log(`      ${result.score}% — ${result.reason}`)
  }

  if (stretch.length) {
    console.log(`\n  STRETCH (${stretch.length}) — first 3`)
    for (const { role, result } of stretch.slice(0, 3)) {
      console.log(`    ${role.title} · ${role.company}  [${result.gapYears}y gap]`)
      console.log(`      ${result.reason}`)
    }
  }

  console.log(`\n  WITHHELD (${withheld.length}) — first 6, with the reason to check by hand`)
  for (const { role, result } of withheld.slice(0, 6)) {
    console.log(`    ${role.title} · ${role.company}`)
    console.log(`      ${result.reason}`)
  }

  const byReason: Record<string, number> = {}
  for (const { result } of withheld) {
    const k = result.refusedOn ?? 'unknown'
    byReason[k] = (byReason[k] ?? 0) + 1
  }
  console.log(`\n  refusals by reason: ${JSON.stringify(byReason)}`)
}
console.log()
