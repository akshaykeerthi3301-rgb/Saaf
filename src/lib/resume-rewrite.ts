import { callJsonModel, logModelFailure, type Provider } from '@/lib/parse/llm'
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
  /**
   * Which provider answered — or **null when no model ran at all**, which is
   * the skills-only path. A surface that prints a provider label must check
   * this: naming a provider that was never called would be a small lie on the
   * one screen whose whole argument is that the model boundary is visible.
   */
  provider: Provider | null
  /** Skills reordered to lead with the ones the role actually names. */
  skillsReordered: boolean
}

export class RewriteError extends Error {}

/**
 * Which sections the MODEL is asked to rewrite.
 *
 * ⚠️ SKILLS IS ABSENT ON PURPOSE AND THAT IS THE WHOLE IDEA. `reorderSkills()`
 * is a stable sort against words the posting already uses — it always runs, it
 * costs nothing, and it cannot fabricate. Only prose needs a model, so only
 * prose can be scoped. A scope with neither flag set makes **no model call at
 * all**; see the early return in `rewriteResume`.
 *
 * ⚠️ THE DEFAULT IS BOTH, WHICH IS THE OLD WHOLE-DOCUMENT BEHAVIOUR. Callers
 * that do not care keep working unchanged; the Studio's stage 3 is what
 * narrows it.
 */
export type RewriteScope = { summary?: boolean; experience?: boolean }

const ENTRIES_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      index: { type: 'number' },
      bullets: { type: 'array', items: { type: 'string' } },
    },
    required: ['index', 'bullets'],
  },
}

/**
 * ⚠️ THE SCHEMA NARROWS WITH THE SCOPE, IT DOES NOT JUST FILTER AFTERWARDS.
 * Asking for `entries` and discarding them would pay for every bullet in output
 * tokens and then throw them away — the opposite of what stage 3 promises. A
 * summary-only rewrite must not carry an experience array in `required`, or a
 * schema-constrained provider is obliged to generate one.
 */
function schemaFor(scope: Required<RewriteScope>) {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  if (scope.summary) {
    properties.summary = { type: 'string' }
    required.push('summary')
  }
  if (scope.experience) {
    properties.entries = ENTRIES_SCHEMA
    required.push('entries')
  }
  return { type: 'object', properties, required }
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
  // Both forms, so an inflection the model changed still matches — see stem().
  return new Set([...words, ...words.map(stem)])
}

/**
 * The crudest possible stemmer: drop a plural or tense ending.
 *
 * ⚠️ IT EXISTS BECAUSE OF A LIVE FALSE POSITIVE, seen on production on
 * 2026-09-08. The candidate's summary said "Comfortable owning a service end to
 * end"; the model rewrote it as "Owns services end to end". "Owns" is
 * capitalised because it starts a sentence, and it is not the same STRING as
 * "owning", so the grounding check treated it as an unknown proper noun and the
 * guard reported `names "Owns", which is not on your profile` — about a verb.
 * Conservative in outcome (the original summary was kept) but wrong in its
 * reason, and a wrong reason on this surface is worse than no reason: the
 * refusal list is the evidence that the guard works.
 *
 * ⚠️ WHY NOT JUST SKIP WORDS THAT START A SENTENCE, which was the obvious fix.
 * Because "Flipkart builds payments infrastructure." also starts a sentence, and
 * exempting that position would blind the rule to exactly the fabrication it
 * exists to catch. Stemming keeps the position under scrutiny and only forgives
 * a word the candidate already used in another form.
 */
function stem(w: string): string {
  for (const suffix of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) return w.slice(0, -suffix.length)
  }
  return w
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
  /** A bullet is one line; a professional summary is allowed a short paragraph. */
  maxLength = 320,
): string | null {
  const trimmed = next.trim()
  if (trimmed.length < 15) return 'came back too short to use'
  if (trimmed.length > maxLength) return `came back longer than a ${maxLength > 320 ? 'summary' : 'résumé line'} should be`

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
      const grounded = w.length >= 3 && (known.has(w) || known.has(stem(w)))
      return grounded ? word.toLowerCase() : word
    })
    .join(' ')

  return groundingFailure(masked, me, role)
}

/**
 * Drop a sentence the rewrite repeated verbatim.
 *
 * ⚠️ MEASURED IN A BROWSER 2026-09-15, ON THE SUMMARY-ONLY PATH TASK-085 ADDED.
 * Rule 8 of the prompt asks for "two or three sentences". Given a thin original
 * — "Backend engineer, three years, payments." — the model padded to two by
 * saying the same thing twice: *"Backend engineer with five years of experience
 * in payments. Backend engineer with five years of experience in payments."*
 * A résumé carrying a duplicated line is worse than the one it replaced, and
 * `rewriteFailure()` never looked for this because it checks for INVENTED
 * content, not repeated content.
 *
 * ⚠️ IT ONLY REMOVES, SO IT CANNOT FABRICATE. That is what makes fixing it here
 * legitimate rather than a second, unguarded edit of model output: every
 * sentence in the result was already in the input, and the first occurrence
 * wins so the order the model chose is preserved.
 */
