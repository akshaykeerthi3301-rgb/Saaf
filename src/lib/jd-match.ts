import { extractAll } from '@/gates/extract'
import type { CandidateProfile, TypedRequirement } from '@/gates/types'
import { scoreRole, summarise, type ScoreBreakdown } from '@/match/score'
import { extractFields, type ParsedFields } from '@/lib/parse/extract'
import { readResumeWithModel, activeProvider, type Provider } from '@/lib/parse/llm'
import {
  MIN_JD_CHARS,
  MIN_RESUME_CHARS,
} from '@/lib/jd-match-constants'

/**
 * Re-exported so a server-side caller has one import for the whole surface.
 * The client form imports from src/lib/jd-match-constants.ts directly — see
 * that file for why it must not come through here.
 */
export {
  MIN_JD_CHARS,
  MIN_RESUME_CHARS,
  MAX_JD_CHARS,
  MAX_RESUME_CHARS,
} from '@/lib/jd-match-constants'

/**
 * Score one pasted job description against one pasted résumé. TASK-060.
 *
 * ⚠️ THIS MODULE TOUCHES NO DATABASE, AND THAT IS THE POINT. The JD arrives as
 * text rather than from `roles`, and the candidate arrives as text rather than
 * from `profiles`, so the whole path is pure composition over modules that were
 * already pure. It therefore does NOT belong in src/lib/services/ — that layer
 * exists to hold database access, and filing a module with no queries there
 * would dilute the one boundary rule the linter enforces.
 *
 * It also means the public /tools/paste-jd surface cannot leak candidate data:
 * there is no client here to leak it through. A test asserts that, so the
 * property cannot be lost by a later edit.
 *
 * The score it returns is the SAME six-component ScoreBreakdown that /today
 * renders. Comparability is a product requirement, not a convenience: a
 * candidate who pastes a JD and sees 62, then finds the same role on their
 * shortlist at 62, is looking at one product. Two numbers for one role would
 * discredit both.
 */

/**
 * Everything the scorer needs, and nothing it does not.
 *
 * `jdTitle` and `jdLocation` are optional because a pasted JD is usually a
 * wall of text with no clean fields. Both materially change the score —
 * title carries 28 of 100 and drives seniority extraction, location 10 — so
 * when they are absent this module says so in `warnings` rather than scoring
 * as though it knew.
 */
export type JdMatchInput = {
  jdText: string
  resumeText: string
  jdTitle?: string
  jdLocation?: string
  /**
   * Overrides whatever the résumé yielded. The single most decisive field on
   * this surface: seniority carries 25 of 100 AND applies a hard ceiling to
   * the total, so a wrong reading here moves the score further than any other
   * input. The page should offer it as a one-field correction.
   */
  yearsExperience?: number
  /**
   * What the candidate wants to be doing. Defaults to their CURRENT title, not
   * to the pasted JD's title — see buildProfile() for why that default is the
   * honest one.
   */
  preferredRole?: string
}

export type JdMatchResult = {
  /** Identical shape to the breakdown /today renders. */
  breakdown: ScoreBreakdown
  /** One line, from the same summariser the shortlist uses. */
  reason: string
  /** What we read out of the JD, each with the sentence it came from. */
  requirements: TypedRequirement[]
  /** What we read out of the résumé, after the model pass. */
  profile: CandidateProfile
  /** Everything we could not read, in the candidate's words. Never silent. */
  warnings: string[]
  /** Which model read the résumé, or null when none did. */
  provider: Provider | null
}

export class JdMatchError extends Error {}

/**
 * The JD's title, when the caller did not supply one.
 *
 * First substantial line, capped. Deliberately crude: a guess that is announced
 * is safer than a model call that is not, and the caller is told it guessed so
 * the page can offer a correction field. Lines that are obviously not a title —
 * a URL, an all-caps section header, a sentence — are skipped.
 */
function guessTitle(jdText: string): string | undefined {
  const line = jdText
    .split(/\n+/)
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .find(
      (l) =>
        l.length >= 3 &&
        l.length <= 80 &&
        !/^https?:|@|^\W+$/.test(l) &&
        // A title is a phrase, not a sentence.
        l.split(/\s+/).length <= 10 &&
        !/[.!?]$/.test(l)
    )
  return line || undefined
}

