/**
 * The measured skill vocabulary, and the only reader of `skills.json`.
 *
 * ⚠️ MOVED HERE FROM `interview-prep.ts`, UNCHANGED, BECAUSE THE DEPENDENCY WAS
 * BACKWARDS. `extractSkillPhrases()` is vocabulary, not interview prep — and
 * the résumé gap table (`lib/gap-table.ts`) now needs it too. Importing a
 * question generator from a résumé surface would have coupled two features that
 * share nothing but a wordlist, and the comment on the original said the point
 * plainly: "Same vocabulary, same guarantees, one definition." That is now
 * enforced by there being one file that opens the JSON.
 * `interview-prep.ts` re-exports `extractSkillPhrases`, so every existing
 * caller is untouched.
 *
 * Built by `scripts/build-skill-vocabulary.ts` against the live index and
 * committed as data — this module must stay pure, with no database and no
 * network, the same way `role-keywords.json` is.
 */
import SKILL_DATA from '@/lib/taxonomy/skills.json'

type SkillEntry = { boards: number; capRatio: number }
const TERMS = SKILL_DATA.terms as Record<string, SkillEntry>

/**
 * Prose and place fragments that survived the build, filtered at read time.
 *
 * ⚠️ FOUND BY MEASUREMENT ON 2026-09-15, NOT BY TASTE, and the measurement is
 * the reason this is a list rather than a threshold. TASK-083 put the
 * vocabulary on screen for the first time as "skills this posting names", and a
 * scan of 391 live descriptions ranked these inside the top hundred:
 * `familiarity` in 96 postings ("Familiarity with Kubernetes"), `science` 98
 * and `computer` 96 (the two halves of "Computer Science"), `certified` 25,
 * `states` 15 ("United States"), `san` 14 ("San Francisco" — a place fragment,
 * which is the exact shape of the Poland defect these filters exist to stop).
 *
 * ⚠️ capRatio IS NOT THE ANSWER AND THAT WAS CHECKED. Every junk term above
 * sits at 0.62–0.70 and a 0.8 cut looks clean until you read what it removes:
 * `.NET` (0.62), `pandas`, `agile`, `shell`, `server` — all real — while
 * keeping `street`, `hat`, `zoom` and `eastern`. The distribution does not
 * separate prose from skills, so a closed, measured list is the honest tool.
 *
 * ⚠️ THE REAL HOME IS `scripts/build-skill-vocabulary.ts`'s `NOT_SKILLS`, WHERE
 * THESE HAVE ALSO BEEN ADDED. This filter exists only because `skills.json` has
 * not been rebuilt since — a rebuild scans 13,919 descriptions and would move
 * every count in the docs, which is not TASK-083's to do. Delete this set the
 * day the vocabulary is rebuilt; until then removing it silently reintroduces
 * "Familiarity" as a skill a candidate is told they lack.
 */
const NOT_SKILLS = new Set([
  'familiarity', 'science', 'computer', 'certified', 'statement',
  'states', 'san', 'workplaces', 'generative', 'sr',
])

const SKILLS = new Set(Object.keys(TERMS).filter((t) => !NOT_SKILLS.has(t)))

/** Distinct employers whose postings this vocabulary was measured across. */
export const DESCRIPTIONS_SCANNED = SKILL_DATA.descriptionsScanned

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
export function extractSkillPhrases(text: string): string[] {
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
 * How many distinct employers in our index name this term.
 *
 * ⚠️ THIS IS THE NUMBER A TOOL WITHOUT AN INDEX CANNOT PRINT, and it is why a
 * missing term on the gap table can be ranked instead of merely listed. A
 * candidate told "you are missing Kafka" has no way to judge whether that is
 * worth a rewrite; told "named by 41 of the employers we index, against 515 for
 * AWS" they can. Undefined for a term outside the vocabulary — callers must
 * render the term without a figure rather than printing a zero, which would
 * read as a measurement of absence rather than an absence of measurement.
 */
export function skillDispersion(term: string): number | undefined {
  const k = term.toLowerCase()
  // Same gate as extraction: a term this module refuses to call a skill must
  // not come back carrying an authoritative-looking figure either.
  return SKILLS.has(k) ? TERMS[k]?.boards : undefined
}
