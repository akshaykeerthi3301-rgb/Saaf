import { extractAll } from '@/gates/extract'
import { CONFIDENCE_THRESHOLD, type TypedRequirement } from '@/gates/types'
import { groundingFailure, matchedSkills, type CandidateFacts, type RoleFacts } from '@/lib/tailor'

/**
 * Cookie's interview prep — five questions built from THIS candidate's actual
 * gaps against THIS posting.
 *
 * ⚠️ DETERMINISTIC, AND THAT IS WHAT MAKES IT SAFE TO SHIP FIRST. Every
 * question below is assembled from two things already in evidence: a
 * requirement the posting states in its own words, and a fact the candidate
 * confirmed. Nothing is generated, so nothing can be invented — the fabrication
 * guarantee holds structurally here rather than by a filter catching a model
 * afterwards.
 *
 * That is a deliberate sequencing choice, not a shortcut. `docs/ROADMAP.md`
 * says of the generator tasks: "Do this once the guard is built and trusted,
 * not before." The guard IS built — groundingFailure() in src/lib/tailor.ts,
 * eleven tests — and a question phrased by a model is a strictly larger surface
 * than a bullet, because a question invents a premise ("tell me about the time
 * you grew AUM 40%") that the candidate then has to answer. Getting the gap
 * ANALYSIS right and provably grounded is the half that has to exist first;
 * a model phrasing pass layers on top of this contract without changing it.
 *
 * ⚠️ EVERY QUESTION IS PUT THROUGH groundingFailure() ANYWAY. Nothing here can
 * currently fail it — the templates are built from confirmed facts. The check
 * runs because the day someone adds a model phrasing pass, the guard must
 * already be on the path rather than something they have to remember to add.
 */

export type PrepQuestion = {
  id: string
  /** What the interviewer will probe, in their words. */
  question: string
  /**
   * Why this will come up, tied to a specific line in the posting or a
   * specific fact on the profile. The candidate can check it.
   */
  because: string
  /** The sentence from the posting this came from, when there is one. */
  evidence?: string
  /** What a strong answer contains. Structure, never a script to recite. */
  answerWith: string
  kind: 'experience' | 'skill-gap' | 'skill-strength' | 'credential' | 'motivation'
  /**
   * Terms in `question` that came from the POSTING rather than being asserted
   * about the candidate — a skill it names, the bar it states. Masked before
   * the fabrication guard runs; see isGrounded() for why that is narrow rather
   * than lenient.
   */
  quoted?: string[]
}

export type PrepPlan = {
  questions: PrepQuestion[]
  /** Skills the posting names that the profile does not. The real gaps. */
  gaps: string[]
  /** Skills on both sides. What to lead with. */
  strengths: string[]
}

/** Five is the brief, and five is also about what a person rehearses. */
const TARGET = 5

function confident(reqs: TypedRequirement[], kind: TypedRequirement['kind']) {
  return reqs.filter((r) => r.kind === kind && r.confidence >= CONFIDENCE_THRESHOLD)
}

/**
 * Skills the posting names that the candidate's profile does not hold.
 *
 * Deliberately drawn from the SKILLS THE POSTING ACTUALLY NAMES rather than
 * from a taxonomy of what the role "should" require. A gap invented from a
 * category is the same failure as a fabricated bullet, pointed at the
 * candidate's confidence instead of at their CV.
 */
function skillGaps(me: CandidateFacts, role: RoleFacts): string[] {
  // ⚠️ NEWLINE, NOT A SPACE. extractSkillPhrases splits on newlines, so joining
  // with a space makes the title and the description's first line into one
  // line — and the title then gets sliced on its own commas and offered back
  // as a gap. Measured 2026-09-15: the role "Manager II, Software Engineering"
  // listed "Manager II" as a skill the candidate was missing.
  const text = `${role.title}\n${role.description ?? ''}`
  const held = new Set(me.skills.map((s) => s.toLowerCase().trim()))
  const gaps: string[] = []

  // Only skills the candidate could plausibly be asked about: named in the
  // posting, absent from the profile, and specific enough to prepare for.
  for (const raw of extractSkillPhrases(text)) {
    const k = raw.toLowerCase()
    if (held.has(k)) continue
    if ([...held].some((h) => h.includes(k) || k.includes(h))) continue
    if (!gaps.includes(raw)) gaps.push(raw)
  }
  return gaps.slice(0, 6)
}

