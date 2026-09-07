import { CONFIDENCE_THRESHOLD, type CandidateProfile, type TypedRequirement } from '@/gates/types'
import { isRemoteLocation, isHybridLocation } from '@/gates/extract'
import { matchLocation } from '@/lib/taxonomy/locations'
import { domainOf, DOMAIN_LABEL } from '@/lib/taxonomy/roles'
import { experienceFloor, experienceCeiling } from '@/gates/evaluate'

/**
 * Per-candidate match scoring.
 *
 * Replaces the gate's verdict, and replaces a score that was genuinely broken:
 * `scoreFor()` computed 70 + (requirement count × 4) − gap, taking the profile
 * as `_p` and never reading it. Two different candidates got identical scores
 * on the same role, and the number really measured how wordy the posting was.
 *
 * Nothing here withholds. A role the candidate cannot get scores badly and
 * sinks; it is never hidden. Requirement extraction in src/gates/ still does
 * the reading — it now feeds the score instead of a refusal.
 *
 * Deliberately deterministic, and that is a budget decision as much as a
 * design one: an LLM call per role per candidate cannot fit a ₹2,000/month
 * ceiling. The model earns its place on résumé reading and the on-demand
 * copilot, not on scoring hundreds of thousands of rows.
 */

export type ScoreComponent = {
  /** 'cap' is not a scored component — it is the ceiling applied to the others,
   *  listed alongside them so the arithmetic on the card still adds up. */
  key: 'title' | 'skills' | 'seniority' | 'location' | 'work_mode' | 'credential' | 'cap'
  label: string
  points: number
  max: number
  /** Shown to the candidate. Retrieved from the posting, never invented. */
  note: string
}

/**
 * Where the candidate sits against the experience bar the posting states.
 *
 * A SEPARATE FIELD, not a number to be read back off the score, and the reason
 * is a real collision: seniorityFit awards 50% of the component both for "you
 * are two years short" and for "this posting mentions a bar we could not read."
 * Those are opposite statements — one is a fact about the candidate, the other
 * an admission about us — and any rule that inferred a bucket from the ratio
 * alone would have labelled the second one as the first.
 */
export type ExperienceStanding = 'meets' | 'short' | 'far_short' | 'over' | 'unstated' | 'unread'

/** Where the role sits against the city the candidate asked for. */
export type LocationStanding = 'exact' | 'cluster' | 'remote' | 'hybrid' | 'unstated' | 'elsewhere'

export type ScoreBreakdown = {
  total: number
  components: ScoreComponent[]
  /** Low when the posting stated an experience bar we could not read. */
  confidence: 'high' | 'low'
  /** Optional so breakdowns stored before these existed still parse.
   *  bucketFor() falls back to the old ratio rules when they are absent. */
  experience?: ExperienceStanding
  location?: LocationStanding
}

export type RoleFacts = {
  title: string
  /** Matched against the candidate's confirmed skills. */
  description?: string
  locationRaw?: string
  city?: string
  /** roles.unread_experience_mention — see migration 0011. */
  unreadExperienceMention?: boolean
}

const WEIGHTS = { title: 28, skills: 20, seniority: 25, location: 10, work_mode: 7, credential: 10 }

/**
 * Ceilings on the total, by how the candidate sits against the experience bar.
 *
 * WHY A CAP AND NOT A WEIGHT. The score is a weighted average, and an average
 * cannot express a disqualifier. Four components — title 28, location 10, work
 * mode 7, credential 10 — are at or near full marks for any in-city role that
 * requires no credential from a candidate with no work-mode preference. That is
 * 55 points before anything is known about whether the person can do the job,
 * which is how a role asking four years scored 76 for a two-year candidate:
 * everything else was perfect and the one decisive component was worth 25.
 *
 * Reweighting cannot fix that. Even at a seniority weight of 40, sixty points
 * still come from elsewhere. A ceiling can, and it is also how a person reads
 * a CV: below the stated bar caps how good the rest is allowed to make you look.
 *
 * Nothing is hidden. The role keeps its bucket, keeps its place in the list and
 * keeps every component of its working — see docs/PROJECT-STATE.md's locked
 * "ranks, does not gate".
 */