function dropRepeatedSentences(text: string): string {
  const seen = new Set<string>()
  const kept: string[] = []
  for (const raw of text.split(/(?<=[.!?])\s+/)) {
    const sentence = raw.trim()
    if (!sentence) continue
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(sentence)
  }
  return kept.join(' ')
}

function prompt(
  sections: ResumeSections,
  me: CandidateFacts,
  role: RoleFacts,
  scope: Required<RewriteScope>,
  emphasise: string[] = [],
): string {
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
    /**
     * ⚠️ OUT-OF-SCOPE SECTIONS ARE STILL SHOWN, AND THAT IS NOT WASTE. The
     * summary summarises the experience, so rewriting it without seeing the
     * bullets produces a paragraph grounded in nothing — and `rewriteFailure()`
     * would then reject it, spending the tokens for no output. What the scope
     * changes is what the model is asked to RETURN, which is where the output
     * cost and the schema obligation live.
     */
    sections.summary ? `THEIR CURRENT SUMMARY:\n${sections.summary}` : 'They have no summary section.',
    '',
    'THEIR EXPERIENCE, BY ENTRY:',
    entries,
    '',
    scope.summary && scope.experience
      ? 'REWRITE THE SUMMARY AND EVERY BULLET.'
      : scope.summary
        ? 'REWRITE THE SUMMARY ONLY. Do not return entries; the bullets above are context and stay exactly as they are.'
        : 'REWRITE THE BULLETS ONLY. Do not return a summary; the one above stays exactly as it is.',
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
    ...(emphasise.length
      ? [
          '',
          `THE CANDIDATE ASKED YOU TO WORK THESE TERMS IN WHERE THEY FIT: ${emphasise.join(', ')}.`,
          'Rule 7 still governs: use a term ONLY in a line whose facts already support it. If none of their lines',
          'does, leave the term out — a missing keyword is better than a claim they cannot defend.',
        ]
      : []),
    '',
    scope.summary && scope.experience
      ? 'Return JSON: { "summary": string, "entries": [{ "index": number, "bullets": string[] }] }'
      : scope.summary
        ? 'Return JSON: { "summary": string }'
        : 'Return JSON: { "entries": [{ "index": number, "bullets": string[] }] }',
  ].join('\n')
}

/**
 * Skills the role names come first; nothing is added and nothing is removed.
 *
 * ⚠️ EXPORTED FOR THE RÉSUMÉ STUDIO'S STAGE 3, AND IT COSTS NOTHING. This is
 * the whole of "tailor my skills section" with no model call at all — it is a
 * stable sort against words the posting already uses. The Studio offers it
 * beside options that DO spend tokens, so the distinction has to be visible:
 * a candidate should be able to take the free improvement and stop there.
 */