/**
 * Drop the deterministic parser's "we could not find X" warnings for fields the
 * model then supplied.
 *
 * ⚠️ WITHOUT THIS THE PAGE CONTRADICTS ITSELF, AND VISIBLY. Observed on the
 * first real run of /tools/paste-jd: the panel said "We could not find your
 * current title" directly above "Title matches every word of the role you asked
 * for — 28/28". Both statements came from this function; the first was computed
 * before the model ran and never revisited. For a product whose entire claim is
 * that it shows its working, an admission and a perfect score for the same
 * field on the same screen discredits both.
 *
 * ⚠️ THE STRINGS BELOW ARE COPIED FROM src/lib/parse/extract.ts. That coupling
 * is real and a rename there would silently stop this filtering — so
 * src/lib/__tests__/jd-match.test.ts asserts each one still appears. If that
 * test fails after an edit to extract.ts, update this table; do not delete the
 * assertion.
 *
 * Warnings that are NOT of this family survive untouched — "We worked out your
 * years of experience from the dates — please check it." is a statement about
 * provenance, not about a gap, and stays true however the field was filled.
 */
function keepStillTrue(warnings: string[], fields: ParsedFields): string[] {
  const resolved: [string, boolean][] = [
    ['We could not find a city', Boolean(fields.city)],
    ['We could not work out your years of experience', fields.yearsExperience !== undefined],
    ['We could not find your current title', Boolean(fields.currentTitle)],
    ['We could not find your current employer', Boolean(fields.employer)],
  ]
  return warnings.filter((w) => !resolved.some(([marker, filled]) => filled && w.startsWith(marker)))
}

/**
 * Résumé text → the profile the scorer takes.
 *
 * The deterministic parser runs first and the model is STRICTLY ADDITIVE on top
 * of it — the same precedence as src/app/actions/parse-resume.ts, deliberately
 * copied rather than reinvented so the two surfaces cannot disagree about the
 * same résumé. A null from the model (no key, timeout, bad JSON) leaves the
 * deterministic result exactly as it was.
 */
async function buildProfile(
  input: JdMatchInput
): Promise<{ profile: CandidateProfile; warnings: string[]; provider: Provider | null }> {
  const deterministic = extractFields(input.resumeText)
  const model = await readResumeWithModel(input.resumeText)

  const fields: ParsedFields = model
    ? {
        ...deterministic.fields,
        currentTitle: model.currentTitle ?? deterministic.fields.currentTitle,
        employer: model.employer ?? deterministic.fields.employer,
        yearsExperience: model.yearsExperience ?? deterministic.fields.yearsExperience,
        city: model.city ?? deterministic.fields.city,
        skills: model.skills,
        domain: model.domain,
      }
    : deterministic.fields

  const warnings = keepStillTrue(deterministic.warnings, fields)

  const years = input.yearsExperience ?? fields.yearsExperience
  if (years === undefined) {
    warnings.push(
      'We could not read your years of experience, so this score assumes none. ' +
        'Tell us the real figure — it moves this number more than anything else on the page.'
    )
  }

  /**
   * preferredRole defaults to the candidate's CURRENT title, never to the
   * pasted JD's title.
   *
   * ⚠️ THIS IS THE ONE PLACE THIS SURFACE COULD QUIETLY INFLATE ITSELF.
   * titleAffinity() scores preferredRole against the posting's title and is
   * worth 28 of 100. Defaulting preferredRole to the JD's own title would
   * score every pasted JD a perfect 28 for free — every score would rise by up
   * to 28 points relative to the identical role on /today, and the tool would
   * be flattering rather than answering. The candidate pasting a JD has
   * self-selected for wanting it; what they are actually asking is whether
   * their BACKGROUND fits, which is what their current title measures.
   */
  const profile: CandidateProfile = {
    yearsExperience: years ?? 0,
    currentTitle: fields.currentTitle,
    city: fields.city,
    credential: fields.credential,
    preferredRole: input.preferredRole ?? fields.currentTitle,
    skills: fields.skills,
  }

  if (!profile.preferredRole) {
    warnings.push(
      'We could not read your current job title, so the title match is scored as unknown rather than as a fit.'
    )
  }
  if (!profile.city) {
    warnings.push('We could not read your city, so the location component is scored as unstated.')
  }

  // activeProvider() reports what is CONFIGURED; `model` reports what actually
  // answered. Only the second is true, so a configured provider that timed out
  // is reported as null rather than credited with a read it did not do.
  return { profile, warnings, provider: model ? activeProvider() : null }
}