/**
 * Candidate skill phrases out of a posting, without a taxonomy.
 *
 * Postings list skills in two shapes and this reads both: a comma-separated run
 * inside a requirement line, and a capitalised proper noun (SQL, Figma, Python).
 * Crude on purpose — a false positive costs one question the candidate skips,
 * a taxonomy costs a maintenance surface and still misses whatever is new.
 */
/**
 * The measured skill vocabulary. Built by scripts/build-skill-vocabulary.ts
 * against the live index and committed as data, the same way
 * role-keywords.json is — this module must stay pure, and a test asserts it.
 */
import SKILL_DATA from '@/lib/taxonomy/skills.json'
const SKILLS = new Set(Object.keys(SKILL_DATA.terms))

/**
 * Skill terms a posting actually names.
 *
 * ⚠️ IT MATCHES A VOCABULARY. IT NO LONGER SLICES PROSE, AND THAT IS THE FIX.
 * The previous version split any line containing the word "experience" on its
 * commas and treated a capital letter as evidence of a skill. Pointed at 60
 * real postings on 2026-09-15 it asked candidates "How much have you worked
 * with Poland?" — because Poland, CRED, Coupang Eats and Determination all
 * carry a capital. 224 of 286 questions were that shape and the surface was
 * reverted the same day (Stage U).
 *
 * The vocabulary earns its entries by DISPERSION: a term is in it because at
 * least 12 distinct employers in our own index capitalise it mid-sentence.
 * A company name cannot pass that however often it is repeated — all its
 * mentions sit on one board — and an English word cannot pass it either,
 * because its capitals are nearly all sentence-initial. Places and employers
 * are additionally excluded from data the repo already holds.
 *
 * Casing comes back as the POSTING wrote it, so a candidate reads "Kubernetes"
 * and not "kubernetes".
 */
