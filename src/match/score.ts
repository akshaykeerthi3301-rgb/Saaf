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
  key: 'title' | 'seniority' | 'location' | 'work_mode' | 'credential'
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
  locationRaw?: string
  city?: string
  /** roles.unread_experience_mention — see migration 0011. */
  unreadExperienceMention?: boolean
}

const WEIGHTS = { title: 35, seniority: 30, location: 15, work_mode: 10, credential: 10 }

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
    seniorityFit(candidate.yearsExperience, requirements, unread),
    locationFit(candidate.city, role),
    workModeFit(candidate.workModePreference, role),
    credentialFit(candidate.credential, requirements),
  ]

  const total = components.reduce((sum, c) => sum + c.points, 0)

  return {
    total: Math.max(0, Math.min(100, Math.round(total))),
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
