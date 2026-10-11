/**
 * The demographic questions a candidate can answer for themselves (F-602, TASK-171).
 *
 * Jobinko's rule is unchanged: it never answers these for anyone, and never infers
 * one. This is the lawful substitute — the candidate types their own words, once,
 * and the extension fills ONLY those questions with ONLY those words. "Prefer not
 * to say" is not a stored value; it is the absence of a key, so there is nothing
 * to leak and nothing to guess.
 *
 * Keys mirror `SELF_ID` in extension/autofill.js. Date of birth, age and
 * pregnancy are deliberately not here: no answer is ever filled for them.
 */
export type SelfIdKey = 'gender' | 'pronouns' | 'ethnicity' | 'disability' | 'veteran' | 'orientation' | 'lgbtq' | 'hispanic' | 'caste' | 'religion' | 'marital'

export type SelfIdField = {
  key: SelfIdKey
  label: string
  kind: 'text' | 'yesno'
  /** Suggestions only — the candidate may type anything. */
  suggestions?: string[]
  /** The choices shown as tap-to-pick chips. "Prefer not to say" is always the last chip and clears the answer. */
  options?: string[]
  hint?: string
}

export const SELF_ID_FIELDS: SelfIdField[] = [
  { key: 'gender', label: 'What is your gender?', kind: 'text', options: ['Male', 'Female', 'Non-Binary'] },
  { key: 'pronouns', label: 'What are your pronouns?', kind: 'text', options: ['He/Him', 'She/Her', 'They/Them', 'Other'] },
  { key: 'disability', label: 'Do you have a disability?', kind: 'yesno', hint: 'Answers “Do you have a disability?” with Yes or No.' },
  { key: 'veteran', label: 'Are you a veteran?', kind: 'yesno', hint: 'Mostly asked on US forms.' },
  {
    key: 'ethnicity', label: 'How would you identify your race?', kind: 'text',
    options: ['American Indian or Alaskan Native', 'Asian', 'Black or African American', 'Hispanic or Latino', 'White', 'Native Hawaiian or Other Pacific Islander', 'Two or More Races'],
    hint: 'Matched only when a form offers exactly these words.',
  },
  { key: 'hispanic', label: 'Are you Hispanic or Latino?', kind: 'yesno', hint: 'Mostly asked on US forms.' },
  { key: 'lgbtq', label: 'Do you identify as LGBTQ+?', kind: 'yesno' },
  { key: 'orientation', label: 'How would you describe your sexual orientation?', kind: 'text', options: ['Asexual', 'Bisexual', 'Gay', 'Heterosexual', 'Lesbian', 'Pansexual', 'Queer', 'I prefer to self-describe'] },
  { key: 'caste', label: 'Caste / category', kind: 'text', options: ['General', 'OBC', 'SC', 'ST', 'EWS'], hint: 'Asked on some Indian forms.' },
  { key: 'religion', label: 'Religion', kind: 'text' },
  { key: 'marital', label: 'Marital status', kind: 'text', options: ['Single', 'Married'] },
]

export type SelfIdAnswers = Partial<Record<SelfIdKey, string>>

const MAX_LEN = 60
const KEYS = new Set<string>(SELF_ID_FIELDS.map((f) => f.key))
const YESNO = new Set<string>(SELF_ID_FIELDS.filter((f) => f.kind === 'yesno').map((f) => f.key))

/**
 * Rebuild whatever was stored or submitted through the whitelist. An unknown key,
 * a non-string, a blank, or a yes/no question answered with anything but yes/no
 * is DROPPED — which means "prefer not to say", the safe direction.
 */
export function sanitizeSelfId(raw: unknown): SelfIdAnswers {
  const out: SelfIdAnswers = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEYS.has(k) || typeof v !== 'string') continue
    const t = v.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
    if (!t) continue
    if (YESNO.has(k)) {
      const yn = t.toLowerCase()
      if (yn !== 'yes' && yn !== 'no') continue
      out[k as SelfIdKey] = yn
    } else {
      out[k as SelfIdKey] = t
    }
  }
  return out
}
