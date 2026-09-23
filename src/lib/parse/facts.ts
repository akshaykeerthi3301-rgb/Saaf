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

/**
 * The model's read folded into the deterministic one — the precedence
 * parseResume() applies, extracted 2026-09-23 so `npm run bench:parse`
 * measures the same code the onboarding upload runs rather than a copy.
 *
 * ⚠️ THE MODEL NO LONGER OVERRIDES A FACT THE DETERMINISTIC READER FOUND.
 * It used to win on every field, which is how /resume came to show 2 years
 * where the checker showed 4 — the model's number replacing arithmetic done
 * from the candidate's own dates. It still FILLS fields nothing else
 * reached, and it is still the only reader that gets skills and domain at
 * all, which is why it runs.
 *
 * The narrowing matters beyond consistency: `llm.ts` records a live
 * incident where the model returned "Systems Engineer at Infosys Jun 2024 -
 * Present" as a job title, and it reached `preferred_role` and emptied a
 * candidate's shortlist. A deterministic answer that exists is the better
 * answer; the model's value is what it finds when there is nothing there.
 */
export function mergeModelRead(
  deterministic: ResumeFacts,
  model: Pick<ParsedFields, 'currentTitle' | 'employer' | 'city' | 'yearsExperience' | 'skills' | 'domain'>,
): { fields: ParsedFields; warnings: string[] } {
  const fields: ParsedFields = {
    ...deterministic.fields,
    currentTitle: deterministic.fields.currentTitle ?? model.currentTitle,
    employer: deterministic.fields.employer ?? model.employer,
    yearsExperience: deterministic.fields.yearsExperience ?? model.yearsExperience,
    city: deterministic.fields.city ?? model.city,
    skills: model.skills,
    domain: model.domain,
  }

  // Warnings describe what still needs checking, so drop the ones the model
  // has now answered — telling someone we could not find a city while
  // showing them their city reads as a broken product.
  const warnings = deterministic.warnings.filter((w: string) =>
    !(fields.city && /city/i.test(w)) &&
    !(fields.currentTitle && /current title/i.test(w)) &&
    !(fields.employer && /employer/i.test(w)) &&
    !(fields.yearsExperience !== undefined && /years of experience/i.test(w))
  )

  return { fields, warnings }
}