const CAPS: Partial<Record<ExperienceStanding, number>> = {
  short: 65,
  far_short: 50,
  over: 65,
  /**
   * ⚠️ 'unread' HAD NO CAP, AND THAT WAS THE HOLE. When a posting mentions an
   * experience bar the extractor could not read confidently, seniorityFit
   * awards half the component and moves on — so the other four components,
   * which are at or near full marks for any in-city role needing no credential,
   * carried the total to 85. A two-year candidate was shown a posting asking
   * for 7–10 years as a **Strong match**, with the words "we couldn't read this
   * reliably" sitting inside the same card.
   *
   * 74 is exact, not round: role-card.tsx calls 75 and above a "Strong match",
   * so this is the highest score that cannot claim confidence we do not have.
   * It sits ABOVE `short` (65) on purpose — "we could not read the bar" is a
   * weaker signal than "we read it and you are under it", and must not be
   * punished harder than a known shortfall.
   */
  unread: 74,
}

const CAP_REASON: Record<string, string> = {
  short: 'You are under the experience bar this posting states.',
  far_short: 'You are well under the experience bar this posting states.',
  over: 'You are past the top of the band this posting states.',
  unread: 'This posting states an experience bar we could not read reliably.',
}

/**
 * Crude suffix stripping — enough to match "engineering" to "engineer" and
 * "management" to "manager" without pulling in a real stemmer. Postgres does
 * the proper stemming at query time; this only has to rank what that query
 * already returned.
 *
 * Applied repeatedly, then a trailing "e" is dropped, because one pass does
 * not converge: "manager" → "manag" but "management" → "manage", and
 * "engineering" → "engineer" while "engineer" → "engine". Stripping until
 * stable makes both members of each pair land on the same token.
 */
const SUFFIX = /(?:ing|ment|ers|er|s)$/i

function stem(word: string): string {
  let w = word
  for (let i = 0; i < 4; i++) {
    const next = w.replace(SUFFIX, '')
    if (next === w || next.length < 3) break
    w = next
  }
  return w.length > 3 ? w.replace(/e$/i, '') : w
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9&+ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(stem)
}

/** How much of what the candidate asked for actually appears in the title. */
function titleAffinity(preferredRole: string, title: string): ScoreComponent {
  const want = [...new Set(tokens(preferredRole))]
  const have = new Set(tokens(title))
  const max = WEIGHTS.title

  if (want.length === 0) {
    return { key: 'title', label: 'Role match', points: max * 0.5, max, note: 'No preferred role set.' }
  }

  const hits = want.filter((w) => have.has(w))
  const coverage = hits.length / want.length
  const points = Math.round(max * coverage)

  const note =
    coverage === 1 ? 'Title matches every word of the role you asked for.'
    : coverage > 0 ? `Title matches ${hits.length} of ${want.length} words in the role you asked for.`
    : 'Title shares no words with the role you asked for.'

  return { key: 'title', label: 'Role match', points, max, note }
}

/**
 * Confirmed candidate skills found in the posting's own text.
 *
 * Matched candidate-side rather than by extracting a skill list per role: one
 * model call per résumé upload fits the free tier, one per role across the
 * index would not. The posting is searched for skills the candidate actually
 * confirmed, so a match is always evidence from both sides.
 */
function skillsFit(skills: string[], role: RoleFacts): ScoreComponent | null {
  const max = WEIGHTS.skills
  const text = (role.description ?? '').toLowerCase()
  // No skills on file, or no text to search: the component does not apply and
  // is left out of the total entirely rather than scored as a zero.
  if (skills.length === 0 || text.length < 50) return null

  const hits = skills.filter((s) => {
    const needle = s.toLowerCase().trim()
    return needle.length > 1 && text.includes(needle)
  })

  // Full marks well before every skill matches — no posting names them all,
  // and requiring that would make the component unreachable.
  const ratio = Math.min(1, hits.length / Math.min(5, skills.length))
  const note = hits.length
    ? `Mentions ${hits.length} of your skills: ${hits.slice(0, 4).join(', ')}${hits.length > 4 ? '…' : ''}.`
    : 'Names none of the skills on your profile.'

  return { key: 'skills', label: 'Skills', points: Math.round(max * ratio), max, note }
}

