import type { ResumeSections } from '@/lib/parse/sections'

/**
 * One finding, one fix the candidate can accept, edit or skip.
 *
 * ⚠️ THIS REPLACES AN ALL-OR-NOTHING REWRITE, WHICH IS THE LARGEST GAP AGAINST
 * THE CATEGORY LEADER. Their checker turns every finding into an inline
 * suggestion with one click to apply and one to undo; ours produced a whole new
 * document that the candidate could take or leave. A rewrite you cannot argue
 * with is a rewrite most people will not use — it asks them to trust six
 * changes at once about the most personal document they own.
 *
 * ⚠️ MOST FIXES HERE NEED NO MODEL AT ALL, AND THAT IS A REAL ADVANTAGE RATHER
 * THAN A COST SAVING. "Responsible for the settlement service" → "Owned the
 * settlement service" is a substitution, not a judgement: it is instant, free,
 * identical every time, and it cannot hallucinate. The competitor markets this
 * exact class of change as "AI rewrite suggestions". Ours is a table, so the
 * candidate can see why it happened and we can promise it will never invent.
 *
 * ⚠️ THREE FIXES ARE DELIBERATELY NOT FIXES. A missing figure, a missing link
 * and a résumé that is too short cannot be repaired without inventing
 * something, so they are returned as ASKS — a question with a field, answered
 * by the candidate. Generating a plausible number here is precisely the
 * fabrication the whole product argues against, and it is what "AI rewrite
 * suggestions for quantifying impact" quietly does elsewhere.
 */

export type FixEdit = {
  /** Which experience entry, and which bullet inside it. */
  entry: number
  bullet: number
  before: string
  after: string
}

export type Fix =
  | {
      kind: 'edit'
      findingId: string
      /** One line per changed bullet, so each can be accepted on its own. */
      edits: FixEdit[]
      /** What changed, in the candidate's terms. */
      note: string
    }
  | {
      kind: 'ask'
      findingId: string
      /** The question, and what we will do with the answer. */
      question: string
      placeholder: string
      note: string
    }
  | {
      kind: 'layout'
      findingId: string
      /** Applied by rebuilding the document; nothing for the user to review. */
      note: string
    }

/**
 * Openers that describe a duty, and the strongest honest replacement.
 *
 * ⚠️ EVERY SUBSTITUTION IS A SYNONYM OR A DE-ESCALATION, NEVER A PROMOTION.
 * "Involved in" becomes "Contributed to", not "Led" — the candidate may well
 * have led it, but their own sentence does not say so, and a résumé that claims
 * more than the person can defend in the room is worse than a weak verb. The
 * one direction this table is allowed to move is toward precision.
 */
const OPENERS: [RegExp, string][] = [
  [/^responsible for\s+/i, 'Owned '],
  [/^duties included\s+/i, 'Handled '],
  [/^tasked with\s+/i, 'Handled '],
  [/^involved in\s+/i, 'Contributed to '],
  [/^part of\s+/i, 'Contributed to '],
  [/^assisted (?:with|in)\s+/i, 'Supported '],
  [/^helped (?:with|to)\s+/i, 'Supported '],
  [/^helped\s+/i, 'Supported '],
  [/^handled\s+/i, 'Handled '],
  [/^worked on\s+/i, 'Contributed to '],
]

/**
 * Gerund → past tense, as an explicit table.
 *
 * ⚠️ NOT AN ALGORITHM, ON PURPOSE. Stripping "ing" and adding "ed" produces
 * "builded" and "leaded" on the two commonest verbs on an engineering résumé.
 * A short table that is right beats a rule that is usually right, on a document
 * the candidate is about to send to an employer.
 */
const GERUND_PAST: Record<string, string> = {
  migrating: 'Migrated', building: 'Built', developing: 'Developed', managing: 'Managed',
  implementing: 'Implemented', designing: 'Designed', maintaining: 'Maintained',
  creating: 'Created', testing: 'Tested', writing: 'Wrote', running: 'Ran', leading: 'Led',
  automating: 'Automated', optimising: 'Optimised', optimizing: 'Optimized',
  scaling: 'Scaled', launching: 'Launched', delivering: 'Delivered', owning: 'Owned',
  coordinating: 'Coordinated', supporting: 'Supported', analysing: 'Analysed',
  analyzing: 'Analyzed', reviewing: 'Reviewed', training: 'Trained', reducing: 'Reduced',
  improving: 'Improved', rewriting: 'Rewrote', refactoring: 'Refactored', deploying: 'Deployed',
}

/**
 * Rewrite one duty-shaped opener into an action.
 *
 * Prefers the candidate's OWN verb when the sentence carries one — "Worked on
 * migrating the ledger" becomes "Migrated the ledger", which introduces no word
 * that was not already theirs. Only when there is no gerund does it fall back
 * to the substitution table.
 */
export function strengthenOpener(line: string): string | null {
  const trimmed = line.trim()
  for (const [pattern, replacement] of OPENERS) {
    const m = trimmed.match(pattern)
    if (!m) continue
    const rest = trimmed.slice(m[0].length)

    // Their own verb, promoted out of the gerund.
    const firstWord = rest.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
    const past = GERUND_PAST[firstWord]
    if (past) {
      const tail = rest.slice(rest.toLowerCase().indexOf(firstWord) + firstWord.length).trim()
      return `${past} ${tail}`.replace(/\s+/g, ' ').trim()
    }

    const next = replacement + rest
    return next.charAt(0).toUpperCase() + next.slice(1)
  }
  return null
}

