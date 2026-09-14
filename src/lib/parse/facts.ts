/**
 * The facts we read off a résumé — computed once, so two screens cannot
 * disagree about one document.
 *
 * ⚠️ THEY DID DISAGREE, IN PRODUCTION, ABOUT THE FOUNDER'S OWN RÉSUMÉ.
 * On 2026-09-14 the ATS checker read "Private Banking Manager (M1)" at "ICICI
 * Bank Bangalore" with 4 years, while /resume showed "Manager" at "icici bank"
 * with 2. Same file, same session, two numbers. On a product whose argument is
 * that its working can be checked, two surfaces contradicting each other about
 * the input is worse than either being wrong.
 *
 * The cause was three readers with no common path: `extractFields` (line-anchored
 * regex), `parseSections` (structure), and the model in `llm.ts` — each surface
 * picking its own precedence. Onboarding let the model override the regex;
 * the checker did not. This module fixes the precedence in ONE place.
 *
 * It is deliberately model-free. The model still runs in onboarding and still
 * contributes skills and domain, which no deterministic reader can reach — but
 * the facts a candidate is shown twice are read the same way both times.
 */
import { extractFields, isCity, type ParsedFields } from './extract'
import { parseSections, type ResumeSections } from './sections'

export type ResumeFacts = {
  fields: ParsedFields
  sections: ResumeSections
  warnings: string[]
}

/**
 * ⚠️ THE STRUCTURED READ WINS ONLY WHEN CORROBORATED, and the first attempt at
 * this got it wrong. `parseHeader` assigns positionally, so a role line reading
 * only "Paytm" comes back as {title: "Paytm", employer: null} — a confident
 * wrong answer, which is worse than no answer because the candidate's screen
 * shows a title either way. A structured read is trusted when the line produced
 * BOTH halves, meaning it genuinely carried a separator. Otherwise the regex
 * reader is the better witness, precisely because it returns nothing rather
 * than guessing.
 */
export function resumeFacts(text: string): ResumeFacts {
  const sections = parseSections(text)
  const { fields, warnings } = extractFields(text)

  const firstRole = sections.experience.find((e) => !e.isProject)
  const corroborated = Boolean(firstRole?.title && firstRole?.employer)

  const currentTitle = (corroborated ? firstRole!.title : fields.currentTitle) ?? undefined
  // The fallback reader has a positional blind spot too: a role line with no
  // job title, above a "dates | city" line, returns the city as the employer.
  const fallbackEmployer = isCity(fields.employer) ? undefined : fields.employer
  const employer = (corroborated ? firstRole!.employer : fallbackEmployer) ?? undefined

  return {
    sections,
    fields: { ...fields, currentTitle, employer },
    // A warning that names a field we have now filled reads as a broken
    // product. Dropped here rather than at each call site, for the same reason
    // the precedence lives here.
    warnings: warnings.filter(
      (w) => !(currentTitle && /current title/i.test(w)) && !(employer && /employer/i.test(w)),
    ),
  }
}