/**
 * The experience bar, scored rather than gated.
 *
 * Reuses the floor logic the gate settled on: the strictest confident stated
 * requirement wins, and a confidently framed statement suppresses the title
 * band because an explicit number beats one inferred from a job title.
 */
/** The relaxation. A candidate up to this many years under the stated bar is
 *  still shown as a good match — but in a bucket that says so, never mixed into
 *  the top of the list. Beyond it, the role is out of range. */
export const STRETCH_YEARS = 2

/**
 * A requirement that asks for years IN A FUNCTION the candidate has not worked in.
 *
 * "2 years of product management experience" and "2 years of experience" are
 * different requirements, and a candidate whose two years are in HR meets the
 * second and none of the first. Read against their CONFIRMED CURRENT TITLE —
 * their background — never against the role they are searching for, which is
 * the thing they are trying to move into.
 *
 * Silent unless BOTH sides resolve. A posting asking for "experience in a
 * fast-paced environment" names no function, a title we cannot place names no
 * function, and in either case the candidate keeps every year they have. A
 * wrong penalty here is far worse than a missed one: it would tell a career
 * changer they are unqualified on our guess rather than on the posting's words.
 */
function functionMismatch(
  confident: TypedRequirement[],
  currentTitle: string | undefined,
): { required: number; wants: string; mine: string } | null {
  const mine = domainOf(currentTitle)
  if (!mine) return null

  let worst: { required: number; wants: string } | null = null
  for (const r of confident) {
    if (r.kind !== 'experience_years' || r.minYears === undefined || !r.valueText) continue
    const wants = domainOf(r.valueText)
    if (!wants || wants === mine) continue
    if (!worst || r.minYears > worst.required) worst = { required: r.minYears, wants }
  }
  return worst ? { ...worst, mine } : null
}

