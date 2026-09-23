/**
 * Shared between the client (upload/page.tsx's pre-flight check) and the
 * server action (parse-resume.ts's zod validation) — deliberately its own
 * plain module, not exported from parse-resume.ts itself.
 *
 * A "use server" file may only export async functions; a plain constant
 * export is rejected outright once Next actually enforces it (it did the
 * moment next.config.ts configured serverActions, having silently tolerated
 * this before — "A 'use server' file can only export async functions,
 * found number"), breaking every upload, not just the large ones.
 *
 * ⚠️ 4 MB, NOT 5, AND THE HOST DECIDES IT. A Vercel function rejects any
 * request body over 4.5 MB with `413 FUNCTION_PAYLOAD_TOO_LARGE` before our
 * code runs, so no zod message here can ever be shown for a file between 4.5
 * and 5 MB. Until 2026-09-23 this read 5 MB and such a file crashed the live
 * ATS checker to a blank error page (docs/QA-AUDIT.md QA-01). 4 MB leaves the
 * multipart envelope room under the platform cap.
 */
export const MAX_RESUME_MB = 4
export const MAX_RESUME_BYTES = MAX_RESUME_MB * 1024 * 1024

/** The one sentence for an oversized file, everywhere it can be caught. */
export const TOO_LARGE_MESSAGE = `That file is over ${MAX_RESUME_MB} MB.`
