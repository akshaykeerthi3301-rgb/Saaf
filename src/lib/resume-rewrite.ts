import { callJsonModel, type Provider } from '@/lib/parse/llm'
import { groundingFailure, type CandidateFacts, type RoleFacts } from '@/lib/tailor'
import type { ResumeSections } from '@/lib/parse/sections'

/**
 * Rewrite a candidate's own résumé against a role — and, when they pasted one,
 * a specific job description.
 *
 * ⚠️ THE UNIT OF WORK IS A LINE THE CANDIDATE ALREADY WROTE. This never
 * composes a résumé; it rewrites one, bullet by bullet, and every rewritten
 * line is checked against the line it came from. src/lib/tailor.ts drafts NEW
 * material from a profile and drops anything it cannot ground — right for a
 * cover note, wrong here, because the raw material is the document itself.
 *
 * ⚠️ WHY groundingFailure() ALONE WOULD DESTROY THIS FEATURE. Its metric rule
 * rejects any bullet stating a figure, because a profile holds skills and
 * years, not achievements — so a figure in a drafted cover note is invented by
 * definition. A RÉSUMÉ is the opposite case: "lifted completion by 14% across
 * 40,000 merchants" is the single most valuable line on the page and the guard
 * would remove it, along with every other quantified bullet, leaving a rewrite
 * measurably worse than the original. That is not a hypothetical — it is the
 * defect commit 7fc6c36 fixed on the JD tailoring path, arriving again through
 * a different door.
 *
 * ⚠️ THE FIX IS A NARROWER QUESTION, NOT A WEAKER ONE. The shared guard is
 * untouched. Here the question is "is every figure in the rewritten line
 * present in the original line?" — verified digit by digit — and only figures
 * that pass are masked before the line reaches groundingFailure(). A number the
 * model introduced, a company the candidate never worked for, a credential they
 * do not hold, a tenure larger than their own: all still fail, and the original
 * line is kept instead. A test asserts each of those.
 *
 * ⚠️ A REJECTED REWRITE NEVER LOSES CONTENT. tailor.ts drops the bullet; this
 * reverts to the candidate's own words and records why. Losing a line from
 * someone's résumé because our model wrote a bad version of it would be the
 * worst possible failure mode — they would download a shorter CV than they
 * uploaded and have no way to know.
 */

export type BulletChange = {
  entry: number
  original: string
  rewritten: string
  /** True when the rewrite was kept. False when the guard sent it back. */
  kept: boolean
  /** Why it was sent back. Shown, never hidden. */
  reason?: string
}

export type RewriteResult = {
  sections: ResumeSections
  changes: BulletChange[]
  /** Rewrites the guard refused, lifted out of `changes` for the UI. */
  reverted: BulletChange[]
  provider: Provider
  /** Skills reordered to lead with the ones the role actually names. */
  skillsReordered: boolean
}

export class RewriteError extends Error {}

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
        required: ['index', 'bullets'],
      },
    },
  },
  required: ['summary', 'entries'],
}

const SYSTEM =
  'You rewrite a candidate\'s own résumé lines for clarity and keyword coverage. ' +
  'You never invent facts, figures, employers, dates or credentials.'

/** Every digit run in a line, commas stripped, so 40,000 and 40000 compare equal. */
function figures(text: string): string[] {
  return (text.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,\s]/g, '').replace(/\.$/, ''))
}

/**
 * Is every figure in the rewrite present in the line it came from?
 *
 * Substring rather than equality on purpose: a model that writes "14%" from an
 * original saying "14.2%" has rounded, not invented, and "40000" from "40,000"
 * is the same number written differently. A figure that appears nowhere in the
 * original fails, which is the case that matters.
 */
function figuresAreOriginal(next: string, original: string): string | null {
  const source = figures(original).join(' ')
  for (const n of figures(next)) {
    if (n.length === 0) continue
    if (!source.includes(n)) return `states "${n}", which is not in your own line`
  }
  return null
}

/**
 * Mask the figures we have just proved came from the candidate's own line, so
 * groundingFailure()'s metric rule does not fire on them — and only on them.
 * Everything else reaches the guard untouched.
 */
