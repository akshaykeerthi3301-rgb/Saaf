'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { pdfToText } from '@/lib/parse/pdf'
import { docxToText } from '@/lib/parse/docx'
import { extractFields, type ParsedFields } from '@/lib/parse/extract'
import { parseSections, type ResumeSections } from '@/lib/parse/sections'
import { MAX_RESUME_BYTES } from '@/lib/parse/constants'

/**
 * Read an uploaded PDF or .docx for the PUBLIC ATS checker. Persists nothing.
 *
 * ⚠️ WHY THIS IS NOT src/app/actions/parse-resume.ts, WHICH ALREADY EXISTS.
 * Three differences, each of which would be a defect if it were forced onto the
 * onboarding action instead:
 *
 *  1. **It returns the résumé's TEXT.** parse-resume returns six confirmed
 *     fields and deliberately keeps the document to itself — onboarding never
 *     needs the text, and handing it back would widen that surface for nothing.
 *     Every downstream step here (the check, the rewrite, the projected score)
 *     runs on the text, so withholding it would mean parsing the same file
 *     twice.
 *  2. **It calls NO MODEL.** parse-resume layers readResumeWithModel() on top
 *     of the regexes. That is right for onboarding, where the candidate then
 *     confirms every field on screen. It is wrong here: this page's promise is
 *     that the CHECK is rules and not a model, and an LLM call on the upload
 *     path would make that promise false at the exact moment a stranger is
 *     deciding whether to believe us. The model appears later, once, when the
 *     candidate asks for a rewrite — and is labelled where it does.
 *  3. **It is rate limited.** parse-resume sits behind src/proxy.ts's
 *     /start/:path* matcher, which is UX rather than security but does keep it
 *     off the open internet. This one is reachable by anyone, so it carries its
 *     own brake. docs/ARCHITECTURE-AUDIT.md names résumé parsing as the cost
 *     surface to bound first; this is that bound, for the surface that needed
 *     it.
 *
 * NOTHING IS STORED. The bytes are read into memory, parsed, and dropped when
 * the request ends — never written to storage, never logged, never sent to a
 * third party. That is the same guarantee the upload screen makes, kept by the
 * shape of the function rather than by a retention policy.
 */

const ACCEPTED = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
} as const

const schema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, 'That file is empty.')
    .refine((f) => f.size <= MAX_RESUME_BYTES, 'That file is over 5 MB.')
    .refine((f) => f.type in ACCEPTED, 'We can read PDF and Word (.docx) files.'),
})

export type ReadResumeFileResponse =
  | {
      ok: true
      /** The extracted text, exactly as a parser sees it. */
      text: string
      /** Deterministic fields only — no model has touched these. */
      fields: ParsedFields
      sections: ResumeSections
      warnings: string[]
    }
  | { ok: false; error: string }

/**
 * Twenty files per ten minutes.
 *
 * Between the checker's 30 text checks and the tailor's 5. Parsing a PDF is
 * real CPU on a serverless instance but costs no money, and the honest loop on
 * this page is upload → fix → upload again, which a tight limit would punish.
 */
const UPLOAD_LIMIT = { limit: 20, windowMs: 10 * 60_000 }

/** Hashed immediately; nothing outliving this function holds an address. */
async function callerKey(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || h.get('x-real-ip')?.trim() || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

export async function readResumeFile(formData: FormData): Promise<ReadResumeFileResponse> {
  const limit = checkRateLimit(await callerKey(), UPLOAD_LIMIT)
  if (!limit.ok) {
    const mins = Math.ceil(limit.retryAfterSeconds / 60)
    return {
      ok: false,
      error:
        `You have uploaded several files in a short while. Try again in ` +
        `${mins === 1 ? 'a minute' : `${mins} minutes`} — nothing you sent was stored.`,
    }
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
      /**
       * Almost always a scan with no text layer — and worth saying plainly,
       * because it is the single most useful finding this tool can return. A
       * document with no text layer scores zero at every ATS in the market and
       * looks perfect to the person who wrote it.
       */
      return {
        ok: false,
        error:
          'We could not find any text in that file — it is likely a scan or an image rather than a text document. ' +
          'An applicant tracking system reads it exactly the same way, which means it reads nothing at all. ' +
          'Export it again from Word or Google Docs as a PDF, or paste the text below instead.',
      }
    }

    const { fields, warnings } = extractFields(text)
    return { ok: true, text, fields, sections: parseSections(text), warnings }
  } catch {
    return {
      ok: false,
      error: 'We could not read that file. Try exporting it again as a PDF, or paste the text below instead.',
    }
  }
}
