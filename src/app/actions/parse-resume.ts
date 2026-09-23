'use server'

import { z } from 'zod'
import { pdfToText } from '@/lib/parse/pdf'
import { docxToText } from '@/lib/parse/docx'
import { type ParseResult, type ParsedFields } from '@/lib/parse/extract'
import { mergeModelRead, resumeFacts } from '@/lib/parse/facts'
import { suggestedRoleFor } from '@/lib/taxonomy/roles'
import { countMatchingRoles } from '@/lib/services/shortlist'
import { readResumeWithModel } from '@/lib/parse/llm'
import { MAX_RESUME_BYTES, TOO_LARGE_MESSAGE } from '@/lib/parse/constants'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const ACCEPTED = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
} as const

const schema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, 'That file is empty.')
    .refine((f) => f.size <= MAX_RESUME_BYTES, TOO_LARGE_MESSAGE)
    .refine((f) => f.type in ACCEPTED, 'We can read PDF and .docx files.'),
})

/**
 * Five model reads per ten minutes, per candidate — enough for onboarding and
 * two or three re-uploads of a corrected file.
 *
 * ⚠️ PAST IT THE MODEL IS SKIPPED, NOT THE UPLOAD. The model is strictly
 * additive here (see below): without it the deterministic reader still returns
 * title, employer, years and city, and the candidate confirms and edits every
 * field on the next screen. Refusing the upload would strand someone mid
 * onboarding to protect a budget that skipping one call protects just as well.
 * Keyed on the user — see TAILOR_ROLE_LIMIT in tailor.ts for why not the IP.
 */
const PARSE_MODEL_LIMIT = { scope: 'parse-resume-model', limit: 5, windowMs: 10 * 60_000 }

export type ParseResumeResponse =
  | ({ ok: true; suggestedRole?: string } & ParseResult)
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
  /**
   * ⚠️ SIGNED IN, CHECKED HERE — NOT ONLY BY THE PAGE. This was the one
   * unauthenticated action that does model work (docs/QA-AUDIT.md QA-08;
   * CLAUDE.md named it "the gap to close first"). src/proxy.ts gating
   * /start/:path* is UX, not security: an exported action is its own public
   * entry point, reachable without the page that renders it ever running.
   * Both callers — onboarding upload and the dev bench — are signed in.
   */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Your session has ended. Sign in again to upload your résumé.' }
  }

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
    // patterns cannot; where both produce a field the deterministic reader
    // wins (mergeModelRead in src/lib/parse/facts.ts says why), and either way
    // the candidate confirms every field on the next screen before anything
    // is stored. A null here (no API key, timeout, bad JSON) leaves the
    // deterministic result exactly as it was.
    let read: { fields: ParsedFields; warnings: string[] }
    if (!checkRateLimit(user.id, PARSE_MODEL_LIMIT).ok) {
      read = {
        fields: deterministic.fields,
        warnings: [
          ...deterministic.warnings,
          'We read this file without our model this time, so no skills were picked up — add yours on this screen.',
        ],
      }
    } else {
      const model = await readResumeWithModel(text)
      read = model ? mergeModelRead(deterministic, model) : deterministic
    }

    // Offered as the target role only if the index holds postings for it —
    // the same strict search the shortlist runs. See suggestedRoleFor().
    const title = read.fields.currentTitle?.trim()
    const suggestedRole = suggestedRoleFor(title, title ? await countMatchingRoles([title], false) : null)

    return { ok: true, ...read, suggestedRole }
  } catch {
    return {
      ok: false,
      error: "We couldn't read that file. You can type your details in instead.",
    }
  }
}