function seniorityFit(
  held: number,
  reqs: TypedRequirement[],
  unread: boolean,
  currentTitle?: string,
): [ScoreComponent, ExperienceStanding] {
  const max = WEIGHTS.seniority
  const confident = reqs.filter((r) => r.confidence >= CONFIDENCE_THRESHOLD)
  // Shared with the gate rather than reimplemented — see experienceFloor().
  const { required } = experienceFloor(confident)
  const ceiling = experienceCeiling(confident)

  // Years the candidate can actually count toward this posting. Zero when the
  // posting asks for them in a function they have not worked in.
  const mismatch = functionMismatch(confident, currentTitle)
  if (mismatch) {
    const need = Math.max(required, mismatch.required)
    const ratio = need <= 1 ? 0.7 : need <= 2 ? 0.5 : need <= 4 ? 0.25 : 0.05
    return [{
      key: 'seniority', label: 'Experience', points: Math.round(max * ratio), max,
      note: `Asks for ${need} years of ${DOMAIN_LABEL[mismatch.wants] ?? mismatch.wants} experience; your ${held} years are in ${DOMAIN_LABEL[mismatch.mine] ?? mismatch.mine}.`,
    }, need <= STRETCH_YEARS ? 'short' : 'far_short']
  }
  const at = (ratio: number, note: string, standing: ExperienceStanding): [ScoreComponent, ExperienceStanding] =>
    [{ key: 'seniority', label: 'Experience', points: Math.round(max * ratio), max, note }, standing]

  // Nothing stated at either end.
  if (required === 0 && ceiling === undefined) {
    return at(
      unread ? 0.5 : 0.75,
      unread
        ? "This posting mentions an experience bar we couldn't read reliably — check it yourself."
        : 'The posting states no experience floor.',
      unread ? 'unread' : 'unstated',
    )
  }

  const gap = required - held

  if (gap > 0) {
    const ratio = gap <= 1 ? 0.7 : gap <= 2 ? 0.5 : gap <= 4 ? 0.25 : 0.05
    const band = ceiling && ceiling.years > required && !ceiling.fromTitle
      ? `${required}–${ceiling.years} years`
      : `${required} years`
    return at(
      ratio,
      `Asks for ${band}; you have ${held} — ${Math.round(gap * 10) / 10} short.`,
      gap <= STRETCH_YEARS ? 'short' : 'far_short',
    )
  }

  if (ceiling === undefined) {
    return at(1, `Asks for ${required} years; you have ${held}.`, 'meets')
  }

  const over = held > ceiling.years ? held - ceiling.years : 0

  // A STATED band gets the same ±STRETCH_YEARS tolerance as the floor. A band
  // read off the TITLE gets none, and the difference is not arbitrary: "1 - 5
  // years" is a number the employer wrote and two either side of it is
  // rounding, whereas "Intern" is a categorical statement about what kind of
  // engagement this is. Two years of full-time work is not an internship
  // rounded up, so the numeric tolerance does not apply to it.
  const tolerance = ceiling.fromTitle ? 0 : STRETCH_YEARS

  if (over <= tolerance) {
    const band = ceiling.fromTitle ? `${required} years` : `${required}–${ceiling.years} years`
    return at(1, `Asks for ${band}; you have ${held}.`, 'meets')
  }

  // Title-derived: the drop is sharp, because the mismatch is of kind rather
  // than of degree. A stated band decays gently — being past the top of one is
  // a question of fit, not of eligibility.
  const ratio = ceiling.fromTitle
    ? (over <= 1 ? 0.5 : over <= 3 ? 0.3 : 0.15)
    : over <= 5 ? 0.7 : over <= 10 ? 0.55 : 0.4

  const note = ceiling.fromTitle
    ? `This is ${ceiling.label ?? 'an entry-level role'}; you have ${held} years.`
    : `Asks for ${required}–${ceiling.years} years; you have ${held} — ${Math.round(over * 10) / 10} over.`

  return at(ratio, note, 'over')
}

/**
 * Location, through the city taxonomy rather than a raw substring test.
 *
 * The old form was `loc.toLowerCase().includes(candidateCity.toLowerCase())`,
 * which made a candidate's spelling decide their score. On the live index that
 * cost "Bengaluru" candidates 84 Bangalore-spelled roles, each scored 3/10
 * instead of 10/10 with the note "In another city" — wrong, and unarguable from
 * the candidate's side because the note never named the city it had found.
 *
 * Three tiers now, and each names the city it actually matched:
 *   exact   — same city, any spelling            full marks
 *   cluster — same daily-commute region          85%
 *   other   — somewhere else                     30%, unchanged
 *
 * The cluster tier is the one judgement call here. Delhi/Noida/Gurugram is one
 * labour market and Mumbai/Navi Mumbai/Thane is another; a role across that
 * line is genuinely relevant but is not the city the candidate asked for. It
 * scores below an exact match, and `/today` sorts every exact-city role above
 * every cluster one inside a bucket, so asking for Delhi puts Delhi at the top.
 * Drop `LOCATION_CLUSTER_RATIO` to 0.3 to switch the behaviour off.
 *
 * The note just names the city. It used to add ", inside Delhi NCR", which was
 * a label on a role that needed no special mention once ordering did the work.
 */
const LOCATION_CLUSTER_RATIO = 0.85

