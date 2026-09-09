import { callJsonModel, type Provider } from '@/lib/parse/llm'
import { rewriteFailure } from '@/lib/resume-rewrite'
import { sectionsToText, type ResumeSections } from '@/lib/parse/sections'
import type { CandidateFacts, RoleFacts } from '@/lib/tailor'

/**
 * A cover letter, built only from what the résumé already says.
 *
 * ⚠️ THIS IS THE HARDEST SURFACE IN THE PRODUCT TO KEEP HONEST, and it is worth
 * saying why before the code. A résumé rewrite has a line to check each
 * rewritten line against — the candidate's own. A cover letter has no such
 * anchor: it is new prose by definition, which is exactly the shape a model
 * fills with plausible invention. "I have always admired your commitment to
 * financial inclusion" is the house style of every generated cover letter and
 * it is a claim about the candidate's own mind that nobody can check.
 *
 * So the grounding rule is deliberately harsher here than anywhere else: each
 * paragraph is checked against THE WHOLE RÉSUMÉ, and a paragraph that fails is
 * DROPPED rather than reverted, because unlike a résumé line there is no
 * original to fall back to. A short letter of three true paragraphs beats a
 * long one with a fourth nobody can defend.
 *
 * ⚠️ IT NEVER WRITES ABOUT MOTIVATION, ADMIRATION OR CULTURE FIT. Not because a
 * model writes them badly, but because those sentences assert things about a
 * person the product has no way to know. The prompt forbids them and a test
 * asserts the ban holds.
 */

export type CoverLetter = {
  /** Body paragraphs, in order. No salutation or sign-off — see below. */
  paragraphs: string[]
  /** Paragraphs the guard removed, with the reason. Shown, never hidden. */
  dropped: { text: string; reason: string }[]
  provider: Provider
}

const SCHEMA = {
  type: 'object',
  properties: { paragraphs: { type: 'array', items: { type: 'string' } } },
  required: ['paragraphs'],
}

/**
 * ⚠️ NO SALUTATION AND NO SIGN-OFF, DELIBERATELY. "Dear Hiring Manager" is
 * either wrong or unnecessary, and a generated "Yours sincerely, [Name]" is the
 * single clearest tell that a letter was not written by the person sending it.
 * The candidate adds those in their own words, in their own mail client, which
 * takes ten seconds and is the part they can do better than any model.
 */
function prompt(sections: ResumeSections, me: CandidateFacts, role: RoleFacts): string {
  return [
    `THE ROLE: ${role.title}${role.company ? ` at ${role.company}` : ''}`,
    role.description ? `WHAT IT ASKS FOR:\n${role.description.slice(0, 4000)}` : '',
    '',
    'THE CANDIDATE’S RÉSUMÉ, IN FULL:',
    sectionsToText(sections).slice(0, 8000),
    '',
    'Write THREE short paragraphs for a covering email.',
    '',
    'RULES — absolute:',
    '1. Every fact must already be in the résumé above. Add no figure, employer,',
    '   qualification, tool or date that is not written there.',
    '2. Do NOT write about motivation, admiration, passion, culture fit, or why',
    '   the candidate wants the job. You do not know any of that. Write about',
    '   what they have done and how it maps onto what the role asks for.',
    '3. No salutation, no sign-off, no subject line. Body paragraphs only.',
    '4. Paragraph 1: the single most relevant thing they have done, named plainly.',
    '   Paragraph 2: one or two more, chosen for this role.',
    '   Paragraph 3: what they are looking for, in one sentence, factually.',
    '5. Under 90 words per paragraph. Plain English. No adjectives about the',
    '   candidate — the evidence carries it.',
    '6. FIRST PERSON. Write as the candidate: "I migrated the ledger…". Never',
    '   "he", "she", "they", "the candidate" or their name. This is a letter they',
    '   send as themselves, not a reference somebody wrote about them.',
    '',
    'Return JSON: { "paragraphs": string[] }',
  ].join('\n')
}