/**
 * Score a pasted JD against a pasted résumé.
 *
 * Throws JdMatchError only for input too short to mean anything. Every other
 * shortfall — no model, no title, no years, no city — degrades to a scored
 * result carrying a warning, because a candidate who pasted two things and got
 * an error learned nothing.
 */
export async function matchJdToResume(input: JdMatchInput): Promise<JdMatchResult> {
  if (input.jdText.trim().length < MIN_JD_CHARS) {
    throw new JdMatchError('Paste the full job description — this looks too short to read.')
  }
  if (input.resumeText.trim().length < MIN_RESUME_CHARS) {
    throw new JdMatchError('Paste your full résumé — this looks too short to read.')
  }

  const { profile, warnings, provider } = await buildProfile(input)

  const title = input.jdTitle?.trim() || guessTitle(input.jdText)
  if (!input.jdTitle?.trim()) {
    warnings.push(
      title
        ? `We read the role title as "${title}". Correct it if that is wrong — it carries more of this score than any other single field.`
        : 'We could not find the role title in what you pasted. Add it — it carries more of this score than any other single field.'
    )
  }

  const locationRaw = input.jdLocation?.trim() ?? ''
  if (!locationRaw) {
    warnings.push('No location in the posting, so location is scored as unstated rather than against you.')
  }

  // extractAll() reads the requirements the posting STATES, each carrying the
  // sentence it came from. That is what makes the result checkable rather than
  // merely confident — the candidate can find the line in their own tab.
  const requirements = extractAll(input.jdText, locationRaw, title ?? '')

  /**
   * ⚠️ WORK MODE IS OMITTED ON THIS SURFACE, AND THAT IS A CORRECTION, NOT A
   * SIMPLIFICATION.
   *
   * workModeFit() awards FULL MARKS when no preference is set — reasonable on
   * /today, where the candidate answered the question during onboarding and
   * "no preference" is a real answer. Nobody answers it when pasting a JD, so
   * including the component handed every single result 7 free points.
   *
   * Measured across four candidates before this line existed: a strong match,
   * a fresher in the wrong field, a mismatched analyst and an overqualified
   * director ALL scored work_mode 7/7. A component that returns the same value
   * for every candidate is not measuring anything — it is raising the floor,
   * on a public tool whose credibility rests on the number meaning something.
   *
   * The total is normalised over the components that apply, so this does not
   * push scores down; it stops counting a question we never asked.
   *
   * Credential is deliberately KEPT. "No credential required" is a finding
   * about the POSTING, read from its text — not an assumption about the
   * candidate — so it is earned in a way work mode is not.
   */
  const breakdown = scoreRole(
    profile,
    { title: title ?? '', description: input.jdText, locationRaw: locationRaw || undefined },
    requirements,
    { omit: ['work_mode'] }
  )

  /**
   * ⚠️ THE SKILLS COMPONENT DISAPPEARS WITHOUT A MODEL, AND THAT MUST BE SAID.
   *
   * The deterministic parser reads city, title, employer, years and credential;
   * it does NOT read skills — only src/lib/parse/llm.ts does. scoreRole() then
   * drops a component with nothing to score and normalises the total over the
   * components that DID apply, so the candidate is not penalised — that part is
   * correct and deliberate.
   *
   * But this surface's whole promise is that it shows its working, and a
   * breakdown that silently arrives with five rows instead of six on a page
   * that never mentions a sixth is the score explaining less than it claims.
   * Cheap to say, so say it.
   */
  if (!breakdown.components.some((c) => c.key === 'skills')) {
    warnings.push(
      profile.skills?.length
        ? 'The posting names none of your skills in enough detail to score, so skills are left out of this total rather than counted against you.'
        : 'We could not read a skills list from your résumé, so skills are left out of this total rather than counted against you.'
    )
  }

  return { breakdown, reason: summarise(breakdown), requirements, profile, warnings, provider }
}
