import { extractAll } from '@/gates/extract'
import { CONFIDENCE_THRESHOLD } from '@/gates/types'
import { extractSkillPhrases, skillDispersion } from '@/lib/taxonomy/skills'

/**
 * Stage 2 of the Résumé Studio: this posting, beside this résumé, per dimension.
 *
 * ⚠️ ZERO TOKENS, AND THAT IS A REQUIREMENT RATHER THAN A HAPPY ACCIDENT.
 * The site shares an 8,000 tokens/minute ceiling (`llm.ts:200`) and a whole
 * document rewrite costs ~1,360 of it. The one screen a candidate arrives
 * wanting — *did my résumé answer this job?* — must therefore work with the
 * model switched off entirely. Everything below is retrieval and arithmetic
 * over text the candidate supplied.
 *
 * ⚠️ EVERY CELL IS RETRIEVED, NEVER ASSERTED. A row names a number and carries
 * the sentence it was read from, because the product's whole argument is that a
 * judgement a candidate cannot check is worth less than no judgement. Where the
 * posting is silent the row says so — `null`, rendered as "does not say" —
 * rather than substituting a plausible default. This is the same rule that
 * governs a refusal in `src/gates/`: a wrong verdict costs more than an absent
 * one.
 *
 * ⚠️ THE SKILL TERMS COME FROM `skills.json`, NOT `role-keywords.json`, AND THE
 * DIFFERENCE IS THE FEATURE. The role file holds six generic terms per role
 * (`development`, `software`, `design`); the skill vocabulary holds 1,134 terms
 * each earned by at least 12 distinct employers naming it mid-sentence. The
 * dispersion rule is also what keeps places and company names out — a company
 * name's mentions all sit on one board. `interview-prep` shipped a surface
 * asking "How much have you worked with Poland?" for a day because a capital
 * letter was treated as evidence of a skill; this module reads the vocabulary
 * that replaced that, and `scripts/verify-gap-table.ts` points it at five live
 * postings so the same failure cannot ship twice.
 */

export type GapStatus =
  /** The résumé answers what the posting asks. */
  | 'match'
  /** Answers part of it. */
  | 'partial'
  /** The posting asks and the résumé does not answer. */
  | 'gap'
  /** The posting does not say, or our parser read nothing. Never a verdict. */
  | 'unknown'

export type GapTerm = {
  /** As the POSTING spelled it — "Kubernetes", not "kubernetes". */
  term: string
  present: boolean
  /**
   * Employers in our index that name this term. Undefined for a term outside
   * the measured vocabulary — render the term bare rather than printing 0,
   * which would read as a measurement of absence, not an absence of one.
   */
  boards?: number
}

export type GapRow = {
  id: 'title' | 'experience' | 'skills' | 'credential'
  label: string
  /** Left column: what the posting asks. `null` when it does not say. */
  job: string | null
  /** Right column: what the résumé says. `null` when the parser read nothing. */
  resume: string | null
  status: GapStatus
  /** The sentence in the posting this row was read from, verbatim. */
  evidence?: string
  /** The terms behind a counted row, so the row opens into its own arithmetic. */
  terms?: GapTerm[]
  /** One plain sentence on what the row means and what to do. Never a score. */
  note: string
}

export type GapTable = {
  rows: GapRow[]
  /** Rows where the posting asks something the résumé does not answer. */
  gaps: number
  /** Rows the posting is silent on — excluded from `gaps`, deliberately. */
  unknowns: number
}

/**
 * Words that describe a rung rather than a job, dropped before two titles are
 * compared. "Senior Backend Engineer" and "Backend Engineer" are the same job
 * at different seniority; calling that a title mismatch would tell a candidate
 * to rewrite the one line on their résumé that is already right.
 */
const TITLE_NOISE = new Set([
  'senior', 'sr', 'junior', 'jr', 'lead', 'principal', 'staff', 'associate',
  'assistant', 'head', 'chief', 'deputy', 'i', 'ii', 'iii', 'iv', 'and', 'of',
  'the', 'for', 'to', 'at', 'in', 'a', 'an', 'intern', 'trainee', 'specialist',
  'executive', 'officer', 'level', 'grade',
])

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 1 && !TITLE_NOISE.has(w)),
  )
}

