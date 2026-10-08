'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocx, docxFilename } from '@/lib/resume-docx'

/**
 * Turn a tailored draft into a .docx the candidate can download. Sign-in
 * required — this is the conversion point of the whole hook.
 *
 * ⚠️ A SERVER ACTION RATHER THAN A ROUTE HANDLER, DELIBERATELY. CLAUDE.md's
 * architecture invariant reserves src/app/api/ for requests that arrive WITHOUT
 * a session — cron, the public audit read, and the dev tool. A signed-in file
 * download is none of those, and adding it there would turn a rule with three
 * named exceptions into a rule with four and no principle. The action returns
 * bytes and the browser assembles the file, so there is no new public URL to
 * guard.
 *
 * ⚠️ THE CLIENT SUPPLIES THE DRAFT, AND THAT IS SAFE HERE FOR A SPECIFIC REASON.
 * Everywhere else in this codebase the browser sends an id and the server reads
 * the content — src/app/actions/tailor.ts says so explicitly, because a client
 * that could supply the "profile" could push any claim through the grounding
 * filter and out the other side wearing a verified badge. Nothing like that is
 * possible here: this writes the text into a Word file and hands it straight
 * back to the same person, with no badge, no storage and no third party. They
 * could type the same words into Word themselves. What must never happen is
 * this path acquiring a claim of verification — if a "checked by Jobinko" mark is
 * ever added to the document, the draft has to be regenerated server-side first.
 *
 * NOTHING IS STORED. The file is built in memory and returned. /resume is built
 * around the promise that we do not keep documents, and a tailored draft is a
 * document.
 */

const schema = z.object({
  bullets: z.array(z.string().max(600)).min(1).max(10),
  coverNote: z.string().max(4000).default(''),
  roleTitle: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).optional(),
})

export type TailorDocxResponse =
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string; needsSignIn?: boolean }

export async function downloadTailoredDocx(
  input: z.input<typeof schema>,
): Promise<TailorDocxResponse> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'There is nothing to put in a file yet.' }

  // Re-authenticated here rather than trusted to the page: an exported function
  // is its own entry point, reachable without the page that renders it.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      needsSignIn: true,
      error: 'Sign in to download the file. Your draft stays on this page while you do.',
    }
  }

  const { bullets, coverNote, roleTitle, company } = parsed.data

  try {
    const buffer = await buildResumeDocx({
      // provider and matched are display-only and never reach the document.
      draft: { bullets, coverNote, matched: [], provider: 'groq', dropped: [] },
      roleTitle,
      company,
    })
    return {
      ok: true,
      filename: docxFilename(roleTitle, company),
      // Base64 because a Server Action's return value is JSON — the browser
      // turns this back into a Blob. A ~10 KB document costs little to encode.
      base64: buffer.toString('base64'),
    }
  } catch {
    return { ok: false, error: 'We could not build that file. The text above is still yours to copy.' }
  }
}