function maskVerifiedFigures(next: string): string {
  /**
   * ⚠️ THE REPLACEMENT IS A PADDED, LOWERCASE WORD, AND BOTH PROPERTIES ARE
   * LOAD-BEARING. An earlier version substituted "N" and swallowed the trailing
   * space, so "40,000 merchants" became "Nmerchants" — a capitalised token the
   * guard's company rule then rejected as an employer the candidate never
   * worked for. The mask must not create a new word, and must not create a
   * capitalised one.
   */
  return next
    .replace(/\d[\d,.]*\s*(%|percent|x\b|k\b|cr\b|crore|lakhs?|mn\b|million|bn\b|billion)?/gi, ' num ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Words already in the candidate's own line, lower-cased.
 *
 * ⚠️ THIS EXISTS BECAUSE THE GUARD REJECTED THE CANDIDATE'S OWN WORDS BACK AT
 * THEM. Measured on a real résumé on 2026-09-08: "Cut p99 latency on the
 * payouts API…" was refused for naming "API", and "Built REST services for a
 * European banking client" for naming "European" — both words sitting in the
 * line being rewritten. groundingFailure() reads a capitalised word it does not
 * recognise as a foreign employer, which is the correct reading when the text
 * is a NEW cover note drafted from a profile, and the wrong one when the text
 * is a rewrite of a sentence the candidate wrote themselves.
 *
 * The principle is the one already applied to figures, extended to words: this
 * surface's whole contract is that a rewrite may only reorder, compress and
 * reword the source line, so anything present in that line is grounded by
 * definition. Anything the model INTRODUCED still faces the full guard — which
 * makes this strictly stronger than groundingFailure() alone, not weaker.
 */
function ownVocabulary(original: string, me: CandidateFacts): Set<string> {
  const words = `${original} ${me.currentTitle ?? ''} ${me.employer ?? ''}`
    .split(/\s+/)
    .map((w) => w.replace(/['’]s\b/gi, '').replace(/[^A-Za-z&]/g, '').toLowerCase())
    .filter((w) => w.length >= 3)
  return new Set(words)
}

/**
 * The full check for one rewritten bullet. Returns null when it may be kept.
 *
 * Order matters: everything grounded in the original — figures first, then its
 * own words — is verified and masked BEFORE the shared guard runs, so what
 * reaches groundingFailure() is exactly the material the model added.
 */
export function rewriteFailure(
  next: string,
  original: string,
  me: CandidateFacts,
  role: RoleFacts,
): string | null {
  const trimmed = next.trim()
  if (trimmed.length < 15) return 'came back too short to use'
  if (trimmed.length > 320) return 'came back longer than a résumé line should be'

  const invented = figuresAreOriginal(trimmed, original)
  if (invented) return invented

  const known = ownVocabulary(original, me)
  const masked = maskVerifiedFigures(trimmed)
    .split(' ')
    .map((word, i) => {
      // The first word is never scanned by the guard's company rule anyway.
      if (i === 0) return word
      const w = word.replace(/['’]s\b/gi, '').replace(/[^A-Za-z&]/g, '').toLowerCase()
      // Lower-casing is enough: the rule only inspects capitalised words, so a
      // word we have grounded simply stops being a candidate for it, while
      // still being present for the tenure and credential rules.
      return w.length >= 3 && known.has(w) ? word.toLowerCase() : word
    })
    .join(' ')

  return groundingFailure(masked, me, role)
}

function prompt(sections: ResumeSections, me: CandidateFacts, role: RoleFacts): string {
  const entries = sections.experience
    .map((e, i) => {
      const head = [e.title, e.employer, e.dates].filter(Boolean).join(' · ')
      const bullets = e.bullets.map((b, j) => `  [${j}] ${b}`).join('\n')
      return `ENTRY ${i} — ${head}\n${bullets}`
    })
    .join('\n\n')

  return [
    `TARGET ROLE: ${role.title}${role.company ? ` at ${role.company}` : ''}`,
    role.description
      ? `WHAT THIS ROLE ASKS FOR:\n${role.description.slice(0, 6000)}`
      : 'No job description was supplied. Optimise for the role title alone.',
    '',
    `THE CANDIDATE, AS READ FROM THEIR OWN RÉSUMÉ:`,
    `current title: ${me.currentTitle ?? 'unknown'}`,
    `employer: ${me.employer ?? 'unknown'}`,
    `years of experience: ${me.yearsExperience ?? 'unknown'}`,
    `skills: ${me.skills.join(', ') || 'unknown'}`,
    '',
    sections.summary ? `THEIR CURRENT SUMMARY:\n${sections.summary}` : 'They have no summary section.',
    '',
    'THEIR EXPERIENCE, BY ENTRY:',
    entries,
    '',
    'REWRITE RULES — these are absolute:',
    '1. Rewrite each bullet using ONLY the facts in that same bullet. You may reorder,',
    '   compress, sharpen the verb, and move the outcome to the front.',
    '2. NEVER introduce a number, percentage, amount, team size or duration that is not',
    '   already written in that bullet. If a bullet has no figure, it stays without one.',
    '3. NEVER name a company, product or client that is not already in that bullet.',
    '4. NEVER claim a qualification, degree or certification.',
    '5. Start each bullet with a past-tense action verb. Do not open with "Responsible for",',
    '   "Worked on", "Helped with" or "Involved in".',
    '6. Keep each bullet under 240 characters and return the same number of bullets per',
    '   entry, in the same order, so nothing the candidate wrote is lost.',
    '7. Use the vocabulary of the target role ONLY where the original line already supports',
    '   it. Do not add a skill the candidate has not demonstrated.',
    '8. The summary is two or three sentences, in the first person implied (no "I"),',
    '   naming the candidate\'s real title, real years and real domain.',
    '',
    'Return JSON: { "summary": string, "entries": [{ "index": number, "bullets": string[] }] }',
  ].join('\n')
}

/** Skills the role names come first; nothing is added and nothing is removed. */
function reorderSkills(skills: string[], role: RoleFacts): { skills: string[]; changed: boolean } {
  const hay = `${role.title} ${role.description ?? ''}`.toLowerCase()
  const named = skills.filter((s) => hay.includes(s.toLowerCase()))
  if (named.length === 0 || named.length === skills.length) return { skills, changed: false }
  const rest = skills.filter((s) => !named.includes(s))
  return { skills: [...named, ...rest], changed: true }
}

export async function rewriteResume(input: {
  sections: ResumeSections
  facts: CandidateFacts
  role: RoleFacts
}): Promise<RewriteResult | null> {
  const { sections, facts, role } = input

  if (sections.experience.length === 0) {
    throw new RewriteError(
      'We could not find a work-experience section to rewrite. That is itself the finding — ' +
        'a system reading this file finds no roles either.',
    )
  }

  const answer = await callJsonModel({
    prompt: prompt(sections, facts, role),
    system: SYSTEM,
    schema: SCHEMA,
    temperature: 0.2,
    timeoutMs: 20_000,
  })
  if (!answer) return null

  let parsed: { summary?: unknown; entries?: unknown }
  try {
    parsed = JSON.parse(answer.raw) as { summary?: unknown; entries?: unknown }
  } catch {
    return null
  }

  const byIndex = new Map<number, string[]>()
  if (Array.isArray(parsed.entries)) {
    for (const e of parsed.entries) {
      const entry = e as { index?: unknown; bullets?: unknown }
      if (typeof entry.index !== 'number' || !Array.isArray(entry.bullets)) continue
      byIndex.set(
        entry.index,
        entry.bullets.filter((b): b is string => typeof b === 'string'),
      )
    }
  }

  const changes: BulletChange[] = []
  const experience = sections.experience.map((entry, i) => {
    const proposed = byIndex.get(i) ?? []
    const bullets = entry.bullets.map((original, j) => {
      const next = proposed[j]
      if (!next || next.trim() === original.trim()) return original

      const fail = rewriteFailure(next, original, facts, role)
      changes.push({ entry: i, original, rewritten: next.trim(), kept: !fail, reason: fail ?? undefined })
      return fail ? original : next.trim()
    })
    return { ...entry, bullets }
  })

  /**
   * The summary is checked against the résumé as a whole rather than against
   * one line, because that is what it summarises. Failing it costs the summary
   * and nothing else — the original is kept when there was one.
   */
  const wholeText = sections.experience.flatMap((e) => e.bullets).join(' ')
  let summary = sections.summary
  if (typeof parsed.summary === 'string' && parsed.summary.trim().length > 20) {
    const candidate = parsed.summary.trim()
    const fail = rewriteFailure(candidate, `${wholeText} ${sections.summary ?? ''}`, facts, role)
    if (!fail) summary = candidate
    else changes.push({ entry: -1, original: sections.summary ?? '', rewritten: candidate, kept: false, reason: fail })
  }

  const { skills, changed } = reorderSkills(sections.skills, role)

  return {
    sections: { ...sections, summary, experience, skills },
    changes,
    reverted: changes.filter((c) => !c.kept),
    provider: answer.provider,
    skillsReordered: changed,
  }
}