/**
 * Does the résumé contain this term as a word?
 *
 * ⚠️ NOT `String.includes`. `marketCoverage()` uses a bare substring test and
 * gets away with it on six long role terms; run over 1,134 skill terms it would
 * find "ai" inside "email", "cd" inside "cdn" and "r" inside every word on the
 * page, and every one of those becomes a green tick against a skill the
 * candidate does not have. The boundary is hand-written rather than `\b`
 * because half the vocabulary ends in a character `\b` does not treat as a word
 * character — "c++", "c#", ".net", "node.js".
 *
 * ⚠️ THE BOUNDARY IS LETTERS AND DIGITS ONLY, AND A TEST PINS THAT. A first
 * version also excluded `.`, `+` and `#`, which looked more careful and was
 * wrong: the vocabulary stores ".NET" as the key `net`, so a résumé that says
 * ".NET" has a full stop immediately to the left and the term went unfound.
 * Letters and digits alone still block every case that matters — "ai" inside
 * "email", "cd" inside "cdn", "java" inside "javascript".
 */
function namesTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i').test(haystack)
}

export function buildGapTable({
  jdText,
  jdTitle,
  targetRole,
  resumeText,
  read,
}: {
  /** The posting, in the employer's own words. The left column IS this text. */
  jdText: string
  /**
   * The posting's own title, when a surface collects one.
   *
   * Falls back to the role the candidate picked. ⚠️ IT IS NOT GUESSED FROM THE
   * FIRST LINE OF `jdText` — a pasted posting opens with "About the company"
   * about as often as it opens with a title, and a title row that is wrong is
   * worse than a title row sourced from the candidate's own answer.
   */
  jdTitle?: string
  targetRole?: string
  resumeText: string
  /** What our own parser read out of the document — `AtsReport.read`. */
  read: { currentTitle?: string; yearsExperience?: number; credential?: 'CA' | 'CFA' | 'CS' }
}): GapTable {
  const rows: GapRow[] = []
  const jobTitle = (jdTitle ?? targetRole ?? '').trim()

  // ---- 1. the title -------------------------------------------------------
  const resumeTitle = read.currentTitle?.trim() || null
  {
    const a = titleTokens(jobTitle)
    const b = titleTokens(resumeTitle ?? '')
    const shared = [...a].filter((t) => b.has(t))
    const status: GapStatus = !jobTitle || !resumeTitle
      ? 'unknown'
      : shared.length === a.size && a.size > 0
        ? 'match'
        : shared.length > 0
          ? 'partial'
          : 'gap'

    rows.push({
      id: 'title',
      label: 'Job title',
      job: jobTitle || null,
      resume: resumeTitle,
      status,
      note: !resumeTitle
        ? 'Our parser found no current title in your résumé. An applicant tracking system reads the same places we do, so a title it cannot find is a title a recruiter searching by one will not match.'
        : status === 'match'
          ? 'Your current title reads as the same job. Nothing to change.'
          : status === 'partial'
            ? `Both titles share ${shared.join(', ')}. Recruiters search by title, so the closer your line reads to the posting's the more searches you appear in — but only rename yourself to something you actually did.`
            : 'The two titles have no word in common. That is not a disqualification, and it does mean a recruiter filtering by title will not see you — say the overlap in your summary instead.',
    })
  }

  // ---- 2. the experience bar ---------------------------------------------
  {
    const requirements = extractAll(jdText, '', jobTitle).filter(
      (r) => r.kind === 'experience_years' && r.confidence >= CONFIDENCE_THRESHOLD,
    )
    const years = requirements.map((r) => r.minYears).filter((n): n is number => n !== undefined)
    const bar = years.length ? Math.max(...years) : undefined
    const held = read.yearsExperience
    const source = requirements.find((r) => r.minYears === bar)

    const status: GapStatus =
      bar === undefined || held === undefined ? 'unknown' : held >= bar ? 'match' : 'gap'

    rows.push({
      id: 'experience',
      label: 'Experience',
      job: bar === undefined ? null : `${bar}+ years`,
      resume: held === undefined ? null : `${held} ${held === 1 ? 'year' : 'years'}`,
      status,
      evidence: source?.sourceQuote,
      note:
        bar === undefined
          ? 'This posting states no year requirement we can read with confidence. Where the posting is silent we say so rather than assuming a bar — a requirement we invented is one you would answer for no reason.'
          : held === undefined
            ? 'We could not read a total from your résumé. That is worth fixing on the document itself: a parser that cannot total your years cannot rank you on them.'
            : status === 'match'
              ? 'You clear the stated bar. The question in the room stops being whether you qualify and becomes what the years bought.'
              : `You are ${(bar - (held ?? 0)).toFixed(0)} short of the stated bar. It is the first objection in the room and it is answered with scope, not tenure — most postings state a bar they will move for the right document.`,
    })
  }

  // ---- 3. the skills this posting names -----------------------------------
  {
    const named = extractSkillPhrases(jdText)
    const terms: GapTerm[] = named
      .map((term) => ({
        term,
        present: namesTerm(resumeText, term),
        boards: skillDispersion(term),
      }))
      // Most-named first: that is the order worth fixing them in, and it is the
      // ranking a tool reading one advert cannot produce.
      .sort((a, b) => (b.boards ?? 0) - (a.boards ?? 0))
    const present = terms.filter((t) => t.present).length

    const status: GapStatus =
      terms.length === 0
        ? 'unknown'
        : present === terms.length
          ? 'match'
          : present > 0
            ? 'partial'
            : 'gap'

    rows.push({
      id: 'skills',
      label: 'Skills it names',
      job: terms.length === 0 ? null : `${terms.length} ${terms.length === 1 ? 'term' : 'terms'}`,
      resume: terms.length === 0 ? null : `${present} on your résumé`,
      status,
      terms,
      note:
        terms.length === 0
          ? 'This posting names no term from the vocabulary we measure. That usually means it is written in prose rather than in a requirements list — read it yourself; there is nothing here to check against.'
          : 'Each term is one at least twelve separate employers in our index name in their own postings, so this is not a recommended-keywords list. The count beside a term is how many name it — fix the widely-named ones first, and only add a term if the work behind it is genuinely yours.',
    })
  }

  // ---- 4. the credential ---------------------------------------------------
  {
    /**
     * ⚠️ THIS ROW REPLACED "THEIR OWN WORDS", AND THE REPLACEMENT IS THE WHOLE
     * LESSON OF TASK-083. The plan's fourth row was `jdVersusMarket().specific`
     * — words a posting repeats that the role vocabulary does not carry. Its
     * own definition calls it "deliberately crude… a soft claim must not be
     * dressed as a measurement", which was fine while it sat inside one
     * finding. Run against five real postings on 2026-09-15 for this table it
     * printed, verbatim: `Xylem`, `Availity`, `Guidehouse`, `WEKA`, `Weka`,
     * `Precisely`, `What`, `All`, `None`, `ideas.`, `channels.`, `e.g.` —
     * six employer names, the same employer twice in two casings, and prose.
     * That is the "How much have you worked with Poland?" defect (Stage U)
     * arriving a second time by a different door.
     *
     * It could not be filtered into shape. The thing that makes the skills row
     * trustworthy is DISPERSION measured across employers, and a single advert
     * has no dispersion to measure — which is this product's own stated
     * position, that "a single ad is a sample of one". So the row was cut
     * rather than patched with a stopword list, and replaced with a dimension
     * that IS retrieved and IS quotable.
     *
     * Silent on most engineering postings, and that is correct — `unknown`
     * costs a row of screen and never asserts a requirement nobody stated.
     */
    const stated = extractAll(jdText, '', jobTitle).filter(
      (r) => r.kind === 'credential' && r.confidence >= CONFIDENCE_THRESHOLD,
    )
    const asked = stated[0]?.credential
    // `read.credential` is already narrowed to the three real credentials —
    // the parser omits the field rather than writing 'none'.
    const held = read.credential

    const status: GapStatus =
      !asked ? 'unknown' : held === asked ? 'match' : 'gap'

    rows.push({
      id: 'credential',
      label: 'Qualification',
      job: asked ?? null,
      resume: held ?? null,
      status,
      evidence: stated[0]?.sourceQuote,
      note: !asked
        ? 'This posting names no professional qualification we can read with confidence. Most do not, and a row that stays quiet is the point — we do not invent a bar so the table has something to say.'
        : status === 'match'
          ? `You hold the ${asked} this posting asks for. Make sure it is on the first third of the page, where a parser looks for it.`
          : `This posting asks for ${asked} and our parser found none on your résumé. If you hold it, the document is hiding it — that is a formatting problem, not a qualifications one, and it is worth fixing before you apply anywhere else.`,
    })
  }

  return {
    rows,
    gaps: rows.filter((r) => r.status === 'gap').length,
    unknowns: rows.filter((r) => r.status === 'unknown').length,
  }
}