function locationFit(
  candidateCity: string | undefined,
  role: RoleFacts
): [ScoreComponent, LocationStanding] {
  const max = WEIGHTS.location
  const loc = `${role.locationRaw ?? ''} ${role.city ?? ''}`.trim()
  const label = 'Location'
  const at = (points: number, note: string, standing: LocationStanding): [ScoreComponent, LocationStanding] =>
    [{ key: 'location', label, points, max, note }, standing]

  if (!loc) return at(Math.round(max * 0.5), 'Location not stated.', 'unstated')
  if (isRemoteLocation(loc)) return at(max, 'Remote.', 'remote')

  const hit = matchLocation(candidateCity, loc)
  if (hit?.kind === 'exact') return at(max, `In ${hit.city}.`, 'exact')
  if (hit?.kind === 'cluster') {
    return at(
      Math.round(max * LOCATION_CLUSTER_RATIO),
      `In ${hit.city}.`,
      'cluster',
    )
  }
  if (isHybridLocation(loc)) return at(Math.round(max * 0.6), 'Hybrid, in another city.', 'hybrid')
  return at(Math.round(max * 0.3), 'In another city.', 'elsewhere')
}

function workModeFit(preference: string | undefined, role: RoleFacts): ScoreComponent {
  const max = WEIGHTS.work_mode
  const loc = `${role.locationRaw ?? ''} ${role.city ?? ''}`.trim()

  if (!preference || preference === 'no_preference') {
    return { key: 'work_mode', label: 'Work mode', points: max, max, note: 'No work-mode preference set.' }
  }
  const remote = isRemoteLocation(loc)
  const hybrid = isHybridLocation(loc)
  const matches =
    preference === 'remote' ? remote
    : preference === 'hybrid' ? hybrid
    : !remote && !hybrid

  return {
    key: 'work_mode', label: 'Work mode',
    points: matches ? max : 0, max,
    note: matches ? `Matches your ${preference} preference.` : `You asked for ${preference}.`,
  }
}

/**
 * A credential is binary and cannot be earned between now and applying — so it
 * carries the heaviest single penalty in the model. It still does not withhold.
 */
function credentialFit(held: string | undefined, reqs: TypedRequirement[]): ScoreComponent {
  const max = WEIGHTS.credential
  const required = reqs.filter(
    (r) => r.kind === 'credential' && r.credential && r.confidence >= CONFIDENCE_THRESHOLD
  )
  if (required.length === 0) {
    return { key: 'credential', label: 'Credential', points: max, max, note: 'No credential required.' }
  }
  const holds = held && held !== 'none' ? held : null
  const met = required.some((r) => r.credential === holds)
  const wanted = required.map((r) => r.credential).join(' or ')

  return {
    key: 'credential', label: 'Credential', points: met ? max : 0, max,
    note: met ? `Requires ${wanted}; you hold it.` : `Requires ${wanted}; your profile doesn't list it.`,
  }
}

export function scoreRole(
  candidate: CandidateProfile,
  role: RoleFacts,
  requirements: TypedRequirement[]
): ScoreBreakdown {
  const unread = role.unreadExperienceMention === true

  const [seniority, experience] = seniorityFit(candidate.yearsExperience, requirements, unread, candidate.currentTitle)
  const [place, location] = locationFit(candidate.city, role)

  const components: ScoreComponent[] = [
    titleAffinity(candidate.preferredRole ?? '', role.title),
    skillsFit(candidate.skills ?? [], role),
    seniority,
    place,
    workModeFit(candidate.workModePreference, role),
    credentialFit(candidate.credential, requirements),
  ].filter((c): c is ScoreComponent => c !== null)

  // Normalised over the components that APPLY, not over a fixed 100. A
  // candidate with no skills on file would otherwise lose 20 points to a
  // component that never had a chance to score, and every one of their roles
  // would sit 20 below an identical candidate who had uploaded a résumé.
  const earned = components.reduce((sum, c) => sum + c.points, 0)
  const available = components.reduce((sum, c) => sum + c.max, 0)
  const average = available === 0 ? 0 : Math.round((earned / available) * 100)

  // Scaled into the capped band, not clipped at it. `Math.min(average, cap)`
  // was the first attempt and it flattened the group: every role whose parts
  // averaged above the cap came out at exactly the cap, so a strong one and a
  // weak one became indistinguishable and the ordering inside the bucket went
  // to chance. Scaling is monotonic — nothing in the class can exceed the cap,
  // and everything in it keeps its place.
  const cap = CAPS[experience]
  const total = Math.max(0, Math.min(100,
    cap === undefined ? average : Math.round((average * cap) / 100)))

  // The cap earns its own line in the working. A number held down without
  // saying so is exactly the unexplained score this product was built to
  // replace — and the candidate can otherwise add the components up and get a
  // different answer from the one on the card.
  if (cap !== undefined) {
    components.push({
      key: 'cap',
      label: 'Capped',
      points: total,
      max: cap,
      // The clause has to differ for 'unread'. "A role you are outside the
      // stated band for" is a claim about the candidate, and for an unread bar
      // we have not made that finding — we could not read the bar at all.
      // Saying it anyway would be the product asserting something it does not
      // know, inside the very component that exists to be honest about limits.
      note: experience === 'unread'
        ? `${CAP_REASON[experience]} The rest of the fit averages ${average} out of 100 — but a bar we could not read is scored out of ${cap}, not out of 100, because we cannot tell you that you clear it.`
        : `${CAP_REASON[experience]} The rest of the fit averages ${average} out of 100 — but a role you are outside the stated band for is scored out of ${cap}, not out of 100.`,
    })
  }

  return {
    total,
    components,
    confidence: unread ? 'low' : 'high',
    experience,
    location,
  }
}

