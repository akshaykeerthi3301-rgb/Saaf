import { CONFIDENCE_THRESHOLD, type CandidateProfile, type TypedRequirement } from '@/gates/types'
import { isRemoteLocation, isHybridLocation } from '@/gates/extract'
import { experienceFloor } from '@/gates/evaluate'

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
  key: 'title' | 'skills' | 'seniority' | 'location' | 'work_mode' | 'credential'
  label: string
  points: number
  max: number
  /** Shown to the candidate. Retrieved from the posting, never invented. */
  note: string
}

export type ScoreBreakdown = {
  total: number
  components: ScoreComponent[]
  /** Low when the posting stated an experience bar we could not read. */
  confidence: 'high' | 'low'
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
function seniorityFit(
  held: number,
  reqs: TypedRequirement[],
  unread: boolean
): ScoreComponent {
  const max = WEIGHTS.seniority
  const confident = reqs.filter((r) => r.confidence >= CONFIDENCE_THRESHOLD)
  // Shared with the gate rather than reimplemented — see experienceFloor().
  const { required } = experienceFloor(confident)

  if (required === 0) {
    return {
      key: 'seniority', label: 'Experience', max,
      points: Math.round(max * (unread ? 0.5 : 0.75)),
      note: unread
        ? "This posting mentions an experience bar we couldn't read reliably — check it yourself."
        : 'The posting states no experience floor.',
    }
  }

  const gap = required - held
  // Meeting the bar scores full. Falling short decays fast — a five-year gap
  // is a poor match, but it is still shown and still ranked.
  // Being far above scores slightly down: over-qualification is also a
  // mismatch, and it is what pushes senior roles off an early-career list.
  const ratio =
    gap <= 0 ? (held > required + 8 ? 0.75 : 1)
    : gap <= 1 ? 0.7
    : gap <= 2 ? 0.5
    : gap <= 4 ? 0.25
    : 0.05

  const note =
    gap <= 0 ? `Asks for ${required} years; you have ${held}.`
    : `Asks for ${required} years; you have ${held} — ${Math.round(gap * 10) / 10} short.`

  return { key: 'seniority', label: 'Experience', points: Math.round(max * ratio), max, note }
}

function locationFit(candidateCity: string | undefined, role: RoleFacts): ScoreComponent {
  const max = WEIGHTS.location
  const loc = `${role.locationRaw ?? ''} ${role.city ?? ''}`.trim()

  if (!loc) return { key: 'location', label: 'Location', points: Math.round(max * 0.5), max, note: 'Location not stated.' }
  if (isRemoteLocation(loc)) return { key: 'location', label: 'Location', points: max, max, note: 'Remote.' }
  if (candidateCity && loc.toLowerCase().includes(candidateCity.toLowerCase())) {
    return { key: 'location', label: 'Location', points: max, max, note: `In ${candidateCity}.` }
  }
  if (isHybridLocation(loc)) {
    return { key: 'location', label: 'Location', points: Math.round(max * 0.6), max, note: 'Hybrid, in another city.' }
  }
  return { key: 'location', label: 'Location', points: Math.round(max * 0.3), max, note: 'In another city.' }
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

  const components: ScoreComponent[] = [
    titleAffinity(candidate.preferredRole ?? '', role.title),
    skillsFit(candidate.skills ?? [], role),
    seniorityFit(candidate.yearsExperience, requirements, unread),
    locationFit(candidate.city, role),
    workModeFit(candidate.workModePreference, role),
    credentialFit(candidate.credential, requirements),
  ].filter((c): c is ScoreComponent => c !== null)

  // Normalised over the components that APPLY, not over a fixed 100. A
  // candidate with no skills on file would otherwise lose 20 points to a
  // component that never had a chance to score, and every one of their roles
  // would sit 20 below an identical candidate who had uploaded a résumé.
  const earned = components.reduce((sum, c) => sum + c.points, 0)
  const available = components.reduce((sum, c) => sum + c.max, 0)

  return {
    total: available === 0 ? 0 : Math.max(0, Math.min(100, Math.round((earned / available) * 100))),
    components,
    confidence: unread ? 'low' : 'high',
  }
}

/** The single line shown under the title. Retrieved from the components, never generated. */
export function summarise(breakdown: ScoreBreakdown): string {
  const weakest = [...breakdown.components]
    .filter((c) => c.max > 0)
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

export type Bucket = 'matches' | 'experience_out' | 'location_out' | 'worth_a_look'

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

  const seniority = ratioOf(breakdown, 'seniority')
  if (seniority !== null && seniority <= EXPERIENCE_OUT_AT) return 'experience_out'

  const location = ratioOf(breakdown, 'location')
  if (location !== null && location <= LOCATION_OUT_AT) return 'location_out'

  if (breakdown.confidence === 'low') return 'worth_a_look'

  return 'matches'
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
