'use server'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { pdfToLayout, pdfToText, pdfProducer } from '@/lib/parse/pdf'
import { columnSample } from '@/lib/parse/layout'
import { docxToText } from '@/lib/parse/docx'
import { extractFields, type ParsedFields } from '@/lib/parse/extract'
import { parseSections, type ResumeSections } from '@/lib/parse/sections'
import type { LayoutFacts } from '@/lib/ats-check'
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
      /**
       * The PDF's geometry, when the upload was a PDF. Absent for .docx, which
       * has paragraphs but no page coordinates, and for pasted text.
       *
       * Carried to the client so the checker scores the same document the same
       * way in both places: `checkResume` re-runs in the browser after every
       * accepted fix, and without this it would silently lose the column count
       * mid-session and start disagreeing with the server about one file.
       */
      layout?: LayoutFacts
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
    let layout: LayoutFacts | undefined
    let text: string
    if (kind === 'pdf') {
      const doc = await pdfToLayout(buffer)
      text = doc.pages.map((pg) => pg.lines.map((l) => l.text).join('\n')).join('\n').trim()
      layout = {
        columns: Math.max(1, ...doc.pages.map((pg) => pg.columns)),
        alignedColumns: Math.max(0, ...doc.pages.map((pg) => pg.alignedColumns)),
        pages: doc.pages.length,
        sample: columnSample(doc),
      }
    } else {
      text = await docxToText(buffer)
    }

    if (text.trim().length < 50) {
      /**
       * A document with no text layer scores zero at every ATS in the market
       * and looks perfect to the person who wrote it — the single most useful
       * finding this tool can return.
       *
       * ⚠️ AND THE COMMONEST CAUSE IS NOT A SCANNER. Measured across public
       * sample résumés on 2026-09-12, the files that extracted nothing were
       * produced by "Microsoft: Print To PDF", which paints text as vector
       * shapes. Telling that candidate their file is "likely a scan" describes
       * a machine they never used, so they resend the same document. Naming
       * what they actually did makes the fix one sentence long.
       */
      const producer = kind === 'pdf' ? await pdfProducer(buffer) : undefined
      const printToPdf = /print to pdf|microsoft print/i.test(producer ?? '')
      return {
        ok: false,
        error: printToPdf
          ? 'There is no readable text in that file. It was made with "Microsoft Print to PDF", which draws ' +
            'the words as a picture rather than storing them as text — so it looks perfect to you and arrives ' +
            'completely blank at every applicant tracking system. Open the document in Word and use ' +
            'File → Save As → PDF instead of File → Print. That one change is usually the difference between ' +
            'being read and being discarded.'
          : 'We could not find any text in that file — it is likely a scan or an image rather than a text document. ' +
            'An applicant tracking system reads it exactly the same way, which means it reads nothing at all. ' +
            'Export it again from Word or Google Docs as a PDF, or paste the text below instead.',
      }
    }

    const { fields, warnings } = extractFields(text)
    return { ok: true, text, fields, sections: parseSections(text), layout, warnings }
  } catch {
    return {
      ok: false,
      error: 'We could not read that file. Try exporting it again as a PDF, or paste the text below instead.',
    }
  }
}
