'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildFullResumeDocx, fullResumeFilename } from '@/lib/resume-docx'
import { sectionsSchema } from '@/lib/resume-schema'
import { tailoredFilename } from '@/lib/resume-review'
import { styleSchema } from '@/lib/resume-style'

/**
 * The optimised résumé as a .docx. Sign-in required — this is the conversion
 * point of the whole ATS funnel.
 *
 * ⚠️ THE WALL IS AT THE FILE, NOT THE WORK, AND THAT IS THE PRODUCT DECISION.
 * The score is free, the findings are free, the rewrite is free, and every
 * rewritten line is readable on screen before anyone is asked for anything. A
 * candidate who reads three rewritten bullets about their own work has had the
 * question "is this any good?" answered honestly either way — which is the
 * opposite of the category norm, where the score is shown and the reasons are
 * locked. What signing in buys is the document, and the account it creates is
 * the thing that makes the rest of the product possible.
 *
 * ⚠️ THE CLIENT SUPPLIES THE SECTIONS, and that is safe here for the same
 * reason src/app/actions/tailor-docx.ts documents: this writes text into a Word
 * file and hands it back to the same person, with no badge, no storage and no
 * third party. They could type it themselves. What must never happen is this
 * path acquiring a claim of verification — if a "checked by Jobinko" mark is ever
 * printed in the document, the rewrite has to be regenerated server-side first,
 * because a client could otherwise push any claim through and out the other
 * side wearing our name.
 *
 * NOTHING IS STORED. Built in memory, returned, forgotten.
 */

const schema = z.object({
  sections: sectionsSchema,
  targetRole: z.string().trim().max(120).default(''),
  /** One of the three ATS-safe templates. An unknown id falls back rather than
   *  failing — a stale client is exactly how a bad value arrives here. */
  template: z.enum(['classic', 'compact', 'headline']).optional(),
  font: z.enum(['calibri', 'arial', 'georgia', 'times']).optional(),
  accent: z.enum(['ink', 'navy', 'teal', 'maroon']).optional(),
  /** The export drawer's full set of choices. When present it wins over template / font / accent. */
  style: styleSchema.optional(),
  /** Present for a résumé tailored to one posting: the file is then named for the person, the role AND the company. */
  company: z.string().trim().max(120).optional(),
})

export type ResumeDownloadResponse =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string; needsSignIn?: boolean }

export async function downloadOptimisedResume(
  input: z.input<typeof schema>,
): Promise<ResumeDownloadResponse> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'There is nothing to put in a file yet.' }

  // Re-authenticated here rather than trusted to the page: an exported function
  // is its own entry point, reachable without the page that renders it.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      needsSignIn: true,
      error: 'Sign in to download the file. Your rewritten résumé stays on this page while you do.',
    }
  }

  try {
    const { sections, targetRole, template, font, accent, style, company } = parsed.data
    const buffer = await buildFullResumeDocx({
      // `order` is typed as strings by the schema above because it is display
      // metadata the document never reads; casting it back keeps the builder's
      // type honest without validating an enum nothing depends on.
      sections: { ...sections, order: [] },
      targetRole,
      template,
      font,
      accent,
      style,
    })
    return {
      ok: true,
      filename: company
        ? tailoredFilename({ name: sections.contact.name, role: targetRole, company })
        : fullResumeFilename(sections.contact.name, targetRole),
      // Base64 because a Server Action's return value is JSON — the browser
      // turns this back into a Blob.
      base64: buffer.toString('base64'),
    }
  } catch {
    return { ok: false, error: 'We could not build the file just now. Try again in a moment.' }
  }
}
