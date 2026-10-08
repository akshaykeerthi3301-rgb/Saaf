import { readResumeFile } from '@/app/actions/read-resume-file'
import { makePrimaryResume, saveResumeToAccount } from '@/app/actions/resume-documents'
import type { SavedResume } from '@/lib/services/resume-documents'

/**
 * Read a résumé file and keep its TEXT in the signed-in person's account, as one step.
 *
 * It exists because "Customize your résumé" rewrites a saved résumé, and until 2026-10-09 the only way to get one
 * saved was the public ATS checker's "Keep" button — a person who uploaded at sign-up reached the tailor drawer with
 * nothing to tailor, was sent to the checker, and was never brought back. Both callers now use this: the first run
 * (so the résumé from sign-up is already there) and the drawer's own upload box (so there is never a trip away).
 *
 * Two existing server actions composed on the client — nothing new on the server. The file is still read once and
 * dropped; what is kept is the extracted text and its sections, the same thing "Keep" has always stored.
 */
export type KeepResult = { ok: true; saved: SavedResume } | { ok: false; error: string }

/** The file's own name, without the extension — the label the reference product also shows in its library. */
export const labelFromFile = (name: string) => name.replace(/\.(pdf|docx)$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 120) || 'My résumé'

export async function keepResumeFromFile(file: File, opts: { makePrimary?: boolean } = {}): Promise<KeepResult> {
  const fd = new FormData()
  fd.set('file', file)
  const read = await readResumeFile(fd)
  if (!read.ok) return { ok: false, error: read.error }

  const saved = await saveResumeToAccount({ sections: read.sections, label: labelFromFile(file.name) })
  if (!saved.ok) return { ok: false, error: saved.error }

  if (opts.makePrimary) await makePrimaryResume({ id: saved.saved.id }).catch(() => null)
  return { ok: true, saved: saved.saved }
}
