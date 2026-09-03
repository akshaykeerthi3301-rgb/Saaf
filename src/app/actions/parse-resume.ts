'use server'

import { z } from 'zod'
import { pdfToText } from '@/lib/parse/pdf'
import { docxToText } from '@/lib/parse/docx'
import { extractFields, type ParseResult } from '@/lib/parse/extract'
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

    return { ok: true, ...extractFields(text) }
  } catch {
    return {
      ok: false,
      error: "We couldn't read that file. You can type your details in instead.",
    }
  }
}
