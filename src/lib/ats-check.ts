import { type ParsedFields } from '@/lib/parse/extract'
import { parseCoverage, type ParseCoverage, type ResumeSections } from '@/lib/parse/sections'
import { resumeFacts } from '@/lib/parse/facts'
import { dateRangeYears, openEnded, MONTH } from '@/lib/parse/dates'
import {
  timeline, gaps, progressed, skillsWithoutEvidence, leadershipEvidence, seniorityBand,
} from '@/lib/resume-history'

/**
 * TASK-061 — the ATS résumé checker.
 *
 * ⚠️ DETERMINISTIC, AND NO LANGUAGE MODEL ANYWHERE ON THIS PATH. Every finding
 * below is a rule with a reason and a quotable line from the candidate's own
 * document. That is not a cost decision: a model asked "is this résumé good?"
 * produces confident advice it cannot justify, which is the same failure the
 * scorer exists to argue against. A checker that cannot show the line it
 * objected to is a horoscope.
 *
 * ⚠️ THE VOICE MATTERS AS MUCH AS THE RULES. These findings describe what a
 * PARSER will do with the document — never what kind of person wrote it. The
 * consistency checks in particular read as accusations if worded carelessly:
 * two roles both marked "Present" is an ambiguity a parser resolves against the
 * candidate, not evidence of a lie, and it is written that way. `docs/PRODUCT.md`
 * is explicit that telling someone the truth about their fit must not
 * demoralise them, and a tool that implies dishonesty over a formatting
 * artefact would be the worst version of that failure.
 *
 * NO DATABASE, NO STORAGE, same as src/lib/jd-match.ts — the résumé arrives as
 * text, is read, and is dropped. A test asserts this module never acquires a
 * client.
 */

import ROLE_KEYWORDS from '@/lib/taxonomy/role-keywords.json'

export type AtsSeverity = 'high' | 'medium' | 'low'

/**
 * `parsing`     — the machine cannot read the document reliably.
 * `keywords`    — the document reads as written for a filter, not a person.
 * `consistency` — two things in the document disagree, and a parser must guess.
 */
export type AtsArea = 'parsing' | 'keywords' | 'consistency'

/**
 * The four groups the report is presented in.
 *
 * ⚠️ THIS IS A PRESENTATION AXIS, NOT A SECOND CLASSIFICATION. `area` says what
 * KIND of problem a finding is and drives the wording; `category` says where it
 * sits on the report, so a candidate reads four short lists instead of one long
 * one and can see which part of their résumé is weakest. The category leader in
 * this space groups 27 checks into seven headings for exactly that reason — a
 * flat list of findings is read as a wall and acted on in the order written,
 * which is the order we happened to run the rules in.
 *
 * Four, not seven: the three we do not have (recruiter red flags, bias signals,
 * seniority fit) all require judging the person rather than parsing the file,
 * and this module is deterministic by design. An empty category is worse than
 * an absent one.
 */
export type AtsCategory =
  | 'ats_essentials'
  | 'sections'
  | 'content'
  | 'tailoring'
  | 'red_flags'
  | 'bias'
  | 'seniority'

export type AtsFinding = {
  id: string
  area: AtsArea
  category: AtsCategory
  severity: AtsSeverity
  /** What is wrong, in one line. */
  title: string
  /** Why a parser cares. Always mechanical, never a judgement of the writer. */
  detail: string
  /** What to change. Concrete enough to act on without further advice. */
  fix: string
  /** The candidate's own text this came from, so the finding is checkable. */
  evidence?: string
}

export type AtsCategoryScore = {
  key: AtsCategory
  label: string
  /** Out of 100, deducted only by findings in this category. */
  score: number
  /** How many rules in this category ran, and how many the résumé passed. */
  passed: number
  total: number
}

export type AtsReport = {
  findings: AtsFinding[]
  /** The same findings, grouped and scored per category, for the report UI. */
  categories: AtsCategoryScore[]
  /**
   * Out of 100, with every deduction itemised. Never a number on its own.
   *
   * `points` is each finding's TRUE MARGINAL COST — the score recomputed with
   * that finding removed, minus the score with it. Under the old flat model the
   * printed cost and the real one were the same number by construction; under a
   * weighted, renormalised model they are not, and printing the nominal
   * severity cost would put a figure on screen that the arithmetic does not
   * support. This repo's whole argument is that a score should be reproducible
   * by the person reading it.
   */
  readability: {
    score: number
    deductions: { id: string; title: string; points: number }[]
  }
  /** How much of the document the parser could interpret — half the score. */
  coverage: ParseCoverage
  /**
   * What our own deterministic parser got out of the document.
   *
   * This is the checker's most honest signal and the reason it reuses
   * src/lib/parse/extract.ts rather than reimplementing field-finding: an ATS
   * and this parser are looking for the same things in the same places, so a
   * field OUR parser misses is a field a real one plausibly misses too. It is
   * a demonstration rather than a claim — the candidate sees exactly what a
   * machine took away from their document.
   */
  read: Pick<ParsedFields, 'currentTitle' | 'employer' | 'city' | 'yearsExperience' | 'credential'>
  stats: { characters: number; words: number; lines: number }
  /**
   * The role the check was run against, when one was chosen, and what the
   * comparison found. Absent when no role was selected — the formatting checks
   * are role-agnostic and run either way.
   */
  role?: {
    name: string
    /** How many postings for this role the terms were measured across. */
    postings: number
    present: string[]
    missing: string[]
  }
}

/**
 * Terms real postings use for a role, measured rather than asserted.
 *
 * Built by scripts/build-role-keywords.ts against the live index and committed
 * as JSON, because this module must not touch a database — see the header. Each
 * entry records how many postings it was measured over, so a finding can say
 * "named in most of the 199 Product Manager postings we index" instead of
 * "experts recommend", which is the kind of unverifiable advice this product
 * exists to argue against.
 */
type RoleKeywords = Record<string, { terms: string[]; postings: number; coverage?: Record<string, number>; medianYears?: number }>
const KEYWORDS = ROLE_KEYWORDS as RoleKeywords

/** Role names the checker can compare against. Used by the form's picker. */
export function rolesWithKeywords(): string[] {
  return Object.keys(KEYWORDS).sort()
}

/**
 * The measured vocabulary for one role, or undefined if we have none.
 *
 * Exported so the rewrite aims at the same terms the report told the candidate
 * were missing. Two surfaces reading two different keyword lists would produce
 * a rewrite that does not fix the finding that prompted it.
 */
export function roleVocabulary(role: string): { terms: string[]; postings: number } | undefined {
  return KEYWORDS[role]
}

export type TermCoverage = {
  term: string
  /** Postings for this role, out of `postings`, whose text contains the term. */
  count: number
  /** The same as a percentage, rounded — what the surface actually shows. */
  pct: number
  /** Whether the candidate's résumé already contains it. */
  present: boolean
}

/**
 * How common each of a role's terms actually is, and whether the résumé has it.
 *
 * ⚠️ THIS IS THE ONE THING THE CATEGORY LEADER CANNOT COMPUTE, and it is worth
 * being precise about why. Their tailoring reads ONE job ad the candidate
 * brings, so it can say "this posting wants Kafka" but never "4% of postings
 * for this role want Kafka, and 88% want something you already have". A single
 * ad is a sample of one; rewriting a résumé around its idiosyncrasies makes the
 * document worse for every other posting, and nothing in a product without an
 * index can warn you. We hold 21,813 India roles from employers' own boards, so
 * we can rank a missing word by how much of the market actually asks for it.
 *
 * Sorted by coverage, because that is the order worth fixing them in.
 */
