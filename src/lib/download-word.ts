import { downloadOptimisedResume } from '@/app/actions/resume-download'

/**
 * Build the Word file on the server and hand it to the browser as a download. Shared by the tailor result and the
 * résumé editor so both save the same file the same way. `fileName` (without extension) overrides the server's name,
 * which is how a rename in the tailor result reaches the file.
 */
export async function downloadWordFile(
  input: Parameters<typeof downloadOptimisedResume>[0],
  fileName?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await downloadOptimisedResume(input).catch(() => ({ ok: false as const, error: 'Check your connection and try again.' }))
  if (!r.ok) return { ok: false, error: r.error }
  const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ? `${fileName}.docx` : r.filename
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true }
}