/**
 * Split a line that has outgrown a bullet, at a sentence boundary.
 *
 * Returns null rather than guessing when there is no boundary to split on: two
 * halves of one sentence read worse than one long sentence, and a parser
 * truncating a long line is a smaller problem than a résumé that reads as if it
 * were cut with scissors.
 */
export function splitLongBullet(line: string, limit = 300): string[] | null {
  const trimmed = line.trim()
  if (trimmed.length <= limit) return null
  const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g)
  if (!sentences || sentences.length < 2) return null

  const out: string[] = []
  let buffer = ''
  for (const s of sentences) {
    if ((buffer + s).trim().length > limit && buffer) {
      out.push(buffer.trim())
      buffer = s
    } else {
      buffer += s
    }
  }
  if (buffer.trim()) out.push(buffer.trim())
  return out.length > 1 ? out : null
}

/** Every date in one shape. "03/2021" and "Mar 2021" in one document make a
 *  parser choose, and whichever it chooses decides your seniority. */
export function normaliseDates(value: string): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return value.replace(/\b(0?[1-9]|1[0-2])[/-]((?:19|20)\d{2})\b/g, (_, m, y) => `${MONTHS[Number(m) - 1]} ${y}`)
}

/**
 * The fix for one finding, or null when that finding has no mechanical answer.
 *
 * `sections` is read, never mutated — applying a fix is the caller's decision
 * and the caller's state.
 */
export function fixFor(findingId: string, sections: ResumeSections): Fix | null {
  switch (findingId) {
    case 'weak-openers': {
      const edits: FixEdit[] = []
      sections.experience.forEach((e, i) =>
        e.bullets.forEach((b, j) => {
          const after = strengthenOpener(b)
          if (after) edits.push({ entry: i, bullet: j, before: b, after })
        }),
      )
      return edits.length
        ? {
            kind: 'edit',
            findingId,
            edits,
            note: 'Each line now opens with what you did. Only the opening words change — every fact, figure and name is the one you wrote.',
          }
        : null
    }

    case 'bullet-too-long': {
      const edits: FixEdit[] = []
      sections.experience.forEach((e, i) =>
        e.bullets.forEach((b, j) => {
          const parts = splitLongBullet(b)
          if (parts) edits.push({ entry: i, bullet: j, before: b, after: parts.join('\n') })
        }),
      )
      return edits.length
        ? { kind: 'edit', findingId, edits, note: 'Split at the sentence boundary. No words added or removed.' }
        : null
    }

    case 'date-format-mixed':
      return {
        kind: 'layout',
        findingId,
        note: 'Every date rewritten as "Mar 2021" — the form more systems read correctly than the numeric one.',
      }

    case 'section-order':
    case 'separator-header':
    case 'title-misread':
    case 'title-unreadable':
    case 'employer-unreadable':
    case 'missing-sections':
    case 'single-blob':
    case 'multi-column':
      return {
        kind: 'layout',
        findingId,
        note: 'Fixed by rebuilding the document: one column, standard headings, each role written as "Title at Employer" with its dates on the line below.',
      }

    /**
     * The three that are asks rather than fixes. Each names exactly what we
     * would have had to invent, which is the honest version of a feature
     * competitors ship as a generated suggestion.
     */
    case 'no-quantified-impact':
      return {
        kind: 'ask',
        findingId,
        question: 'What is the number behind your strongest line? A count, a percentage, an amount, a duration — whatever you can defend in the interview.',
        placeholder: 'e.g. 60,000 merchants · 14% · 3 days to 8 hours',
        note: 'We will not invent one. A figure you cannot defend costs more in the room than the ranking it buys on the way in.',
      }

    case 'no-links':
      return {
        kind: 'ask',
        findingId,
        question: 'Your LinkedIn or portfolio URL, as text.',
        placeholder: 'linkedin.com/in/yourname',
        note: 'Written into the contact line as plain text, because a linked icon extracts as nothing at all.',
      }

    case 'resume-length':
      return {
        kind: 'ask',
        findingId,
        question: 'Add one line to your most recent role — what you actually did, not an adjective.',
        placeholder: 'e.g. Rebuilt the merchant review queue with the operations team',
        note: 'We could pad this for you. Padding is what the parser is measuring, so it would raise the score and lower your chances.',
      }

    default:
      return null
  }
}

/** Apply one accepted edit. Returns a new object; the input is untouched. */
export function applyEdit(sections: ResumeSections, edit: FixEdit): ResumeSections {
  const experience = sections.experience.map((e, i) => {
    if (i !== edit.entry) return e
    const bullets = e.bullets.flatMap((b, j) => (j === edit.bullet ? edit.after.split('\n') : [b]))
    return { ...e, bullets }
  })
  return { ...sections, experience }
}

/** Normalise every date in the document. Used by the `date-format-mixed` fix. */
export function applyDateNormalisation(sections: ResumeSections): ResumeSections {
  return {
    ...sections,
    experience: sections.experience.map((e) => ({
      ...e,
      dates: e.dates ? normaliseDates(e.dates) : e.dates,
      bullets: e.bullets.map(normaliseDates),
    })),
    education: sections.education.map((e) => ({
      ...e,
      dates: e.dates ? normaliseDates(e.dates) : e.dates,
    })),
  }
}
