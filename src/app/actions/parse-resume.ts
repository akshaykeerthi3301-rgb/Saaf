'use server'

import { z } from 'zod'
import { pdfToText } from '@/lib/parse/pdf'
import { docxToText } from '@/lib/parse/docx'
import { type ParseResult } from '@/lib/parse/extract'
import { resumeFacts } from '@/lib/parse/facts'
import { readResumeWithModel } from '@/lib/parse/llm'
import { MAX_RESUME_BYTES } from '@/lib/parse/constants'

const ACCEPTED = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
} as const

const schema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, 'That file is empty.')
    .refine((f) => f.size <= MAX_RESUME_BYTES, 'That file is over 5 MB.')
    .refine((f) => f.type in ACCEPTED, 'We can read PDF and .docx files.'),
})

export type ParseResumeResponse =
  | ({ ok: true } & ParseResult)
  | { ok: false; error: string }

/**
 * Parse a résumé and return the fields it yielded. PERSISTS NOTHING.
 *
 * The file is read into memory, parsed, and dropped in the same request. It is
 * never written to storage, never logged, and never sent to a third party. That
 * is the third guarantee — "your file is deleted once parsed" — enforced by the
 * shape of this function rather than by a retention policy.
 *
 * Every failure path routes the candidate to manual entry. A résumé that cannot
 * be read is never a dead end, and the message never implies their CV is at
 * fault — a scanned PDF with no text layer is our limitation, not theirs.
 */
export async function parseResume(formData: FormData): Promise<ParseResumeResponse> {
  const parsed = schema.safeParse({ file: formData.get('file') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'We could not read that file.' }
  }

  const { file } = parsed.data
  const kind = ACCEPTED[file.type as keyof typeof ACCEPTED]

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const text = kind === 'pdf' ? await pdfToText(buffer) : await docxToText(buffer)

    if (text.trim().length < 50) {
      // Almost always a scanned PDF with no text layer.
      return {
        ok: false,
        error:
          "We couldn't find any text in that file — it may be a scan rather than a text document. You can type your details in instead.",
      }
    }

    /**
     * ⚠️ `resumeFacts`, NOT `extractFields`, AND THAT IS THE WHOLE FIX HERE.
     * This screen used to read the résumé its own way and the ATS checker read
     * it another, so the founder's own document produced "Manager" at "icici
     * bank" on /resume and "Private Banking Manager (M1)" at "ICICI Bank
     * Bangalore" in the checker. Same file, same session, two answers.
     */
    const deterministic = resumeFacts(text)

    // Strictly additive. The model reaches skills and domain that fixed
    // patterns cannot; where both produce a field the model wins, because it
    // reads the whole document rather than the first 25 lines — and either way
    // the candidate confirms every field on the next screen before anything
    // is stored. A null here (no API key, timeout, bad JSON) leaves the
    // deterministic result exactly as it was.
    const model = await readResumeWithModel(text)
    if (!model) return { ok: true, ...deterministic }

    /**
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
    const fields = {
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

    return { ok: true, fields, warnings }
  } catch {
    return {
      ok: false,
      error: "We couldn't read that file. You can type your details in instead.",
    }
  }
}
