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
 */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024 // 5 MB