export async function draftCoverLetter(input: {
  sections: ResumeSections
  facts: CandidateFacts
  role: RoleFacts
}): Promise<CoverLetter | null> {
  const { sections, facts, role } = input

  const answer = await callJsonModel({
    prompt: prompt(sections, facts, role),
    system: 'You write short, factual covering emails using only the facts supplied. You never invent.',
    schema: SCHEMA,
    temperature: 0.3,
    /** Matches the rewrite's ceiling: the Gemini leg was measured at 13–18s,
     *  and a letter is a longer generation than a résumé line. */
    timeoutMs: 35_000,
  })
  if (!answer) return null

  let raw: string[]
  try {
    const parsed = JSON.parse(answer.raw) as { paragraphs?: unknown }
    if (!Array.isArray(parsed.paragraphs)) return null
    raw = parsed.paragraphs.filter((p): p is string => typeof p === 'string' && p.trim().length > 30)
  } catch {
    return null
  }

  /**
   * The whole résumé is the ground truth for every paragraph — the same
   * rewriteFailure() the résumé rewrite uses, given the widest possible
   * original. A figure or a company that is anywhere in the document passes; one
   * that is nowhere fails.
   */
  const source = sectionsToText(sections)
  const paragraphs: string[] = []
  const dropped: { text: string; reason: string }[] = []

  for (const p of raw.slice(0, 4)) {
    const text = p.trim()
    const fail =
      rewriteFailure(text, source, facts, role) ?? motivationFailure(text) ?? personFailure(text)
    if (fail) dropped.push({ text, reason: fail })
    else paragraphs.push(text)
  }

  return { paragraphs, dropped, provider: answer.provider }
}

/**
 * The sentences a cover letter reaches for when it has nothing to say.
 *
 * ⚠️ THIS IS NOT A STYLE RULE. Each pattern below asserts something about the
 * candidate's inner life — what they admire, what excites them, what they have
 * "always been passionate about" — which this product cannot know and the
 * candidate did not tell us. Dropping them is the same rule as dropping an
 * invented figure, applied to a claim that happens to be unfalsifiable rather
 * than false.
 */
const MOTIVATION =
  /\b(passionate|passion|excited|excites|thrilled|admire|admired|admiration|drawn to|inspired by|dream (job|role)|culture fit|align(ed)? with (my|your) values|long.?standing interest)\b/i

function motivationFailure(text: string): string | null {
  const m = MOTIVATION.exec(text)
  return m ? `claims something about your motivation ("${m[0]}") that your résumé does not say` : null
}

/**
 * Third person, in a letter the candidate signs. Caught on the first live run:
 * handed a résumé whose summary reads "Backend engineer with 4 years…", the
 * model wrote back "He has 4 years of experience…" — true, grounded, unusable.
 *
 * ⚠️ TWO PATTERNS, AND THE SECOND IS DELIBERATELY NARROW. The first catches a
 * subject pronoun driving a verb — "He has", "She led", "The candidate has".
 * The second catches a possessive attached to a word that can only describe a
 * PERSON — "their experience", "his background".
 *
 * A blanket ban on possessives would be wrong and was tried: "I authored the
 * runbooks their on-call rota still uses" is first-person prose that mentions a
 * team, and refusing it would delete a true sentence for a grammatical reason.
 * Telling those apart in general needs more than a regex, so this rule does the
 * part it can do reliably and leaves the rest — a limit worth knowing about
 * rather than papering over.
 */
const THIRD_PERSON =
  /\b(he|she|they|the candidate)\s+(has|have|is|was|brings|holds|led|built|owns?|worked)\b|\b(his|her|their)\s+(experience|background|expertise|career|profile|skill ?set|track record)\b/i

function personFailure(text: string): string | null {
  const m = THIRD_PERSON.exec(text)
  return m
    ? `is written about you rather than by you ("${m[0]}") — a covering email is signed by the person it describes`
    : null
}