export function reorderSkills(skills: string[], role: RoleFacts): { skills: string[]; changed: boolean } {
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
  /** Defaults to the whole document, which is the behaviour this always had. */
  scope?: RewriteScope
  /** Posting terms the candidate ticked in step 2 — worked in only where a line already supports them. */
  emphasise?: string[]
}): Promise<RewriteResult | null> {
  const { sections, facts, role } = input
  const scope: Required<RewriteScope> = {
    summary: input.scope?.summary ?? true,
    experience: input.scope?.experience ?? true,
  }

  /**
   * ⚠️ THE FREE PATH, AND IT RETURNS BEFORE ANY MODEL IS TOUCHED. A candidate
   * who picked only "Skills" in stage 3 has asked for a stable sort, and stage
   * 3 promised them in writing that no model would run. Reaching the provider
   * here — even to discard the answer — would make that copy false and would
   * spend ~1,360 tokens of an 8,000/minute site-wide ceiling on nothing.
   *
   * `provider` is null rather than a label, because naming a provider that was
   * never called is exactly the kind of small lie this surface exists to avoid.
   */
  if (!scope.summary && !scope.experience) {
    const { skills, changed } = reorderSkills(sections.skills, role)
    return {
      sections: { ...sections, skills },
      changes: [],
      reverted: [],
      provider: null,
      skillsReordered: changed,
    }
  }

  /**
   * ⚠️ THE GUARD IS SCOPED TOO. Refusing a summary-only rewrite because the
   * document has no experience section would block the one thing such a
   * candidate can still improve. It only applies when bullets are what was
   * asked for.
   */
  if (scope.experience && sections.experience.length === 0) {
    throw new RewriteError(
      'We could not find a work-experience section to rewrite. That is itself the finding — ' +
        'a system reading this file finds no roles either.',
    )
  }

  const answer = await callJsonModel({
    prompt: prompt(sections, facts, role, scope, input.emphasise),
    system: SYSTEM,
    schema: schemaFor(scope),
    caller: 'rewrite-document',
    temperature: 0.2,
    /**
     * ⚠️ SIZED FOR THE SLOW LEG, NOT THE FAST ONE. Groq answers this prompt in
     * ~1.5s; gemini-3.6-flash was measured at 18.5s on the same résumé on
     * 2026-09-08. At the old 20s ceiling the fallback provider was one slow
     * response away from timing out, which would have made the failover look
     * broken precisely when it was doing its job. Vercel's function limit is
     * 60s and the chain's worst case is now 12s (Groq) + 35s (Gemini).
     */
    timeoutMs: 35_000,
  })
  if (!answer) return null

  let parsed: { summary?: unknown; entries?: unknown }
  try {
    parsed = JSON.parse(answer.raw) as { summary?: unknown; entries?: unknown }
  } catch {
    logModelFailure({ caller: 'rewrite-document', provider: answer.provider, kind: 'bad-json' })
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
  // Out of scope means untouched, not "rewritten and rejected".
  const experience = !scope.experience ? sections.experience : sections.experience.map((entry, i) => {
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
  if (scope.summary && typeof parsed.summary === 'string' && parsed.summary.trim().length > 20) {
    const candidate = dropRepeatedSentences(parsed.summary.trim())
    const fail = rewriteFailure(candidate, `${wholeText} ${sections.summary ?? ''}`, facts, role)
    /**
     * ⚠️ A KEPT SUMMARY IS NOW RECORDED TOO, AND IT NEVER USED TO BE. Only
     * REJECTED summaries were pushed here, so a summary the guard accepted
     * changed the document and appeared in no change list. That was invisible
     * while every rewrite also rewrote bullets — the list was never empty. It
     * stopped being invisible the moment TASK-085 made "summary only" a thing a
     * candidate can choose: they pressed "Rewrite your summary", it worked, and
     * the result screen showed them nothing at all.
     */
    changes.push({
      entry: -1,
      original: sections.summary ?? '',
      rewritten: candidate,
      kept: !fail,
      reason: fail ?? undefined,
    })
    if (!fail) summary = candidate
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

/**
 * Rewrite ONE line, on request.
 *
 * ⚠️ THE UNIT MATTERS AS MUCH AS THE OUTPUT. rewriteResume() processes a whole
 * document for ~1,360 tokens and returns a take-it-or-leave-it draft; this
 * costs roughly a tenth of that and is invoked only when the candidate presses
 * a button on a specific line they disagree with. That is the difference
 * between a feature people use twice and one they use on every bullet, and it
 * is what the category leader's inline assistant actually is.
 *
 * Same guard, same contract: figures and words must already be in the line, and
 * a refusal returns null so the caller keeps what the candidate wrote.
 */
export async function rewriteOneBullet(
  original: string,
  me: CandidateFacts,
  role: RoleFacts,
  opts: {
    /** What the candidate asked for in their own words ("Shorten this"). The rules below still win over it. */
    instruction?: string
    /** The line is the professional summary, not a bullet: no opening-verb rule, room for two or three sentences. */
    summary?: boolean
  } = {},
): Promise<{ text: string; provider: Provider } | { refused: string } | null> {
  const asked = opts.instruction?.trim().slice(0, 160)
  const answer = await callJsonModel({
    prompt: [
      `TARGET ROLE: ${role.title}`,
      role.description ? `THE ROLE ASKS FOR:\n${role.description.slice(0, 2000)}` : '',
      '',
      opts.summary ? 'REWRITE THIS PROFESSIONAL SUMMARY:' : 'REWRITE THIS ONE RÉSUMÉ LINE:',
      original,
      asked ? `\nTHE CANDIDATE ASKED FOR: "${asked}" — do that, inside the rules below. If the two conflict, the rules win.` : '',
      '',
      'RULES — absolute:',
      '1. Use ONLY facts already in that line. Add no number, employer, product or qualification.',
      opts.summary
        ? '2. Keep it a summary: no "I", no "Responsible for". Name the strongest facts it already holds.'
        : '2. Open with a past-tense action verb. Never "Responsible for", "Worked on", "Involved in".',
      opts.summary ? '3. Cut filler words and repetition; keep every figure.' : '3. Put the outcome first where the line has one.',
      opts.summary ? '4. Under 420 characters.' : '4. Under 240 characters. One line.',
      '',
      'Return JSON: { "line": string }',
    ].join('\n'),
    system: 'You sharpen a single résumé line. You never invent facts.',
    schema: { type: 'object', properties: { line: { type: 'string' } }, required: ['line'] },
    caller: 'rewrite-bullet',
    temperature: 0.2,
    timeoutMs: 20_000,
  })
  if (!answer) return null

  let line: string
  try {
    const parsed = JSON.parse(answer.raw) as { line?: unknown }
    if (typeof parsed.line !== 'string') {
      logModelFailure({ caller: 'rewrite-bullet', provider: answer.provider, kind: 'schema' })
      return null
    }
    line = parsed.line.trim()
  } catch {
    logModelFailure({ caller: 'rewrite-bullet', provider: answer.provider, kind: 'bad-json' })
    return null
  }

  const fail = rewriteFailure(line, original, me, role, opts.summary ? 600 : 320)
  // Shown, not hidden: a refusal is evidence the filter is real.
  return fail ? { refused: fail } : { text: line, provider: answer.provider }
}