export function marketCoverage(role: string, resumeText: string): TermCoverage[] {
  const entry = KEYWORDS[role]
  if (!entry?.coverage) return []
  const hay = resumeText.toLowerCase()
  return entry.terms
    .map((term) => {
      const count = entry.coverage![term] ?? 0
      return {
        term,
        count,
        pct: Math.round((count / entry.postings) * 100),
        present: hay.includes(term),
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

/**
 * Requirements a pasted posting asks for, split by how typical they are.
 *
 * `standard` are words most postings for this role use — worth writing into a
 * résumé, because they pay off across every application. `specific` are this
 * employer's own vocabulary: worth mirroring in THIS application and not worth
 * reshaping a résumé around. Nobody can draw that line from the ad alone.
 */
export function jdVersusMarket(
  role: string,
  jdText: string,
): { standard: TermCoverage[]; specific: string[] } {
  const entry = KEYWORDS[role]
  const jd = jdText.toLowerCase()
  if (!entry?.coverage) return { standard: [], specific: [] }

  const standard = entry.terms
    .filter((t) => jd.includes(t))
    .map((t) => ({
      term: t,
      count: entry.coverage![t] ?? 0,
      pct: Math.round(((entry.coverage![t] ?? 0) / entry.postings) * 100),
      present: false,
    }))
    .sort((a, b) => b.pct - a.pct)

  /**
   * Words the posting leans on that the role's own vocabulary does not carry.
   * Deliberately crude — capitalised or hyphenated tokens repeated in the ad —
   * because the claim it supports is soft ("this employer says this a lot"),
   * and a soft claim must not be dressed as a measurement.
   */
  const counts = new Map<string, number>()
  for (const raw of jdText.split(/[^A-Za-z+#.-]+/)) {
    const w = raw.trim()
    if (w.length < 3 || w.length > 24) continue
    const lower = w.toLowerCase()
    if (entry.terms.includes(lower) || STOPWORDS.has(lower)) continue
    if (!/^[A-Z]/.test(w) && !w.includes('-') && !/[+#.]/.test(w)) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  const specific = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w)

  return { standard, specific }
}

/** Shortest input that can be assessed at all. */
export const MIN_RESUME_CHARS = 120
export const MAX_RESUME_CHARS = 20_000

export class AtsCheckError extends Error {}

/**
 * ⚠️ THE SCORE IS NO LONGER `100 − Σ {high: 18, medium: 9, low: 4}`, AND THAT
 * FLAT SUBTRACTIVE SHAPE WAS WHY IT NEVER RESEMBLED A REAL ATS SCORE.
 *
 * Flat subtractive costs have three defects, all measured: the headline number
 * and the per-category bars were computed separately and never reconciled; six
 * findings saturated the score at 0 no matter what else was true; and the
 * `passed`/`total` fractions on screen fed nothing at all.
 *
 * The replacement has the two parts the category leader's own documentation
 * describes — "the proportion of content we can interpret", plus an assessment
 * of what is in it. The first half is `parseCoverage`, which this repo had
 * already been computing and discarding for weeks.
 */
const PARSE_WEIGHT = 0.35

/**
 * What one finding costs ITS OWN CATEGORY, in points out of that category's 100.
 *
 * ⚠️ NOT A SHARE OF THE CHECK COUNT. Dividing by how many rules a category
 * happens to contain made severity meaningless: `multi-column` is one of eight
 * ATS-essentials rules, so a finding whose own copy says "blocks parsing" moved
 * the final score by two points. How much a defect matters cannot depend on how
 * many other things we thought to check alongside it.
 */
const SEVERITY_CATEGORY_COST: Record<AtsSeverity, number> = { high: 40, medium: 18, low: 7 }

/**
 * Category weights, summing to 100 across all seven.
 *
 * Ordered by what actually stops a résumé being read rather than by how much
 * there is to say about each: a document that will not parse fails before any
 * question of content arises, and bias signals — while worth naming — change
 * nothing about machine readability. Renormalised over whichever categories
 * ran, so a check with no target role does not silently score as a pass.
 */
const CATEGORY_WEIGHT: Record<AtsCategory, number> = {
  ats_essentials: 25,
  sections: 15,
  content: 25,
  tailoring: 10,
  red_flags: 10,
  seniority: 10,
  bias: 5,
}

/** A finding before it is placed in a category — see the note in checkResume. */
type RawFinding = Omit<AtsFinding, 'category'>

/**
 * Every rule this module can raise, in the group it is reported under.
 *
 * ⚠️ THE LIST IS THE DENOMINATOR. "Passed 6 of 8" is only true if this holds
 * every rule in the category, so a new rule must be added here as well as
 * written — a rule missing from this table is scored but not counted, and the
 * report quietly overstates how much was checked. A test asserts every id
 * raised by checkResume appears here.
 */
const RULES: Record<AtsCategory, { label: string; ids: string[] }> = {
  ats_essentials: {
    label: 'ATS essentials',
    ids: [
      'multi-column', 'single-blob', 'no-email', 'no-phone', 'no-dates',
      'date-format-mixed', 'resume-length', 'no-links', 'unprofessional-email',
    ],
  },
  sections: {
    label: 'Résumé sections',
    ids: ['missing-sections', 'section-order', 'separator-header', 'contact-incomplete'],
  },
  content: {
    label: 'Content',
    ids: [
      'title-unreadable', 'title-misread', 'employer-unreadable', 'no-quantified-impact', 'weak-openers',
      'bullet-too-long', 'keyword-dump', 'repeated-term', 'overlapping-present',
      'years-disagree', 'future-date', 'spelling-common', 'doubled-word',
      'bullet-punctuation',
      'action-verb-coverage', 'unevidenced-claims',
    ],
  },
  tailoring: {
    label: 'Job tailoring',
    /**
     * ⚠️ `action-verb-coverage` USED TO LIVE HERE AND LEAKED. It fires on any
     * résumé with three bullets, target role or not — but this whole category
     * is dropped from the grouped view when no role was chosen, so its cost hit
     * the headline score from a category the reader could not open. Whether a
     * bullet opens with a verb is a property of the writing, not of the role
     * being targeted, so it belongs in `content` and is scored there.
     */
    ids: ['role-vocabulary', 'title-not-targeted', 'jd-missing-standard'],
  },
  /**
   * ⚠️ THE THREE CATEGORIES THIS FILE ONCE SAID IT WOULD NEVER HAVE, and the
   * reason it changed is worth recording rather than quietly reversing.
   *
   * The original note said recruiter red flags, bias and seniority "all require
   * judging the person rather than parsing the file". That is true of how the
   * category leader implements them — a model reading a résumé and forming an
   * opinion about the human behind it. It is NOT true of the questions
   * themselves. A six-month gap between two dated roles is arithmetic. A skill
   * listed and never mentioned again is a set difference. Whether the titles
   * moved forward is an ordering over words the candidate wrote.
   *
   * So these are built the way everything else here is built: measured from the
   * document, quoting it back, with no model anywhere on the path. What we
   * refuse to do is the part that requires an opinion — see `bias` below, and
   * the LinkedIn check we cannot legally build at all.
   */
  red_flags: {
    label: 'Recruiter red flags',
    ids: ['employment-gap', 'short-tenure', 'skills-not-evidenced'],
  },
  bias: { label: 'Bias & discrimination', ids: ['age-signal', 'dated-experience'] },
  seniority: { label: 'Seniority & impact', ids: ['career-progression', 'leadership-evidence', 'seniority-benchmark'] },
}

const CATEGORY_OF: Record<string, AtsCategory> = Object.fromEntries(
  Object.entries(RULES).flatMap(([cat, { ids }]) => ids.map((id) => [id, cat as AtsCategory])),
)

/**
 * Which group a rule is reported under, or null if it is not registered.
 *
 * Exported for the test that keeps RULES honest: a rule raised by checkResume
 * but absent here is scored yet not counted, so "passed 6 of 8" would be
 * arithmetic over the wrong denominator.
 */
export function categoryOf(id: string): AtsCategory | null {
  return CATEGORY_OF[id] ?? null
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/
const PHONE_RE = /(?:\+?\d[\d\s-]{8,}\d)/
/** A link a parser can store. An icon hyperlink extracts as nothing at all. */
const LINK_RE = /(?:https?:\/\/|www\.)\S+|(?:linkedin\.com|github\.com|behance\.net|dribbble\.com)\/\S+/i
/** A figure attached to work — the shape ranking systems look for. */
const QUANTIFIED =
  /\d[\d,.]*\s*(%|percent|x\b|k\b|cr\b|crore|lakh|lakhs|mn\b|million|bn\b|billion)|[₹$€£]\s*\d|\b\d[\d,.]*\s*(users|customers|clients|accounts|engineers|analysts|people|reports|stores|cities|hours|days|weeks|months)\b|\bby \d/i
/**
 * Misspellings that actually appear on résumés, as a curated list.
 *
 * ⚠️ NOT A SPELLCHECKER, AND THE NAME OF THE CHECK SAYS SO. A real dictionary
 * is megabytes, flags every product name and every Indian surname, and would
 * make this module — which must stay deterministic, dependency-free and
 * shippable to the browser — into something else entirely. The category leader
 * lists "Spelling and grammar" among its 27 checks and runs a model for it.
 *
 * A curated list of the words people actually get wrong on a CV is smaller,
 * faster and honest about its own limits: it will never flag your employer's
 * name, and it will never claim your résumé is clean. Each entry is a word that
 * survives a spellchecker's autocorrect precisely because it is a real English
 * word or a near-miss nobody proofreads.
 */
export const MISSPELLINGS: Record<string, string> = {
  acheive: 'achieve', acheived: 'achieved', acheivement: 'achievement',
  reciept: 'receipt', recieve: 'receive', recieved: 'received',
  managment: 'management', mangement: 'management',
  responsibilty: 'responsibility', responsibilites: 'responsibilities', liason: 'liaison',
  seperate: 'separate', sucessful: 'successful', succesful: 'successful',
  sucessfully: 'successfully', enviroment: 'environment', developement: 'development',
  experiance: 'experience', knowlege: 'knowledge', accomodate: 'accommodate',
  occured: 'occurred', publically: 'publicly', teh: 'the', buisness: 'business',
  colaborate: 'collaborate', collaberation: 'collaboration', comitted: 'committed',
  garuntee: 'guarantee', immediatly: 'immediately', maintainance: 'maintenance',
  neccessary: 'necessary', occassion: 'occasion', persue: 'pursue', priorty: 'priority',
  proffesional: 'professional', reccomend: 'recommend', refered: 'referred',
  strategey: 'strategy', sucess: 'success', thier: 'their', trainning: 'training',
  writting: 'writing',
  // Added 2026-09-12 alongside the en-GB test below, which is what makes
  // growing this list safe rather than risky.
  abilties: 'abilities', adminstration: 'administration', aquired: 'acquired',
  assesment: 'assessment', begining: 'beginning', calender: 'calendar',
  carrer: 'career', challanging: 'challenging', comminication: 'communication',
  compitition: 'competition', consistant: 'consistent', curriculam: 'curriculum',
  decison: 'decision', definately: 'definitely', desicion: 'decision',
  develope: 'develop', diffrent: 'different', efficency: 'efficiency',
  elligible: 'eligible', excecutive: 'executive', familier: 'familiar',
  finacial: 'financial', flexable: 'flexible', goverment: 'government',
  guage: 'gauge', hierachy: 'hierarchy', implemetation: 'implementation',
  independant: 'independent', initate: 'initiate', inteligent: 'intelligent',
  intrested: 'interested', leadersip: 'leadership', lenght: 'length',
  negotation: 'negotiation', oppurtunity: 'opportunity', paticular: 'particular',
  performace: 'performance', personell: 'personnel', posession: 'possession',
  preformance: 'performance', presntation: 'presentation', proffesion: 'profession',
  proficent: 'proficient', programing: 'programming', recomendation: 'recommendation',
  relevent: 'relevant', requirment: 'requirement', reserach: 'research',
  resposible: 'responsible', supervisior: 'supervisor', techincal: 'technical',
  tecnology: 'technology', transfered: 'transferred', univeristy: 'university',
  vaild: 'valid', volunter: 'volunteer',
}

/**
 * Adjectives a résumé cannot prove.
 *
 * "Team player" and "hard working" are claims about character that no reader
 * can verify and no parser can score — they occupy the line a piece of evidence
 * could have used. Deliberately short and deliberately not moralising: the
 * finding says the line is unverifiable, never that the writer is padding.
 */
const UNEVIDENCED = [
  'team player', 'hard working', 'hard-working', 'go-getter', 'detail oriented',
  'detail-oriented', 'self motivated', 'self-motivated', 'results driven',
  'results-driven', 'think outside the box', 'passionate about', 'dynamic professional',
  'excellent communication skills', 'strong work ethic', 'proven track record',
]

/**
 * Past-tense openers that describe an action. Used to measure coverage, not
 * to prescribe a word — the list is illustrative of the shape, not exhaustive.
 *
 * ⚠️ MUST STAY DISJOINT FROM `WEAK_OPENER`. 'handled' sat in both, so a bullet
 * opening "Handled production incidents…" was simultaneously counted as strong
 * for action-verb coverage and flagged as weak — two findings disagreeing about
 * one line, on the same screen. It is a weak opener (it names a duty, not an
 * outcome) and has been removed from here. A test enforces the separation.
 */
export const ACTION_VERBS = new Set([
  'built', 'led', 'ran', 'owned', 'shipped', 'migrated', 'designed', 'developed',
  'delivered', 'launched', 'reduced', 'cut', 'improved', 'increased', 'automated',
  'scaled', 'rebuilt', 'wrote', 'created', 'managed', 'implemented', 'negotiated',
  'closed', 'grew', 'drove', 'set', 'introduced', 'replaced', 'consolidated',
  'streamlined', 'trained', 'mentored', 'audited', 'analysed', 'analyzed', 'forecast',
  'authored', 'oversaw', 'coordinated', 'supported', 'contributed',
  'rewrote', 'refactored', 'deployed', 'optimised', 'optimized', 'tested', 'maintained',
])

/** Openers that name a duty rather than an action. Disjoint from ACTION_VERBS. */
export const WEAK_OPENER =
  /^\s*(responsible for|worked on|helped (with|to)?|assisted (with|in)?|involved in|part of|tasked with|duties includ|handled)\b/i
/** "8+ years", "over 6 years of experience". */
const CLAIMED_YEARS_RE = /\b(?:over\s+|more\s+than\s+|about\s+)?(\d{1,2})\s*\+?\s*years?\b(?=[^.]{0,40}experience)/i

/**
 * Words that carry no signal and would otherwise dominate a repetition count.
 * Deliberately short: the check that uses it already requires a term to be both
 * frequent AND a meaningful share of the document, so the list only has to
 * remove the words that clear both bars in ordinary prose.
 */
const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'that', 'this', 'was', 'were', 'has', 'have', 'had',
  'are', 'our', 'their', 'his', 'her', 'its', 'into', 'over', 'across', 'using', 'used',
  'work', 'worked', 'working', 'team', 'teams', 'role', 'roles', 'company', 'led', 'built',
  'present', 'current', 'india', 'year', 'years', 'month', 'months',
])

/**
 * A multi-column or table layout, inferred from runs of whitespace.
 *
 * ⚠️ THIS IS THE HIGHEST-VALUE CHECK IN THE FILE AND THE MOST INVISIBLE
 * PROBLEM IT FINDS. Text extracted from a two-column PDF interleaves the
 * columns line by line, so "Senior Analyst" and an unrelated date from the
 * sidebar arrive as one line separated by a run of spaces. The document looks
 * immaculate to a human and shreds in a parser. A candidate has no way to see
 * this without extracting the text themselves, which is exactly why it belongs
 * in a tool rather than in advice.
 */
function looksMultiColumn(lines: string[]): { hit: boolean; sample?: string } {
  const suspect = lines.filter((l) => /\S {3,}\S/.test(l) || /\t/.test(l))
  const substantial = lines.filter((l) => l.trim().length > 20)
  if (substantial.length < 6) return { hit: false }
  return suspect.length / substantial.length > 0.18
    ? { hit: true, sample: suspect[0]?.slice(0, 120) }
    : { hit: false }
}

/** Overlapping open-ended roles: more than one entry marked Present/Current. */
/**
 * Roles with no end date.
 *
 * ⚠️ COUNTED FROM PARSED ENTRIES, NOT FROM TEXT MATCHES, AND THE DIFFERENCE IS
 * A FALSE FINDING. Counting "– Present" across the raw document tallies every
 * open-ended thing on the page, including side projects listed under their own
 * heading. On the founder's own résumé that produced "6 roles are both marked
 * as ongoing" against one current job and three ongoing projects — an
 * ambiguity the document does not actually contain, charged at three points.
 */
function openEndedRoles(structure: ResumeSections): number {
  return structure.experience.filter(
    (e) => !e.isProject && e.dates !== null && openEnded().test(e.dates),
  ).length
}

function earliestYear(text: string): number | undefined {
  const years = [...text.matchAll(dateRangeYears())].map((m) => Number(m[1])).filter(Boolean)
  return years.length ? Math.min(...years) : undefined
}

/**
 * What the PDF's geometry says, when we have it.
 *
 * ⚠️ SEVERAL CHECKS WERE GUESSING AT THIS FROM FLATTENED TEXT AND COULD NOT WIN.
 * `looksMultiColumn` hunts for runs of three spaces, because that is the only
 * trace a column layout leaves once the lines are gone — and the old extractor
 * collapsed exactly those runs before this file ever saw them. Passing the real
 * column count from `pdfToLayout` replaces a proxy with the fact. Optional, so
 * a pasted résumé (which genuinely has no geometry) still scores.
 */
export type LayoutFacts = {
  /** Text columns on the busiest page. 1 for an ordinary résumé. */
  columns: number
  /** x-positions recurring down the page — right-aligned dates, table cells. */
  alignedColumns: number
  pages: number
  /** A line found outside the first column, quoted back as evidence. */
  sample?: string
}

/**
 * Assess a résumé for machine readability.
 *
 * Throws only for input too short to assess. Everything else is a finding —
 * a checker that refuses to run teaches nothing.
 */
export function checkResume(
  resumeText: string,
  targetRole?: string,
  layout?: LayoutFacts,
  jdText?: string,
): AtsReport {
  const text = resumeText.trim()
  if (text.length < MIN_RESUME_CHARS) {
    throw new AtsCheckError('Paste your full résumé — this looks too short to check.')
  }
  if (text.length > MAX_RESUME_CHARS) {
    throw new AtsCheckError('That résumé is longer than we can read. Paste the most recent few roles.')
  }

  const lines = text.split(/\n/)
  const nonEmpty = lines.filter((l) => l.trim().length > 0)
  const words = text.split(/\s+/).filter(Boolean)
  /**
   * Findings are collected without their category and grouped once at the end.
   * The alternative — a `category` field at all 19 call sites — puts the same
   * fact in two places and lets a rule drift out of the group it is scored in.
   */
  const findings: RawFinding[] = []
  const add = (f: RawFinding) => findings.push(f)

  // Our own parser is the stand-in for theirs — see AtsReport['read'].

  /**
   * The document's shape, read by the same deterministic parser the rewrite
   * uses. Sharing it is the point: a bullet the rewrite will not see is a
   * bullet this check must not score, or the two surfaces disagree about the
   * same file in front of the same person.
   */
  const facts = resumeFacts(text)
  const f = facts.fields
  const structure = facts.sections
  const coverage = parseCoverage(structure, layout)

  /**
   * Title and employer come from `resumeFacts`, which owns the precedence
   * between the structured read and the regex one — see src/lib/parse/facts.ts
   * for why it has to live in one place. This file used to decide it inline,
   * and /resume decided it differently, so one résumé had two answers.
   */
  const readTitle = facts.fields.currentTitle
  const readEmployer = facts.fields.employer

  // ---- parsing ------------------------------------------------------------

  /**
   * ⚠️ THIS USED TO RUN ITS OWN REGEXES (`SECTION_PATTERNS`) OVER THE RAW TEXT,
   * a fourth copy of section detection alongside sections.ts's. The two
   * diverged the moment heading matching was widened: a résumé headed
   * "WHERE I'VE WORKED" parsed correctly into an experience section and was
   * then told it had no experience heading — the checker reporting a defect the
   * parser had already handled. One source of truth, and the finding now means
   * "our parser could not find this", which is the claim the copy makes.
   */
  const missingSections = (
    [
      ['experience', structure.order.includes('experience') || structure.experience.length > 0],
      ['education', structure.order.includes('education') || structure.education.length > 0],
      ['skills', structure.order.includes('skills') || structure.skills.length > 0],
    ] as [string, boolean][]
  )
    .filter(([, present]) => !present)
    .map(([label]) => label)
  if (missingSections.length) {
    add({
      id: 'missing-sections',
      area: 'parsing',
      severity: missingSections.length >= 2 ? 'high' : 'medium',
      // "a or b or c" reads as broken English in the rendered card; the Oxford
      // form is what a person would write. Seen in the live output, not guessed.
      title: `No ${
        missingSections.length > 1
          ? `${missingSections.slice(0, -1).join(', ')} or ${missingSections.at(-1)}`
          : missingSections[0]
      } heading a parser can find`,
      detail:
        'Applicant tracking systems split a résumé into sections before reading anything, and they do it by looking for ordinary headings. Content under a heading they cannot find is often dropped rather than misfiled.',
      fix: `Add a plain heading on its own line — ${missingSections
        .map((s) => `"${s[0].toUpperCase()}${s.slice(1)}"`)
        .join(', ')}. Plain text, no icon, no graphic.`,
    })
  }

  // The measured column count beats the whitespace proxy whenever we have it.
  /**
   * A working address that reads as a person's name.
   *
   * ⚠️ THE PROVIDER IS NEVER JUDGED, and that is a deliberate limit rather than
   * an oversight. Advice of the "get a Gmail address" kind is a class signal
   * dressed as technical guidance — rediffmail and yahoo addresses are ordinary
   * in India and parse identically. What actually costs a candidate anything is
   * a local part a recruiter has to read twice, so that is the only thing
   * measured: a long digit run, or one of a short list of words nobody chooses
   * for a work address. `ats-check.ts` previously had a comment saying this
   * check was "considered here and DELIBERATELY NOT WRITTEN"; what it was
   * missing was a form that says something checkable.
   */
  const emailMatch = text.match(EMAIL_RE)
  const localPart = emailMatch?.[0].split('@')[0] ?? ''
  const juvenile = /\b(cool|sexy|babe|hunk|killer|rockstar|ninja|guru|crazy|sweet|angel|devil)\b/i
  /**
   * ⚠️ A RUN OF DIGITS IS NOT THE PROBLEM, AND THE FIRST VERSION OF THIS CHECK
   * SAID IT WAS. It flagged any four consecutive digits, which fires on
   * "priyaiyer1998@…" and on the founder's own address — ordinary addresses
   * where a common name was already taken. Appending a number is what almost
   * everyone with a common name has had to do, and telling them it reads badly
   * is advice with nothing behind it.
   *
   * What actually costs a candidate anything is an address with no NAME in it
   * to connect back to them. So the test is for the absence of a usable
   * alphabetic run, not for the presence of digits.
   */
  const hasNameLikeRun = /[a-z]{4,}/i.test(localPart)
  if (localPart && (!hasNameLikeRun || juvenile.test(localPart))) {
    add({
      id: 'unprofessional-email',
      area: 'parsing',
      severity: 'low',
      title: 'Your email address does not read as your name',
      detail:
        'A recruiter copies this address by hand more often than you would think, and it is the one line of the résumé that reappears in every reply. A long run of digits or a nickname makes it easy to mistype and harder to connect back to you in a full inbox.',
      fix: 'Use some arrangement of your own name if the address is free — the provider does not matter and no system prefers one over another.',
      evidence: emailMatch?.[0],
    })
  }

  /**
   * Contact fields a parser could not recover, named individually.
   *
   * Distinct from `no-email` / `no-phone`, which ask whether the DOCUMENT
   * contains one. This asks whether our parser could attach it to the
   * candidate, which is the question an ATS actually answers when it builds a
   * profile row. Reads `coverage`, so it cannot disagree with the parse rate
   * printed beside it.
   */
  const contactGaps = coverage.fieldsMissing.filter((f) => f === 'name' || f === 'email' || f === 'phone')
  if (contactGaps.length > 0) {
    add({
      id: 'contact-incomplete',
      area: 'parsing',
      severity: contactGaps.length >= 2 ? 'medium' : 'low',
      title: `A parser could not pick out your ${new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(contactGaps)}`,
      detail:
        'Applicant tracking systems build a contact record before anybody reads the document, and a field they cannot attach is usually left blank rather than guessed. A blank name or phone number on that record is what makes an application hard to follow up even after somebody wants to.',
      fix: 'Put your name on its own line at the very top, with email and phone on the line directly beneath it — plain text, no icons, no text box.',
    })
  }

  const column = looksMultiColumn(lines)
  const multiColumn = layout ? layout.columns > 1 : column.hit
  if (multiColumn) {
    add({
      id: 'multi-column',
      area: 'parsing',
      severity: 'high',
      title: 'Looks like a two-column or table layout',
      detail:
        'Text extracted from side-by-side columns interleaves them line by line, so a job title can arrive joined to an unrelated date from the other column. The document looks correct to a person and arrives scrambled to the parser.',
      fix: 'Rebuild it as a single column, top to bottom. Sidebars, text boxes and tables are the usual cause.',
      evidence: layout?.sample ?? column.sample,
    })
  }

  /**
   * Line structure, measured as characters per line rather than as a line
   * count.
   *
   * An absolute threshold ("fewer than 4 lines and over 800 characters") gets
   * the shape right and the scale wrong: it misses a collapsed two-page résumé
   * that still has six lines, and it misses a short one entirely. The ratio is
   * scale-free — an ordinary résumé runs 30-60 characters per line, and a
   * document whose text extraction has lost its line breaks runs into the
   * hundreds. Measured on this project's own fixtures: 34 intact, 502 collapsed.
   */
  const charsPerLine = nonEmpty.length ? text.length / nonEmpty.length : text.length
  if (text.length >= 400 && charsPerLine > 250) {
    add({
      id: 'single-blob',
      area: 'parsing',
      severity: 'high',
      title: 'The document extracts as one unbroken block',
      detail:
        `Averaging ${Math.round(charsPerLine)} characters per line, where an ordinary résumé runs 30 to 60. With the line breaks gone, a parser cannot tell where one role ends and the next begins, so dates, titles and employers run together into a single field.`,
      fix: 'Check that each role, date and bullet is a real line in the document rather than a text box, a table cell or a manual run of spaces.',
    })
  }

  if (!EMAIL_RE.test(text)) {
    add({
      id: 'no-email',
      area: 'parsing',
      severity: 'high',
      title: 'No email address a parser can find',
      detail:
        'An email in a header, a footer or an image is invisible to most parsers. It is the field an application is keyed on, and a missing one can fail the application outright.',
      fix: 'Put your email as plain text in the body of the first few lines, not in the page header or a graphic.',
    })
  }
  if (!PHONE_RE.test(text)) {
    add({
      id: 'no-phone',
      area: 'parsing',
      severity: 'medium',
      title: 'No phone number a parser can find',
      detail: 'Same cause as a missing email: headers, footers and images are not read.',
      fix: 'Add your number as plain text near your email.',
    })
  }

  const dateMatches = [...text.matchAll(dateRangeYears())]
  if (dateMatches.length === 0) {
    add({
      id: 'no-dates',
      area: 'parsing',
      severity: 'high',
      title: 'No date ranges a parser can read',
      detail:
        'Tenure is computed from date ranges. Without one in a recognisable form, your years of experience read as zero — and experience is the single heaviest factor in most screens, including ours.',
      fix: 'Write each role\'s dates as "Mar 2021 - Present" or "2019 - 2021". Avoid "3 yrs" alone, which states a duration but no position in time.',
    })
  }

  /**
   * A role line built out of separators — "PRODUCT | PAYTM | LEADERSHIP".
   *
   * ⚠️ THIS CHECK EXISTS BECAUSE THE ONE BELOW IT WAS NOT ENOUGH, AND THE WAY
   * IT FAILED IS THE POINT. Asking "did our parser find a title?" assumes a
   * parser that cannot read a line returns nothing. It does not. Run against
   * this exact pattern, src/lib/parse/extract.ts returned currentTitle
   * "PRODUCT" and employer "ZETA" — it read the pipes as structure, took the
   * first fragment as a title and a fragment of a DIFFERENT role as the
   * employer. A confident wrong answer, with no signal that anything went
   * wrong.
   *
   * That is the worse defect, and it is invisible to the candidate: their
   * screen shows a title, so nothing looks broken. A real ATS splits on these
   * separators with its own rules and reaches its own wrong answer.
   */
  /**
   * ⚠️ THE CONTACT LINE IS EXCLUDED, AND IT WAS NOT UNTIL 2026-09-08.
   *
   * "name@example.com | +91 98450 11223 | linkedin.com/in/x" carries two pipes
   * and no "at", so it matched — and because it appears above the first role,
   * `.find()` returned it before ever reaching the line the rule is about. The
   * candidate was then shown a finding headed "a role line built from
   * separators" quoting their email address, beside a fix telling them to
   * rewrite it as "Product Manager at Paytm". Observed live on the checker.
   *
   * A pipe-separated contact line is an ordinary résumé convention that every
   * parser handles, so it is not a defect in the first place. Excluding it also
   * lets the rule find the line it was written for.
   */
  const isContactLine = (l: string) => EMAIL_RE.test(l) || LINK_RE.test(l) || PHONE_RE.test(l)
  const separatorHeader = nonEmpty
    .slice(0, 15)
    .find(
      (l) =>
        (l.match(/[|•·/]/g) ?? []).length >= 2 &&
        !/\bat\b/i.test(l) &&
        l.trim().length < 80 &&
        !isContactLine(l),
    )
  if (separatorHeader) {
    add({
      id: 'separator-header',
      area: 'parsing',
      severity: 'medium',
      title: 'A role line built from separators',
      detail:
        'Parsers split these lines on the separator and assign the pieces by position, so which fragment becomes your title and which becomes your employer is a guess. Read as written, this line gave our own parser a title of "' +
        (f.currentTitle ?? '—') +
        '" — it produced an answer rather than an error, which is why this is easy to miss.',
      fix: 'Write the role as a sentence a person would read: "Product Manager at Paytm", on its own line above the dates.',
      evidence: separatorHeader.slice(0, 120),
    })
  }

  /**
   * The parser answered, and the answer is not a job title.
   *
   * ⚠️ THIS IS THE FAILURE THE WHOLE FILE KEEPS CIRCLING: a confident wrong
   * answer, which is invisible to the candidate because their screen shows a
   * title. Measured live on 2026-09-08 against an ordinary résumé whose role
   * line read "Software Engineer II — Razorpay / Jul 2023 - Present |
   * Bengaluru", extractFields() returned currentTitle "Jul 2023 - Present" and
   * employer "Bengaluru". Nothing fired: `title-unreadable` needs an ABSENT
   * title, and `separator-header` was busy matching the contact line above.
   *
   * So the report showed a wrong title under "what a parser read out of it"
   * with no finding beside it explaining why — which turns the most persuasive
   * panel on the page into a puzzle. A date where a title should be is
   * mechanically checkable, so it is checked.
   */
  const titleLooksLikeDate =
    Boolean(readTitle) &&
    (new RegExp(`^${MONTH}\\b|\\b(19|20)\\d{2}\\b|\\b(present|current)\\b`, 'i').test(readTitle!))
  if (titleLooksLikeDate) {
    add({
      id: 'title-misread',
      area: 'parsing',
      severity: 'medium',
      title: `A parser read your job title as "${f.currentTitle}"`,
      detail:
        'That is a date, not a role. The parser found something where the title should be and stopped looking, so it never produced an error — it produced a wrong answer, which is harder to notice. An applicant tracking system doing the same thing files you under a job title that does not exist.',
      fix: 'Put the role on its own line as "Software Engineer at Razorpay", with the dates on the line below it rather than beside it.',
      evidence: f.currentTitle,
    })
  }

  if (!readTitle) {
    add({
      id: 'title-unreadable',
      area: 'parsing',
      severity: 'medium',
      title: 'Your current job title did not come through',
      detail:
        'Our parser looks where an ATS looks — a "Title at Company" line near the top. It found no title, which means a real parser plausibly finds none either.',
      fix: 'Put your current role on its own line as "Product Manager at Paytm", above its date range.',
    })
  }
  if (!readEmployer) {
    add({
      id: 'employer-unreadable',
      area: 'parsing',
      severity: 'low',
      title: 'Your current employer did not come through',
      detail: 'Same line as the title, and usually fixed by the same change.',
      fix: 'Name the employer on the same line as the role.',
    })
  }

  // ---- keywords -----------------------------------------------------------

  const dumpLine = nonEmpty.find((l) => {
    const parts = l.split(',').map((p) => p.trim()).filter(Boolean)
    return parts.length > 15 && parts.every((p) => p.split(/\s+/).length <= 4)
  })
  if (dumpLine) {
    add({
      id: 'keyword-dump',
      area: 'keywords',
      severity: 'medium',
      title: 'A very long comma-separated keyword list',
      detail:
        'Modern screens weight a skill by where it appears, not how many are listed. A long undifferentiated list dilutes the ones you can actually evidence, and reads to a human reviewer as written for the filter.',
      fix: 'Keep the skills you could be interviewed on, and move the rest into the bullet where you used them.',
      evidence: dumpLine.slice(0, 120),
    })
  }

  const counts = new Map<string, number>()
  for (const w of words) {
    const k = w.toLowerCase().replace(/[^a-z0-9+#.]/g, '')
    if (k.length < 3 || STOPWORDS.has(k)) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const stuffed = [...counts.entries()]
    .filter(([, n]) => n >= 8 && n / words.length > 0.015)
    .sort((a, b) => b[1] - a[1])[0]
  if (stuffed) {
    add({
      id: 'repeated-term',
      area: 'keywords',
      severity: 'low',
      title: `"${stuffed[0]}" appears ${stuffed[1]} times`,
      detail:
        'Repetition past the point of describing the work is a pattern reviewers recognise, and it no longer moves keyword-frequency scoring the way it once did.',
      fix: 'Keep the two or three placements where it describes something you actually did.',
    })
  }

  // ---- consistency --------------------------------------------------------
  //
  // Written as ambiguity, never as accusation. See the module comment.

  const openEnded = openEndedRoles(structure)
  if (openEnded > 1) {
    add({
      id: 'overlapping-present',
      area: 'consistency',
      severity: 'medium',
      title: `${openEnded} roles are both marked as ongoing`,
      detail:
        'A parser computing total experience from overlapping open-ended ranges either double-counts the overlap or discards one of the roles. Either way the number it reaches is not the one you meant.',
      fix: 'Give every role but your current one a real end date. If two genuinely overlap — a part-time or advisory role alongside a full-time one — say which is which on the line.',
    })
  }

  const claimed = CLAIMED_YEARS_RE.exec(text)
  const earliest = earliestYear(text)
  if (claimed && earliest) {
    const claimedYears = Number(claimed[1])
    const spanYears = new Date().getFullYear() - earliest
    if (claimedYears - spanYears >= 3) {
      add({
        id: 'years-disagree',
        area: 'consistency',
        severity: 'medium',
        title: `The summary says ${claimedYears} years; the dates add up to about ${spanYears}`,
        detail:
          'A parser trusts the dates and ignores the sentence, so the higher figure does not reach the screen — but a human reviewer sees both. The usual cause is a role whose dates were left off, not an overstatement.',
        fix: 'Check for a role missing its dates. If the earlier work is genuinely there, add its range so the arithmetic agrees.',
        evidence: claimed[0],
      })
    }
  }

  const nextYear = new Date().getFullYear() + 1
  const future = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1])).find((y) => y > nextYear)
  if (future) {
    add({
      id: 'future-date',
      area: 'consistency',
      severity: 'low',
      title: `A date in ${future} is in the future`,
      detail: 'Usually a typo. A parser reading it as a start date can compute a negative tenure for that role.',
      fix: `Check the year on that entry.`,
    })
  }

  // ---- the role comparison, when one was chosen ---------------------------
  //
  // ⚠️ THIS IS THE ONE CHECK THAT IS ABOUT CONTENT RATHER THAN FORMATTING, so
  // it is held to a stricter standard. It reports only terms measured in real
  // postings for the role the candidate picked, it names how many postings, and
  // it is scored LOW severity however many are missing — a résumé is not
  // "broken" for wording things differently, and an ATS keyword match is a
  // ranking signal rather than a parse failure. Overstating it would turn a
  // deterministic checker into the advice column it was built to replace.
  /**
   * Does the document say anywhere what job the candidate is applying for?
   *
   * ⚠️ ONLY RUNS WHEN A ROLE WAS CHOSEN, and only checks the top of the
   * document, because that is where a system looks for a headline. A résumé
   * whose most recent title is "Software Engineer II" applying for "Backend
   * Engineer" is not wrong — it is simply not saying so anywhere a keyword
   * match can see.
   */
  if (targetRole) {
    const head = nonEmpty.slice(0, 12).join(' ').toLowerCase()
    const roleWords = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const named = roleWords.length > 0 && roleWords.every((w) => head.includes(w))
    if (!named) {
      add({
        id: 'title-not-targeted',
        area: 'keywords',
        severity: 'low',
        title: `Nothing in the first lines says "${targetRole}"`,
        detail:
          `Many systems weight a headline near the top far above the body, and a recruiter reads it before anything else. Your most recent title reads "${f.currentTitle ?? 'nothing we could find'}", which may be exactly right for your last job and does not tell this employer what you are applying for.`,
        fix: `Add a single line under your name: ${targetRole}. Only do it if it is true of what you are looking for — this is a signpost, not a claim about your last job.`,
      })
    }
  }

  const roleEntry = targetRole ? KEYWORDS[targetRole] : undefined
  let role: AtsReport['role']
  if (roleEntry) {
    const hay = text.toLowerCase()
    const present = roleEntry.terms.filter((t) => hay.includes(t))
    const missing = roleEntry.terms.filter((t) => !hay.includes(t))
    role = { name: targetRole!, postings: roleEntry.postings, present, missing }

    // Only worth saying when most of the vocabulary is absent. A résumé
    // carrying half of it is written in the language of the role already.
    if (missing.length > roleEntry.terms.length / 2) {
      add({
        id: 'role-vocabulary',
        area: 'keywords',
        severity: 'low',
        title: `Your résumé names ${present.length} of ${roleEntry.terms.length} terms common to ${targetRole} postings`,
        detail:
          `Across the ${roleEntry.postings} ${targetRole} postings we index, these terms appear in at least a third of them: ` +
          `${roleEntry.terms.join(', ')}. Yours does not mention ${missing.join(', ')}. ` +
          `The panel below ranks each one by how many of those postings actually use it, so you can fix the common ones first. ` +
          `An ATS ranks partly on overlap with the posting, so absent vocabulary can cost you position even when the experience is there.`,
        fix:
          `Only add a term if the work behind it is genuinely yours — writing in a word you cannot speak to is worse than missing it. ` +
          `The authoritative list is the posting itself, not this one: paste a specific job description into Should I apply? to see what THAT employer asks for.`,
      })
    }

    /**
     * ⚠️ THE PASTED JOB DESCRIPTION WAS COLLECTED AND THROWN AWAY. The upload
     * form has always offered "Have a specific job description? Paste it", and
     * `jdVersusMarket` has existed since Stage P — but nothing called it, so the
     * JD only ever reached the rewrite. A candidate who pasted a posting got a
     * report that had not read it.
     *
     * What makes this worth more than a keyword diff is the SPLIT. Terms the
     * posting shares with the wider market are worth adding, because every
     * employer for this role wants them. Terms peculiar to this one employer
     * are worth knowing about and NOT worth rewriting a résumé around — that is
     * over-fitting to a single ad, and it is advice nobody without an index can
     * give, because telling the two apart requires knowing what the rest of the
     * market says.
     */
    const jd = jdText?.trim()
    if (jd && jd.length > 80) {
      const { standard, specific } = jdVersusMarket(targetRole!, jd)
      const absent = standard.filter((t) => !hay.includes(t.term))
      if (absent.length > 0) {
        add({
          id: 'jd-missing-standard',
          area: 'keywords',
          severity: absent.length >= 3 ? 'medium' : 'low',
          title: `This posting asks for ${absent.length} term${absent.length === 1 ? '' : 's'} your résumé does not use`,
          detail:
            `${absent.map((t) => `"${t.term}" (in ${t.pct}% of the ${roleEntry.postings} ${targetRole} postings we index)`).join(', ')}. ` +
            `These are not this employer's private vocabulary — they are standard for the role, which is why their absence costs you at every posting rather than this one.` +
            (specific.length
              ? ` By contrast, ${specific.slice(0, 4).map((w) => `"${w}"`).join(', ')} appear to be specific to this employer. Knowing which is which is the point: rewriting your résumé around one company's words is over-fitting, and it makes the document worse everywhere else.`
              : ''),
          fix:
            `Add the standard terms only where the work behind them is genuinely yours. Leave the employer-specific ones for the cover note, where naming their language is an advantage rather than a distortion.`,
          evidence: absent[0]?.term,
        })
      }
    }
  }

  // ---- ATS essentials -----------------------------------------------------
  //
  // Mechanical properties of the document itself, not of the writing. Each is
  // something an applicant tracking system reads or fails to read; none is a
  // judgement about the person. A "professional email address" rule was
  // considered here and DELIBERATELY NOT WRITTEN — it cannot be evaluated
  // without an opinion about someone's own name and handle, and this file has
  // a test asserting no finding accuses the writer.

  const wordCount = words.length
  if (wordCount < 250 || wordCount > 1200) {
    add({
      id: 'resume-length',
      area: 'parsing',
      severity: 'low',
      title:
        wordCount < 250
          ? `${wordCount} words is short for a résumé a parser can rank`
          : `${wordCount} words is long enough that the top of the document carries less weight`,
      detail:
        wordCount < 250
          ? 'A parser ranks partly on how much evidence it can find. Under about 250 words there is usually not enough text for the match to mean much, even when the experience behind it is real.'
          : 'Most systems index the whole document but weight the first page. Past roughly 1,200 words the oldest roles dilute the recent ones rather than adding to them.',
      fix:
        wordCount < 250
          ? 'Add one or two lines to each recent role describing what you actually did — not adjectives, the work itself.'
          : 'Cut the oldest roles to a single line each and keep the detail on the last two.',
    })
  }

  /**
   * Mixed date formats.
   *
   * "03/2021" and "Mar 2021" in one document force a parser to run two
   * different readers and pick a winner. Which one it picks decides your
   * seniority, so this is a consistency problem with a real consequence rather
   * than a tidiness note.
   */
  const numericDates = /\b(0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/.test(text)
  const wordDates = new RegExp(`\\b${MONTH}\\.?\\s+(?:19|20)\\d{2}\\b`, 'i').test(text)
  if (numericDates && wordDates) {
    add({
      id: 'date-format-mixed',
      area: 'consistency',
      severity: 'medium',
      title: 'Two different date formats in one document',
      detail:
        'Some dates are written as numbers (03/2021) and others with the month spelled out (Mar 2021). A parser reads dates with one pattern at a time, so one of the two forms is likely to be read as text rather than as a date — and a role with no date attached is a role with no duration.',
      fix: 'Pick one format and use it everywhere. "Mar 2021 – Present" is read correctly by more systems than the numeric form.',
      evidence: text.match(new RegExp(`\\b${MONTH}\\.?\\s+(?:19|20)\\d{2}\\b`, 'i'))?.[0],
    })
  }

  if (!LINK_RE.test(text)) {
    add({
      id: 'no-links',
      area: 'parsing',
      severity: 'low',
      title: 'No LinkedIn, GitHub or portfolio link a parser can find',
      detail:
        'Many systems store a candidate profile from the résumé and leave the link fields empty when there are none. A recruiter looking at that profile has nowhere to go next.',
      fix: 'Add the full URL as text — linkedin.com/in/yourname — rather than hiding it behind a linked icon, which extracts as nothing.',
    })
  }

  // ---- sections -----------------------------------------------------------

  /**
   * Section order.
   *
   * ⚠️ ONLY FIRES FOR SOMEONE WHO HAS WORKED. A student's résumé leading with
   * education is correct, and telling them otherwise would be advice dressed as
   * a defect. The rule needs both a dated job and education printed above it.
   */
  const order = structure.order
  const iExp = order.indexOf('experience')
  const iEdu = order.indexOf('education')
  /**
   * ⚠️ AND NEVER ACROSS COLUMNS. In a sidebar layout the parser reads the left
   * column first, so education in the sidebar lands "before" experience in the
   * main column — an artefact of reading order, not of how the page is printed.
   * Firing here told a two-column résumé to reorder sections that are already
   * side by side, and made one résumé score differently in two layouts.
   */
  const singleColumn = (layout?.columns ?? 1) === 1
  if (singleColumn && iExp > -1 && iEdu > -1 && iEdu < iExp && structure.experience.length > 0) {
    add({
      id: 'section-order',
      area: 'parsing',
      severity: 'low',
      title: 'Education is printed above your work experience',
      detail:
        'Systems that summarise a résumé take the first sections they find. With education first, the summary a recruiter sees opens on your degree rather than your most recent role.',
      fix: 'Move experience above education. Education leads only while you have no work history to lead with.',
    })
  }

  // ---- content ------------------------------------------------------------

  const bullets = structure.experience.flatMap((e) => e.bullets)

  if (bullets.length >= 3) {
    const quantified = bullets.filter((b) => QUANTIFIED.test(b)).length
    if (quantified === 0) {
      add({
        id: 'no-quantified-impact',
        area: 'keywords',
        severity: 'low',
        title: `None of your ${bullets.length} experience lines carries a number`,
        detail:
          'Systems that rank on impact look for figures — a count, a percentage, a duration, an amount. Lines without one describe the job you held rather than what changed because you held it.',
        fix:
          'Add the figures you already know to be true. Never invent one: a number you cannot defend in the interview costs more than the ranking it buys.',
        evidence: bullets[0]?.slice(0, 120),
      })
    }

    const weak = bullets.filter((b) => WEAK_OPENER.test(b))
    if (weak.length >= 2) {
      add({
        id: 'weak-openers',
        area: 'keywords',
        severity: 'low',
        title: `${weak.length} lines open with a phrase that describes the role, not the work`,
        detail:
          '"Responsible for", "Worked on" and "Involved in" name a duty. Keyword matching scores the verb, and these verbs belong to the job description rather than to anything you did.',
        fix: 'Start with what you did — Built, Ran, Migrated, Negotiated, Reduced — and let the object of the sentence carry the scope.',
        evidence: weak[0]?.slice(0, 120),
      })
    }

    const long = bullets.filter((b) => b.length > 300)
    if (long.length > 0) {
      add({
        id: 'bullet-too-long',
        area: 'parsing',
        severity: 'low',
        title: `${long.length} experience ${long.length === 1 ? 'line runs' : 'lines run'} past 300 characters`,
        detail:
          'Long lines are usually a paragraph that lost its bullet. Some parsers truncate at a fixed length, which drops the end of the sentence — and the end is where the outcome usually sits.',
        fix: 'Split each into two lines of roughly one sentence.',
        evidence: long[0]?.slice(0, 120),
      })
    }
  }

  // ---- content, second tier ------------------------------------------------
  //
  // ⚠️ THIS IS THE HALF THE CATEGORY LEADER CALLS "what a recruiter will think",
  // and it is the half we were thinnest on: their score splits into what a
  // MACHINE can read and what a PERSON will judge, and we had one rule in the
  // second column. Everything below is still deterministic, because the page's
  // claim is that no model decides the score — so each check does less than
  // theirs and can show its working, which is the trade this product makes
  // everywhere else too.

  /**
   * Misspellings, from a curated list rather than a dictionary.
   *
   * Scanned against the WHOLE document rather than bullets alone: the summary
   * is where these cluster, and it is the first thing read.
   */
  const misspelt = [...new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')))]
    .filter((w) => w in MISSPELLINGS)
    .slice(0, 6)
  if (misspelt.length > 0) {
    add({
      id: 'spelling-common',
      area: 'consistency',
      severity: 'medium',
      title: `${misspelt.length} commonly misspelled ${misspelt.length === 1 ? 'word' : 'words'}`,
      detail:
        `Found: ${misspelt.map((w) => `"${w}" (should be "${MISSPELLINGS[w]}")`).join(', ')}. ` +
        'A parser does not care, and a recruiter does — this is the one class of defect that costs you nothing to fix and everything to leave.',
      fix: 'Correct each one. This is a short list of words people actually get wrong on a CV, not a full spellchecker, so run yours as well.',
      evidence: misspelt[0],
    })
  }

  /** A word typed twice. Invisible while writing, obvious to a reader. */
  const doubled = text.match(/\b(\w{3,})\s+\1\b/i)
  if (doubled) {
    add({
      id: 'doubled-word',
      area: 'consistency',
      severity: 'low',
      title: `"${doubled[1]}" appears twice in a row`,
      detail: 'Almost always a copy-and-paste artefact. It survives every spellchecker, because both words are spelled correctly.',
      fix: 'Delete the repeat.',
      evidence: doubled[0],
    })
  }

  if (bullets.length >= 3) {
    /**
     * ⚠️ COVERAGE, NOT PRESCRIPTION. `weak-openers` names the lines that open
     * with a duty; this measures how many open with an action at all, which is
     * a different question — a line beginning "The system was rebuilt" is
     * neither a duty nor an action, and only this check sees it.
     */
    const strong = bullets.filter((b) =>
      ACTION_VERBS.has(b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''),
    ).length
    if (strong / bullets.length < 0.5) {
      add({
        id: 'action-verb-coverage',
        area: 'keywords',
        severity: 'low',
        title: `${strong} of ${bullets.length} experience lines open with an action`,
        detail:
          'Keyword matching scores the first words of a line most heavily, and a recruiter skims exactly the same place. Lines that open with a noun or a passive construction describe a situation rather than what you did in it.',
        fix: 'Open each line with what you did — Built, Ran, Migrated, Reduced, Negotiated — and let the rest of the sentence carry the scope.',
        evidence: bullets.find(
          (b) => !ACTION_VERBS.has(b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''),
        )?.slice(0, 120),
      })
    }

    /** Some lines end in a full stop and others do not. A parser is indifferent;
     *  a reader sees it immediately. */
    const stopped = bullets.filter((b) => /[.]\s*$/.test(b.trim())).length
    if (stopped > 0 && stopped < bullets.length) {
      add({
        id: 'bullet-punctuation',
        area: 'consistency',
        severity: 'low',
        title: `${stopped} of ${bullets.length} lines end in a full stop, the rest do not`,
        detail: 'Mixed punctuation across a bullet list is the commonest sign of a résumé edited in several sittings, and it is the kind of detail a hiring manager reads as carelessness rather than as a typo.',
        fix: 'Pick one. Either every line ends in a full stop or none does.',
        /**
       * The minority line — whichever way round it is. Quoting one of the
       * majority would show the reader a line that is not the problem.
       */
      evidence: stopped * 2 > bullets.length
        ? bullets.find((b) => !/[.]\s*$/.test(b.trim()))
        : bullets.find((b) => /[.]\s*$/.test(b.trim())),
    })
    }
  }

  const unevidenced = UNEVIDENCED.filter((phrase) => text.toLowerCase().includes(phrase))
  if (unevidenced.length > 0) {
    add({
      id: 'unevidenced-claims',
      area: 'keywords',
      severity: 'low',
      title: `${unevidenced.length} ${unevidenced.length === 1 ? 'phrase makes a claim' : 'phrases make claims'} nothing on the page supports`,
      detail:
        `Found: ${unevidenced.map((p) => `"${p}"`).join(', ')}. These describe character rather than work, so no reader can check them and no system can score them — and they occupy the line an example could have used.`,
      fix: 'Replace each with the thing that would make somebody believe it. "Team player" becomes the project you shipped with two other teams.',
      evidence: unevidenced[0],
    })
  }

  // ---- recruiter red flags, bias, seniority ---------------------------------
  //
  // ⚠️ THE VOICE RULE IS AT ITS HARDEST HERE AND IS NOT NEGOTIABLE. These
  // findings touch employment gaps, age and whether somebody has been promoted.
  // Every one of them says WHAT A READER WILL WONDER and what one line would
  // answer it — never what the candidate should have done with their life. A
  // gap is not a defect. A gap the document does not account for is a question
  // left open, and that is all this is entitled to report. A test asserts no
  // finding in these three categories contains a judgement word.

  const history = timeline(structure)

  /**
   * ⚠️ A GAP THE RÉSUMÉ ALREADY EXPLAINS IS NOT A GAP, and saying otherwise is
   * the worst kind of finding this product can produce: advice to explain
   * something the reader has already explained, on the same page. Measured on
   * the founder's own résumé — "a 2 years gap between Amazon and ICICI Bank",
   * with a full-time MBA dated across exactly that window printed below it.
   *
   * Education dates are the one other timeline a résumé reliably carries, so a
   * gap overlapping a degree is suppressed rather than softened. The check
   * still fires on genuinely undated periods, which is what it is for.
   */
  const studyYears = new Set<number>()
  for (const e of structure.education) {
    const years = [...(e.dates ?? '').matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]))
    if (years.length === 0) continue
    for (let y = Math.min(...years); y <= Math.max(...years); y++) studyYears.add(y)
  }
  const explainedByStudy = (gap: { start: { year: number }; end: { year: number } }) => {
    for (let y = gap.start.year; y <= gap.end.year; y++) if (studyYears.has(y)) return true
    return false
  }

  for (const gap of gaps(history).filter((g) => !explainedByStudy(g)).slice(0, 1)) {
    const years = Math.floor(gap.months / 12)
    const span = years >= 1 ? `${years} year${years === 1 ? '' : 's'}` : `${gap.months} months`
    add({
      id: 'employment-gap',
      area: 'consistency',
      severity: 'low',
      title: `A ${span} gap between ${gap.afterEmployer ?? 'one role'} and ${gap.beforeEmployer ?? 'the next'}`,
      detail:
        'Systems that rank on continuous experience read an undated period as no experience, and a recruiter scanning dates will notice it before they read a word of what you did. Neither of them knows what it was for.',
      fix:
        'One line, in your own words, wherever it sits in the timeline — a course, caring for family, a business that did not work, a break. It does not need explaining beyond naming it. An accounted gap stops being a question.',
    })
  }

  const shortRoles = history.filter((t) => t.months !== null && t.months < 12 && !t.isCurrent)
  if (shortRoles.length >= 2) {
    add({
      id: 'short-tenure',
      area: 'consistency',
      severity: 'low',
      title: `${shortRoles.length} roles lasting under a year`,
      detail:
        'A reader deciding between two candidates uses tenure as a proxy for whether an offer will stick. Contract work, an acquisition, a startup closing and a genuine mismatch all look identical in a date range.',
      fix:
        'Where a short role had a reason the dates cannot show — a contract, a shutdown, a role that converted — say so in three words beside it. Where it does not, leave it; a real career has short roles in it.',
      evidence: shortRoles[0].employer ?? undefined,
    })
  }

  const unevidencedSkills = skillsWithoutEvidence(structure)
  if (unevidencedSkills.length >= 3) {
    add({
      id: 'skills-not-evidenced',
      area: 'keywords',
      severity: 'medium',
      title: `${unevidencedSkills.length} skills appear only in your skills list`,
      detail:
        `${unevidencedSkills.slice(0, 6).join(', ')}${unevidencedSkills.length > 6 ? ' and others' : ''} are named once and never again. A keyword match still finds them, and the interviewer who asks about one finds nothing on the page to ask about — which is the harder half of the process.`,
      fix:
        'For each one that matters to the role you want, put it in the line where you actually used it. A skill named inside a piece of work is evidence; a skill in a list is a claim.',
      evidence: unevidencedSkills[0],
    })
  }

  /**
   * ⚠️ THIS IS THE ONLY CHECK IN THE FILE THAT ARGUES AGAINST INCLUDING
   * SOMETHING TRUE, and it is here because the risk it names is not the
   * candidate's fault. Age discrimination in hiring is documented and illegal
   * in most of the market, and it operates on cues — a graduation year, a role
   * from 2004 — long before anybody reads the work. Naming the cue lets the
   * candidate decide. It never tells them to hide anything.
   */
  const graduation = structure.education
    .map((e) => Number(e.dates?.match(/\b(19|20)\d{2}\b/)?.[0] ?? 0))
    .filter((y) => y > 1950)
  const thisYear = new Date().getFullYear()
  const oldestGraduation = graduation.length ? Math.min(...graduation) : 0
  if (oldestGraduation && thisYear - oldestGraduation > 20) {
    add({
      id: 'age-signal',
      area: 'keywords',
      severity: 'low',
      title: `Your graduation year (${oldestGraduation}) puts an age on the page`,
      detail:
        'A graduating year is the commonest way a résumé reveals age before anybody reads the experience, and age discrimination is both documented and difficult to prove. Nothing about this is your problem to fix, and it is still yours to decide.',
      fix:
        'Dropping the year from education while keeping the degree and institution is normal practice and costs a parser nothing. Keep it if you would rather — this is information, not advice.',
      evidence: String(oldestGraduation),
    })
  }

  const earliestRole = history.find((t) => t.start)?.start?.year
  if (earliestRole && thisYear - earliestRole > 18) {
    add({
      id: 'dated-experience',
      area: 'keywords',
      severity: 'low',
      title: `Your résumé goes back to ${earliestRole}`,
      detail:
        'Most systems weight recent work far above old work, and roles beyond roughly fifteen years dilute the page rather than adding to it — while carrying the same age signal as a graduation year.',
      fix:
        'Consider an "Earlier roles" line naming the employers without dates. It keeps the history and stops the oldest entry competing with your most recent one.',
      evidence: String(earliestRole),
    })
  }

  /**
   * ⚠️ BENCHMARKED AGAINST THE POSTINGS, NOT AGAINST OTHER CANDIDATES.
   *
   * The category leader calls this "peer benchmarking" and compares a résumé to
   * other people's. That needs a corpus of candidates' documents, which is a
   * thing we should not be holding and do not have. Postings are the better
   * comparison anyway: they are what actually decides whether an application
   * lands, they are public, and ours carry the sentence each requirement was
   * read from. `medianYears` is the median minimum experience asked for across
   * the postings we index for this role — median so one advert demanding
   * fifteen years cannot move the bar a candidate is measured against.
   *
   * It reports BOTH directions and neither as a failure. Under the median is
   * worth knowing before you apply; well over it is the over-qualification
   * problem src/match/score.ts already scores on the shortlist, and it costs
   * candidates interviews just as reliably.
   */
  const benchmark = targetRole ? KEYWORDS[targetRole]?.medianYears : undefined
  const held = f.yearsExperience
  if (benchmark !== undefined && held !== undefined && roleEntry) {
    if (held + 2 < benchmark) {
      add({
        id: 'seniority-benchmark',
        area: 'keywords',
        severity: 'low',
        title: `${targetRole} postings typically ask for ${benchmark} years; your résumé shows ${held}`,
        detail:
          `Measured across the ${roleEntry.postings} postings we index for this role, not asserted. A stated minimum is a filter in some systems and a preference in most — plenty of people are hired under it — but it is the single commonest reason an application is never read.`,
        fix:
          'Nothing on your résumé needs to change for this. It is worth knowing which applications are a stretch so you can spend the effort where it converts — and worth checking that every year you have actually shows up in your dates.',
      })
    } else if (held > benchmark + 6) {
      add({
        id: 'seniority-benchmark',
        area: 'keywords',
        severity: 'low',
        title: `Your ${held} years sit well above the ${benchmark} these postings ask for`,
        detail:
          `Measured across the ${roleEntry.postings} ${targetRole} postings we index. Being far over a stated band gets applications filtered as often as being under it — for salary-band reasons that have nothing to do with whether you could do the work.`,
        fix:
          'Consider whether the role you are targeting is the right band, or lead with the most recent and most senior work so the reader reaches your level before they reach your total.',
      })
    }
  }

  const moved = progressed(history)
  if (moved === false) {
    add({
      id: 'career-progression',
      area: 'keywords',
      severity: 'low',
      title: 'Your titles do not show a step up across the résumé',
      detail:
        'A reader looks for direction as much as duration. Where the title stayed the same, the growth usually lives in the work — a larger system, a bigger number, somebody you trained — and the page has to say so, because the title cannot.',
      fix:
        'Where scope grew inside one title, name what changed: the size of the thing you owned at the start against the end. Where a promotion happened, list the two titles as separate entries under the same employer.',
    })
  }

  if (leadershipEvidence(structure) === 0 && bullets.length >= 3 && seniorityBand(readTitle ?? null) >= 3) {
    add({
      id: 'leadership-evidence',
      area: 'keywords',
      severity: 'low',
      title: 'A senior title with nothing on the page about running things',
      detail:
        `Your title reads "${readTitle}", and no line mentions leading, mentoring, owning or hiring. For roles at this level a reader is looking for that specifically, and its absence reads as an answer rather than an omission.`,
      fix:
        'If you led, mentored or owned something, say which and how many. If your seniority is technical rather than managerial, say that instead — "owned the payments platform end to end" is a leadership claim without a team in it.',
    })
  }

  // ---- score --------------------------------------------------------------
  /**
   * Categories. Each starts at 100 and is deducted only by its own findings,
   * so a résumé can be perfectly machine-readable and still score badly on
   * content — which is the distinction the single number cannot make and the
   * reason the report is grouped at all.
   *
   * Tailoring is omitted entirely when no role was chosen. Showing it at 100/100
   * because no rule ran would be the most flattering possible lie.
   */
  const placed: AtsFinding[] = findings.map((x) => ({
    ...x,
    category: CATEGORY_OF[x.id] ?? 'content',
  }))

  const activeRules = (Object.entries(RULES) as [AtsCategory, { label: string; ids: string[] }][]).filter(
    ([key]) => key !== 'tailoring' || Boolean(roleEntry),
  )

  /**
   * Score a given set of findings. Called twice per finding as well as once for
   * the whole report, which is what makes the itemised costs honest — see the
   * note on `readability`.
   */
  const scoreWith = (
    raised: AtsFinding[],
    cov: ParseCoverage = coverage,
  ): { score: number; categories: AtsCategoryScore[] } => {
    const categories: AtsCategoryScore[] = activeRules.map(([key, { label, ids }]) => {
      const mine = raised.filter((x) => x.category === key)
      const lost = mine.reduce((n, x) => n + SEVERITY_CATEGORY_COST[x.severity], 0)
      return {
        key,
        label,
        score: Math.max(0, 100 - lost),
        passed: ids.length - mine.length,
        total: ids.length,
      }
    })
    const weight = categories.reduce((n, c) => n + CATEGORY_WEIGHT[c.key], 0)
    const content =
      weight === 0 ? 100 : categories.reduce((n, c) => n + CATEGORY_WEIGHT[c.key] * c.score, 0) / weight
    return {
      score: Math.max(0, Math.min(100, Math.round(PARSE_WEIGHT * cov.rate + (1 - PARSE_WEIGHT) * content))),
      categories,
    }
  }

  const full = scoreWith(placed)
  const categories = full.categories
  const score = full.score
  /**
   * ⚠️ A LAYOUT FINDING COSTS BOTH HALVES OF THE SCORE, AND SHOWING ONLY ONE
   * UNDERSTATES IT BADLY. Removing `multi-column` from the finding list is
   * worth about seven points of content — but a two-column document is also
   * what drives `parseCoverage` down, and that reduction is computed from the
   * geometry rather than from the findings. Reported naively, a check whose own
   * copy says "blocks parsing" printed a smaller cost than a punctuation nit,
   * beside a gauge that would jump twenty points the moment it was fixed.
   *
   * The figure has to answer the question the candidate is actually asking —
   * "what do I get for fixing this" — so for a finding that depresses the parse
   * rate, the rescore drops the structural penalty too. That is exactly what
   * the "Rebuild the layout" button does to the real document.
   */
  const coverageWithoutLayoutRisk = coverage.atsRisk.length > 0 ? parseCoverage(structure) : coverage
  const LAYOUT_DRIVEN = new Set(['multi-column'])
  const deductions = placed.map((x) => ({
    id: x.id,
    title: x.title,
    points:
      scoreWith(
        placed.filter((y) => y !== x),
        LAYOUT_DRIVEN.has(x.id) ? coverageWithoutLayoutRisk : coverage,
      ).score - score,
  }))

  return {
    findings: placed,
    categories,
    readability: { score, deductions },
    coverage,
    read: {
      currentTitle: readTitle,
      employer: readEmployer,
      city: f.city,
      yearsExperience: f.yearsExperience,
      credential: f.credential,
    },
    stats: { characters: text.length, words: words.length, lines: nonEmpty.length },
    role,
  }
}