/** The single line shown under the title. Retrieved from the components, never generated. */
export function summarise(breakdown: ScoreBreakdown): string {
  const weakest = [...breakdown.components]
    // 'cap' is a ceiling on the others, not one of them. Ranking it alongside
    // them would let it become the reason line, which would explain the score
    // with its own consequence.
    .filter((c) => c.max > 0 && c.key !== 'cap')
    .sort((a, b) => a.points / a.max - b.points / b.max)[0]

  if (!weakest || weakest.points === weakest.max) {
    return 'Clears every requirement stated in this posting.'
  }
  return weakest.note
}

/* ---------------------------------------------------------------------------
 * Buckets
 *
 * The shortlist is not one ranked column. Roles are sorted into buckets so a
 * candidate can see, without opening anything, WHY a role is not a clean match:
 * the work fits but the years don't, or the work fits but the city doesn't.
 *
 * This settles a question the product has been wrong about twice. The original
 * design GATED — those roles were removed, and the candidate never learned the
 * near-miss existed. The Stage A pivot then flattened everything into one list,
 * which hid the difference between "this fits" and "this fits except the years"
 * inside a single number. Buckets keep every role visible and name the reason.
 *
 * DERIVED, NEVER STORED. The bucket is a pure function of a breakdown that is
 * already persisted in gate_results.score_breakdown, so there is no column to
 * migrate, no backfill, and — the real reason — no way for a stored bucket to
 * drift out of step with the scorer that produced it. Change a weight and every
 * bucket re-derives correctly on the next render.
 * ------------------------------------------------------------------------- */

export type Bucket =
  | 'matches'
  | 'experience_short'
  | 'experience_over'
  | 'experience_out'
  | 'location_out'
  | 'worth_a_look'

/** Thresholds are the scorer's own ratios, not new numbers.
 *  Seniority: 1 meets the bar · 0.7 within a year · 0.5 within two · 0.25 within
 *  four · 0.05 beyond. At or below 0.25 the posting asks for more than two years
 *  beyond what the candidate holds, which is the point it stops being a stretch.
 *  Location: 1 remote or in-city · 0.6 hybrid elsewhere · 0.5 unstated · 0.3 a
 *  different city outright. */
const EXPERIENCE_OUT_AT = 0.25
const LOCATION_OUT_AT = 0.3

const ratioOf = (b: ScoreBreakdown, key: ScoreComponent['key']): number | null => {
  const c = b.components.find((x) => x.key === key)
  return c && c.max > 0 ? c.points / c.max : null
}

/**
 * Which bucket a scored role belongs in.
 *
 * Order is precedence, and it is deliberate: a candidate short on years and in
 * the wrong city is told about the years first, because that is the harder of
 * the two to change. Low confidence is checked last because it only means we
 * could not read the bar — that is a weaker statement than a bar we read and
 * the candidate misses.
 */