function extractSkillPhrases(text: string): string[] {
  const seen = new Map<string, string>()
  for (const m of text.matchAll(/\b([A-Za-z][A-Za-z0-9+#.]{1,19})\b/g)) {
    const raw = m[1]
    const k = raw.toLowerCase()
    if (!SKILLS.has(k)) continue
    // First spelling wins, and a capitalised one beats a lowercase one — the
    // posting's own heading is usually where the proper casing is.
    const prev = seen.get(k)
    if (!prev || (/^[a-z]/.test(prev) && /^[A-Z]/.test(raw))) seen.set(k, raw)
  }
  return [...seen.values()]
}

/**
 * Build the prep plan.
 *
 * Ordered by what an interviewer opens with, not by what is easiest to answer:
 * the experience bar first when there is one, because it is the objection that
 * ends interviews; then the gaps; then the strengths to lead with.
 */
export function buildPrepPlan(me: CandidateFacts, role: RoleFacts): PrepPlan {
  const requirements = extractAll(role.description ?? '', '', role.title)
  const strengths = matchedSkills(me, role)
  const gaps = skillGaps(me, role)
  const questions: PrepQuestion[] = []

  // ---- the experience bar -------------------------------------------------
  const years = confident(requirements, 'experience_years')
    .map((r) => r.minYears)
    .filter((n): n is number => n !== undefined)
  const bar = years.length ? Math.max(...years) : undefined
  const held = me.yearsExperience

  if (bar !== undefined && held !== null && held < bar) {
    const source = confident(requirements, 'experience_years').find((r) => r.minYears === bar)
    questions.push({
      id: 'experience-short',
      kind: 'experience',
      question: `This role asks for ${bar} years and you have ${held}. Why are you the right person for it anyway?`,
      because: `The posting states ${bar} years and your profile records ${held}. This is the first objection in the room, and the one most likely to end the conversation early if it is met with an apology.`,
      evidence: source?.sourceQuote,
      answerWith:
        'Scope, not tenure. Name one thing you owned end to end that a person two years further along would recognise as their own work — then say what you would need to learn here, specifically. Do not dispute the gap; a candidate arguing the arithmetic has already conceded it.',
    })
  } else if (bar !== undefined && held !== null) {
    const source = confident(requirements, 'experience_years').find((r) => r.minYears === bar)
    questions.push({
      id: 'experience-meets',
      kind: 'experience',
      question: `Walk me through the ${held} years on your CV — what changed between the start and now?`,
      because: `You clear the stated bar of ${bar} years, so the question stops being whether you qualify and becomes what the time actually bought. That is harder, not easier.`,
      evidence: source?.sourceQuote,
      answerWith:
        'A trajectory, not a list. Two or three decisions that got harder over time, and what you do differently now because of them.',
    })
  }

  // ---- the credential -----------------------------------------------------
  const credReq = confident(requirements, 'credential')[0]
  const heldCred = me.credential && me.credential !== 'none' ? me.credential : null
  if (credReq?.credential && credReq.credential !== heldCred) {
    questions.push({
      id: 'credential-gap',
      kind: 'credential',
      question: `The posting names ${credReq.credential} and your profile does not record it. How do you want to handle that?`,
      because: `A credential is the one requirement that cannot be argued down in the room — it is binary, and they will already know before you speak.`,
      evidence: credReq.sourceQuote,
      answerWith:
        'Say it first, in one sentence, and move to what you have instead — the work the credential is a proxy for. If you are studying for it, give the date you sit it. If you are not, do not imply that you are.',
    })
  }

  // ---- the gaps -----------------------------------------------------------
  for (const gap of gaps) {
    if (questions.length >= TARGET) break
    questions.push({
      id: `gap-${gap.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'skill-gap',
      question: `How much have you worked with ${gap}?`,
      because: `The posting names ${gap} and your profile does not list it. This is where an interviewer finds out whether the CV was written for the filter.`,
      quoted: [gap],
      answerWith: `The honest boundary of what you have done, then the nearest thing you have done properly. "I have not run ${gap}; I have done X, which shares Y" is a strong answer. Claiming it and being probed is the failure mode this question exists to prevent.`,
    })
  }

  // ---- the strengths ------------------------------------------------------
  for (const skill of strengths) {
    if (questions.length >= TARGET) break
    questions.push({
      id: `strength-${skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'skill-strength',
      question: `Tell me about a time you used ${skill} to make a decision, not just to produce output.`,
      because: `${skill} is on your profile and named in this posting, so it will be probed rather than accepted. The difference between listing it and being credible on it is a specific instance.`,
      quoted: [skill],
      answerWith: `One concrete instance: the question you were answering, what ${skill} told you, and what you did differently as a result.`,
    })
  }

  // ---- motivation, only if there is room ----------------------------------
  if (questions.length < TARGET) {
    questions.push({
      id: 'motivation',
      kind: 'motivation',
      question: `Why this role at ${role.company || 'this company'}, and why now?`,
      because:
        'Asked in almost every interview and prepared for in almost none. It is also the question where a candidate applying widely is easiest to spot.',
      answerWith:
        'Something true about this posting that would not be true of a similar one — a product, a market, a line in the description. Generic enthusiasm reads as volume applying, which is the thing this product exists to help you avoid.',
    })
  }

  return {
    questions: questions.filter((q) => isGrounded(q, me, role, bar, credReq?.credential)).slice(0, TARGET),
    gaps,
    strengths,
  }
}

/**
 * Put a question through the fabrication guard — with the posting's OWN stated
 * requirements masked first.
 *
 * ⚠️ THIS EXISTS BECAUSE THE GUARD REJECTED EVERY QUESTION THIS FILE PRODUCES,
 * AND THE GUARD WAS NOT WRONG. groundingFailure() answers one question: does
 * this text CLAIM something about the candidate that their profile does not
 * support? "This role asks for 5 years and you have 3" states 5 years, so the
 * tenure rule fires; the credential question names CFA, so the credential rule
 * fires. Both are correct readings of a sentence whose subject is the
 * candidate — and wrong for a sentence whose subject is the posting.
 *
 * ⚠️ THE FIX IS NOT TO RELAX THE SHARED GUARD, AND THAT MATTERS. Making
 * groundingFailure() accept any figure that appears in the posting would let a
 * CV bullet read "8 years of transformation" for a three-year candidate purely
 * because the posting asked for eight — which is the exact fabrication it was
 * built to stop, arriving through the front door. src/lib/tailor.ts already
 * makes this distinction for COMPANY names via its `role` parameter and
 * documents why; this is the same distinction for years and credentials, kept
 * local to the surface that needs it rather than pushed into the shared rule.
 *
 * The masking is deliberately NARROW: only the exact bar extracted from this
 * posting, and only the exact credential this posting names. Everything else —
 * invented metrics, foreign employers, any other tenure figure — still reaches
 * the guard untouched. A test asserts that a question carrying a fabricated
 * metric or a stranger's employer still fails.
 */
function isGrounded(
  q: PrepQuestion,
  me: CandidateFacts,
  role: RoleFacts,
  postingBar: number | undefined,
  postingCredential: string | undefined
): boolean {
  let text = q.question
  if (postingBar !== undefined) {
    text = text.replace(new RegExp(`\\b${postingBar}\\s*\\+?\\s*years?\\b`, 'gi'), 'the stated bar')
  }
  if (postingCredential) {
    text = text.replace(new RegExp(`\\b${postingCredential}\\b`, 'gi'), 'that credential')
  }

  /**
   * ⚠️ WITHOUT THIS, EVERY GAP QUESTION ABOUT A CAPITALISED TECHNOLOGY WAS
   * SILENTLY DROPPED — which is most of them, for most technical roles.
   *
   * The guard's company rule rejects a capitalised word that is not on the
   * profile. A GAP question names something not on the profile by definition:
   * "How much have you worked with Kubernetes?" is the whole feature. Observed
   * during the build — the plan came back with three questions instead of five
   * and no error, because the guard's `posting` scope is title + company and
   * these terms come from the description.
   *
   * Masked rather than exempted: each term was read out of THIS posting's text
   * by extractSkillPhrases, so it is quoted evidence, and only that exact term
   * is masked. A metric, a stranger's employer, or any other capitalised word
   * still reaches the guard.
   */
  for (const term of q.quoted ?? []) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), 'that area')
  }

  /**
   * ⚠️ CHECKED SENTENCE BY SENTENCE, BECAUSE THE GUARD ASSUMES ONE SENTENCE.
   *
   * groundingFailure()'s company rule scans capitalised words `.slice(1)` — it
   * skips the first word because a bullet begins with a capital and that is not
   * a company name. A QUESTION is two sentences ("... and you have 3. Why are
   * you the right person?"), so the capital opening the second sentence reached
   * the rule and every question in this file was rejected with
   * `names "Why", which is not on your profile`.
   *
   * The guard is not wrong; its unit is a sentence. Feeding it sentences is the
   * fix, and it is strictly SAFER than relaxing the rule: each sentence still
   * gets the full check, and a real company name anywhere but a sentence's
   * first word still fails.
   */
  return text
    .split(/(?<=[.?!])\s+/)
    .filter((sentence) => sentence.trim().length > 0)
    .every((sentence) => groundingFailure(sentence.trim(), me, role) === null)
}