export function bucketFor(breakdown: ScoreBreakdown | null | undefined): Bucket {
  if (!breakdown) return 'worth_a_look'

  // Stored breakdowns written before the standings existed. ingest/recompute.ts
  // re-scores every profile daily and saving a profile does it immediately, so
  // this path empties on its own; until it does, these rows keep exactly the
  // behaviour they were written under rather than being guessed at.
  if (!breakdown.experience || !breakdown.location) {
    const seniority = ratioOf(breakdown, 'seniority')
    if (seniority !== null && seniority <= EXPERIENCE_OUT_AT) return 'experience_out'
    const location = ratioOf(breakdown, 'location')
    if (location !== null && location <= LOCATION_OUT_AT) return 'location_out'
    return breakdown.confidence === 'low' ? 'worth_a_look' : 'matches'
  }

  if (breakdown.experience === 'far_short') return 'experience_out'
  if (breakdown.location === 'elsewhere') return 'location_out'

  // Checked AFTER location, and that ordering is the claim being protected.
  // This bucket says "good match"; saying it about a role in a city the
  // candidate never asked for would make the heading false.
  if (breakdown.experience === 'short') return 'experience_short'

  // Over the top of a stated band. It never becomes "out of range", and the
  // asymmetry is deliberate: under the floor an employer may simply reject
  // you, whereas over the ceiling the only question is whether you want the
  // role — that is the candidate's call, so we rank it down and say why.
  if (breakdown.experience === 'over') return 'experience_over'

  if (breakdown.confidence === 'low') return 'worth_a_look'

  return 'matches'
}

/**
 * Order inside a bucket: the city they asked for first, then the rest.
 *
 * Score alone did not do this. The cluster tier costs 1.5 points out of 100, so
 * a strong Noida role outranked a decent Delhi one and a candidate who typed
 * Delhi got Noida at the top of their list. Ranking by (this, then score) puts
 * every exact-city and remote role above every commute-cluster one, which is
 * what "top choices must be from Delhi" means.
 */
export function locationRank(breakdown: ScoreBreakdown | null | undefined): number {
  switch (breakdown?.location) {
    case 'exact':
    case 'remote':
      return 0
    case 'cluster':
      return 1
    default:
      // Includes rows stored before standings existed, which sort with the
      // group they were already being shown in rather than jumping to the top.
      return 2
  }
}

/** Display order and copy. Every line states what we know and what we don't —
 *  a bucket heading that hedges would defeat the point of having buckets. */
export const BUCKET_META: { key: Bucket; title: string; blurb: string }[] = [
  {
    key: 'matches',
    title: 'Matches you',
    blurb: 'The work, the experience and the location all line up.',
  },
  {
    key: 'experience_short',
    title: 'Good match, short on experience',
    blurb: `The work and the location line up, but the posting asks for more years than your profile holds — by up to ${STRETCH_YEARS}. Worth applying to on the strength of the rest, which is why these are here and not further down. They are not in "Matches you", because you do not meet the bar this posting states and we are not going to round that off.`,
  },
  {
    key: 'experience_over',
    title: 'Good match, more experience than asked for',
    blurb: `The work and the location line up, but the posting states a band topping out more than ${STRETCH_YEARS} years below your experience. Whether that matters is your call — these are usually still open to you, just pitched lower than where you are. Only postings that state an upper bound can appear here; "5+ years" has no ceiling to be over.`,
  },
  {
    key: 'experience_out',
    title: 'Experience is out of range',
    blurb: 'The work matches. The posting asks for more years than your profile holds — shown anyway, because that is your call and not ours.',
  },
  {
    key: 'location_out',
    title: 'Location is out of range',
    blurb: 'The work matches. The role is in a city you have not told us you work in, and it is not remote.',
  },
  {
    key: 'worth_a_look',
    title: 'Worth a look',
    blurb: 'The work matches, but the posting did not state enough for us to be sure about the rest. We would rather show you than guess.',
  },
]
